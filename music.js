import * as log from './log-helper.js'
import {sendError, sendErrorTryAgainLater, sendPlaylist, sendTrackMessage} from './responses.js'
import play from 'play-dl'

import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnectionStatus
} from '@discordjs/voice'
import {getFirstYTSearchResult, handleYTPlaylist, handleYTTrack} from './youtube.js'
import {handleSOPlaylist, handleSOTrack} from './soundcloud.js'
import {handleSPPlaylist, handleSPTrack} from './spotify.js'


// Holds the guilds playlists (index is guild id)
export const queues = []
// Holds the guilds player (index is guild id)
// * must be used only for reading, and operations like pausing/playing.
export const guildAudioPlayer = []
// An array of flags (index is guild id)
// * structure: { loop: boolean }
export const flags = []

function makeAudioPlayer(message, connection, id) {
    const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        })
    connection.subscribe(player)
        player.on('error', e => {
        log.error(e, message)
    })
    // when the player stops streaming
    player.on(AudioPlayerStatus.Idle, async () => {
        log.debug('Status changed to Idle', message)
        if (flags[id]?.loop)
            await playAudio(message)
        else
            await skip(message, null)
    })

    guildAudioPlayer[id] = player

    return player
}

export async function join(message) {
    const voiceChannel = message.member.voice.channel
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
    })

    connection.on(VoiceConnectionStatus.Ready, async () => {
        log.info('Connected', message)
    })

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
        log.debug('Status changed to Disconnected', message)
        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ])
            // Seems to be reconnecting to a new voiceChannel - ignore disconnect
        } catch (error) {
            // Seems to be a real disconnect which SHOULDN'T be recovered from
            connection.destroy()
        }
    })

    connection.on(VoiceConnectionStatus.Destroyed, async () => {
        log.info('Disconnected', message)
        guildAudioPlayer[message.guild.id] = null
        queues[message.guild.id] = null
    })

    // Espera ter terminado de conectar antes de sair do método. 
    await entersState(connection, VoiceConnectionStatus.Ready, 5_000)
    return connection
}

export async function leave(message) {
    if(!isBotInVoiceChannel(message.guild.id)) return
    log.debug('Leaving', message)
    await stop(message)
    const connection = getVoiceConnection(message.guild.id)
    if (connection) connection.destroy()
}

export async function pause(message) {
    if (!isBotInVoiceChannel(message.guild.id)) return
    let audioPlayer = guildAudioPlayer[message.guild.id]
    if (!audioPlayer) throw new Error('Não há um audio player para pausar/despausar.')
    isAudioPlayerPaused(message.guild.id) ? audioPlayer.unpause() : audioPlayer.pause()
}

async function stop(message) {
    if (!isBotInVoiceChannel(message.guild.id)) return
    let audioPlayer = guildAudioPlayer[message.guild.id]
    if (audioPlayer) audioPlayer.stop()
    guildAudioPlayer[message.guild.id] = null
    queues[message.guild.id] = []
}

export async function skip(message, to) {
    const id = message.guild.id
    if (!isAudioPlayerIdle(id) && isAudioPlayerBuffering(id)) return

    if (to) queues[id]?.splice(0, to - 1)
    else queues[id]?.shift()

    if (isQueueEmpty(id)) return await leave(message)

    log.debug('Skipping...', message)

    if (flags[id]?.loop) toggleLoop(id)
    await playAudio(message)
}

export async function remove(message, index, count='1') {
    const id = message.guild.id
    if (!queues[id]) return await sendError(message, 'Ainda não foi criada uma playlist.')

    if(queues[id].length === 0)
        return await sendError(message, 'A playlist está vazia!')

    let removed = queues[id].splice(index, count)
    await sendPlaylist(message, `❎ Músicas removidas: `, removed, ++index)
}

export async function loop(message) {
    if (!isAudioPlayerPlaying(message.guild.id)) {
        await sendError(message, undefined, 'Não há uma música tocando agora.')
        return
    }
    toggleLoop(message.guild.id)
}

export async function addToQueue(message, track, alert=true) {
    const id = message.guild.id
    if (!queues[id]) queues[id] = []
    queues[id].push(track)

    if (queues[id][1] && alert) await sendTrackMessage(message, track)
}

