import {sendError, sendPlaylist, sendVideoMessage} from './responses.js'
import play from "play-dl"

import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnectionStatus
} from "@discordjs/voice"
import {getFirstYTSearchResult, handleYTPlaylist, handleYTTrack} from "./youtube.js";
import {handleSOPlaylist, handleSOTrack} from "./soundcloud.js";
import {handleSPPlaylist, handleSPTrack} from "./spotify.js";


// Salva as playlists das guildas
export const queues = []
// Guarda o player que está sendo utilizado em cada guilda. 
// Deve ser usado somente para consultar, e operações como pausar/despausar.
const guildAudioPlayer = []
// Uma array de flags. O index é o id da guilda.
// estrutura atual: { loop: boolean }
const flags = []

function makeAudioPlayer(message, connection, id) {
    const player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        })
    connection.subscribe(player)
        player.on('error', error => {
        console.error(error)
    })
    // quando o player parar de streamar, atualiza a fila e executa este método novamente (exceção o loop)
    player.on(AudioPlayerStatus.Idle, async () => {
        if (flags[id]?.loop)
            await playAudio(message)
        else
            await skip(message, null, true)
    })

    guildAudioPlayer[id] = player
    return player
}

export async function join(message) {
    if (!await isInVoiceChannel(message)) return
    const voiceChannel = message.member.voice.channel
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    })

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`[${voiceChannel.guild.name}] Connected`)
    })

    // workaround
    const networkStateChangeHandler = (oldNetworkState, newNetworkState) => {
        const newUdp = Reflect.get(newNetworkState, 'udp');
        clearInterval(newUdp?.keepAliveInterval);
    }

    connection.on('stateChange', (oldState, newState) => {
        const oldNetworking = Reflect.get(oldState, 'networking');
        const newNetworking = Reflect.get(newState, 'networking');

        oldNetworking?.off('stateChange', networkStateChangeHandler);
        newNetworking?.on('stateChange', networkStateChangeHandler);
    });
    // workaround

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
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
        console.log(`[${voiceChannel.guild.name}] Disconnected`)
        guildAudioPlayer[message.guild.id] = null
        queues[message.guild.id] = null
    })

    // Espera ter terminado de conectar antes de sair do método. 
    await entersState(connection, VoiceConnectionStatus.Ready, 5_000)
    return connection
}

export async function leave(message) {
    if (!await isInVoiceChannel(message)) return
    const connection = getVoiceConnection(message.guild.id)
    if (connection) connection.destroy()
}

export async function pause(message) {
    if (!await isInVoiceChannel(message)) return
    let audioPlayer = guildAudioPlayer[message.guild.id]
    if (!audioPlayer) throw new Error('Não há um audio player para pausar/despausar.')
    isAudioPlayerPaused(message.guild.id) ? audioPlayer.unpause() : audioPlayer.pause()
}

export async function stop (message) {
    if (!await isInVoiceChannel(message)) return
    let audioPlayer = guildAudioPlayer[message.guild.id]
    if (audioPlayer) audioPlayer.stop()
    guildAudioPlayer[message.guild.id] = null
    queues[message.guild.id] = []
}

export async function skip(message, to, ignoreInVoiceChannel) {
    const id = message.guild.id
    if (!ignoreInVoiceChannel && !await isInVoiceChannel(message)) return
    if (!isAudioPlayerIdle(id) && isAudioPlayerBuffering(id)) return
    if (!await validateHasQueue(message)) return

    if(to) {
        queues[id].splice(0, to - 1)
    }
    else {
        queues[id].shift()
    }
    if (flags[id]?.loop) toggleLoop(id)
    await playAudio(message)
}

export async function remove(message, index, count='1') {
    const id = message.guild.id
    if (!await isInVoiceChannel(message)) return
    if (!await validateHasQueue(message)) return

    if(queues[id].length === 0)
        return await sendError(message, "A playlist está vazia!")

    let removed = queues[id].splice(index, count)
    await sendPlaylist(message, `❎ Músicas removidas: `, removed, ++index)
}

export async function loop(message) {
    if (!await isInVoiceChannel(message)) return
    if (!isAudioPlayerPlaying(message.guild.id)) {
        await sendError(message, undefined, "Não há uma música tocando agora.")
        return
    }
    toggleLoop(message.guild.id)
}