export async function start(message, query) {
    const id = message.guild.id
    if (!query) query = message.content
    if (isQueueEmpty(id)) queues[id] = []

    let result = await translateQuery(message, query)
    // if it's a playlist
    if(Array.isArray(result)) {
        queues[id].shift() // removes current

        let metadata = result['metadata']
        for (const track of result.slice().reverse()) {
            if(track.url)
                queues[id].unshift(track)
        }
        await sendPlaylist(message, `Adicionando a playlist ${metadata.title} ao início`, result, 1, metadata.thumbnail)
    } else // if it's a single track
        queues[id][0] = result

    await playAudio(message).catch(async e => {
        log.error(e, message)
        await sendErrorTryAgainLater(message, e.message)
    })
}

async function playAudio(message) {
    const id = message.guild.id
    // assert connection
    let connection = getVoiceConnection(id)
    if (!connection) connection = await join(message)
    if (!connection) return log.debug('Unable to connect to voice channel.', )

    // assert audioPlayer
    let player = makeAudioPlayer(message, connection, id)
    if (!player) return log.debug('Unable to create AudioPlayer.', message)

    // get track
    if (isQueueEmpty(id)) return
    const track = queues[id][0]

    let stream
    try {
        if(!track.url) new Error('Track url is undefined!')
        stream = await play.stream(track.url)
    } catch (e) {
        log.error(e, message,'Error creating Stream')
        await sendErrorTryAgainLater(message, e.message)
        return await skip(message)
    }
    const resource = createAudioResource(stream.stream, { inputType: stream.type, silencePaddingFrames: 10 })

    player.play(resource)
    log.info(`Playing '${track.title}'`, message)

    if (!flags[id]?.loop) await sendTrackMessage(message, track, false)
}

export async function handle(message, query, play=true) {
    try {
        let result = await translateQuery(message, query)
        if(Array.isArray(result)) {
            let metadata = result['metadata']
            await handlePlaylist(message, result, metadata.title, metadata.thumbnail)
        } else
            await addToQueue(message, result)

        const canPlayNow = play && (!guildAudioPlayer[message.guild.id] || isAudioPlayerIdle(message.guild.id))
        // Plays track if not playing already
        if(canPlayNow) await playAudio(message)
    } catch (e) {
        log.error(e, message)
        await sendErrorTryAgainLater(message, e.message)
    }
}


async function translateQuery(message, query) {
    let validation = await play.validate(query)
    switch (validation) {
        case 'yt_playlist': return await handleYTPlaylist(message, query)
        case 'yt_video': return await handleYTTrack(message, query)

        case 'search': return await getFirstYTSearchResult(message, query)

        case 'so_track': return await handleSOTrack(message, query)
        case 'so_playlist': return await handleSOPlaylist(message, query)

        case 'sp_track': return await handleSPTrack(message, query)
        case 'sp_playlist': return await handleSPPlaylist(message, query)

        case false: {
            log.debug(`validation is 'false' for query: '${query}'`, message)
            return await sendError(message, 'Não suportado!', 'Eu não consigo entender esse link.')
        }
        default: {
            log.debug(`Type ${validation} is not supported for query '${query}'`, message)
            return await sendError(message, 'Não suportado!', 'Eu ainda não tenho suporte para atender a sua requisição.')
        }
    }
}

async function handlePlaylist(message, trackList, title, thumbnail) {
    // adds to queue
    for (const track of trackList)
        await addToQueue(message, track, false)
    // creates message
    await sendPlaylist(message, `Adicionando a playlist ${title}`, trackList, 1, thumbnail)
}

function toggleLoop(id) {
    if (!guildAudioPlayer[id]) return
    if (!flags[id]) flags[id] = { loop: false }
    flags[id].loop = !flags[id].loop
}

export const isBotInVoiceChannel = id => getVoiceConnection(id) !== undefined
const isAudioPlayerIdle = id => guildAudioPlayer[id] && guildAudioPlayer[id].state.status === AudioPlayerStatus.Idle
const isAudioPlayerBuffering = id => guildAudioPlayer[id] && guildAudioPlayer[id].state.status === AudioPlayerStatus.Buffering
const isAudioPlayerPaused = id => guildAudioPlayer[id] && guildAudioPlayer[id].state.status === AudioPlayerStatus.Paused
const isAudioPlayerPlaying = id => guildAudioPlayer[id] && guildAudioPlayer[id].state.status === AudioPlayerStatus.Playing
export const isQueueEmpty = id => !queues[id] || queues[id].length === 0