export async function addToQueue(message, video, alert=true) {
    const id = message.guild.id
    if (!queues[id]) queues[id] = []
    queues[id].push(video)

    if (queues[id][1] && alert) await sendVideoMessage(message, video)
}

export async function start(message, query) {
    const id = message.guild.id
    if (!queues[id]) queues[id] = []
    if (!query) query = message.content

    queues[id][0] = await handle(message, query, false)// video object
    try {
        await playAudio(message)
    } 
    catch (error) {
        console.error(error)
        await sendError(message, 'Não foi possível reproduzir, tente novamente mais tarde.', error.message)
    }
}

async function playAudio(message) {
    const id = message.guild.id
    // garante connection
    let connection = getVoiceConnection(id)
    if (!connection) connection = await join(message)
    if (!connection) return console.log(`[${message.guild.name}] Incapaz de criar conexão com o voice chat.`)

    // garante audioPlayer
    let player = makeAudioPlayer(message, connection, id)
    if (!player) return console.log(`[${message.guild.name}] Incapaz de criar audio player.`)

    // recupera o vídeo e reproduz
    if (!await validateHasQueue(message)) return
    const video = queues[id][0]
    if (!video) return

    const stream = await play.stream(video.url, {
        quality: 1
    }).catch(async error => {
        console.error(error)
        await skip(message)
    })

    const resource = createAudioResource(stream.stream, { inputType: stream.type })

    player.play(resource)

    if (!flags[id]?.loop) await sendVideoMessage(message, video, false)
}

export async function handle(message, query, play=true) {
    if (!await isInVoiceChannel(message)) return
    try {
        let result = await translateQuery(message, query)
        if(Array.isArray(result)) {
            let metadata = result['metadata']
            await handlePlaylist(message, result, metadata.title, metadata.thumbnail)
        } else await addToQueue(message, result)

        const canPlayNow = play && (!guildAudioPlayer[message.guild.id] || isAudioPlayerIdle(message.guild.id))
        // Toca a música se já não tiver uma tocando
        if(canPlayNow) await playAudio(message)
    } catch (error) {
        console.error(error)
        await sendError(message, 'Não foi possível reproduzir, tente novamente mais tarde.', error.message)
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

        case false: console.log(`validation is 'false' for query: '${query}'`); break
        default: {
            console.log(`Type ${validation} is not supported for query '${query}'`)
            return await sendError(message, "Não suportado!", "Eu ainda não tenho suporte para atender a sua requisição.")
        }
    }
}

async function handlePlaylist(message, videoList, title, thumbnail) {
    // adiciona na queue
    for (const video of videoList)
        await addToQueue(message, video, false)
    // cria a mensagem
    await sendPlaylist(message, `Adicionando a playlist ${title}`, videoList, 1, thumbnail)
}

async function isInVoiceChannel(message) {
    if (!message.member.voice.channel) {
        await sendError(message, 'Você deve estar conectado em um canal de voz.', '', 'https://i.postimg.cc/CM9RFyjy/turt-phone.png')
        return false
    }
    return true
}

async function validateHasQueue(message) {
    if (!queues[message.guild.id]) {
        await sendError(message, "Ainda não foi criada uma playlist.")
        return false
    }
    return true
}

function toggleLoop(id) {
    let player = guildAudioPlayer[id]
    if (!player) return
    if (!flags[id]) flags[id] = { loop: false }
    flags[id].loop = !flags[id].loop
}

const isAudioPlayerIdle = (id) => guildAudioPlayer[id] && guildAudioPlayer[id].state.status === AudioPlayerStatus.Idle
const isAudioPlayerBuffering = (id) => guildAudioPlayer[id] && guildAudioPlayer[id].state.status === AudioPlayerStatus.Buffering
const isAudioPlayerPaused = (id) => guildAudioPlayer[id] && guildAudioPlayer[id].state.status === AudioPlayerStatus.Paused
const isAudioPlayerPlaying = (id) => guildAudioPlayer[id] && guildAudioPlayer[id].state.status === AudioPlayerStatus.Playing