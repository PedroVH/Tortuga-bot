import { sendError, sendVideoMessage, sendPlaylist} from './responses.js'
import play from "play-dl"

import {
    AudioPlayerStatus,
    createAudioPlayer, createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel, NoSubscriberBehavior,
    VoiceConnectionStatus
} from "@discordjs/voice"


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

async function addToQueue(message, video, alert=true) {
    const id = message.guild.id
    if (!queues[id]) queues[id] = []
    queues[id].push(video)

    if (queues[id][1] && alert) await sendVideoMessage(message, video)
}

export async function start(message, query) {
    const id = message.guild.id
    if (!queues[id]) queues[id] = []
    if (!query) query = message.content

    let video
    let validation = validateYoutubeUrl(query)

    if (validation === 'video')
        video = (await play.video_basic_info(query)).video_details
    else if (validation === false)
        video = await getFirstSearchResult(message, query)

    queues[id][0] = translateYTVideoObject(video)
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

    const stream = await play.stream(video.url).catch(async error => {
        console.error(error)
        await skip(message)
    })

    const resource = createAudioResource(stream.stream, { inputType: stream.type })

    player.play(resource)

    if (!flags[id]?.loop) await sendVideoMessage(message, video, false)
}

export async function handle(message, query) {
    if (!await isInVoiceChannel(message)) return
    try {
        let validation = validateYoutubeUrl(query)
        if (validation === 'playlist')
            return await handlePlaylist(message, query)

        let ytVideo
        if (validation === 'video')
            ytVideo = (await play.video_basic_info(query)).video_details
        else {
            // É provavelmente == search
            ytVideo = await getFirstSearchResult(message, query)
            if (!ytVideo) return
        }

        await addToQueue(message, translateYTVideoObject(ytVideo))
        const canPlayNow = !guildAudioPlayer[message.guild.id] || isAudioPlayerIdle(message.guild.id)
        // Toca a música se já não tiver uma tocando
        if(canPlayNow) await playAudio(message)
    } catch (error) {
        console.error(error)
        await sendError(message, 'Não foi possível reproduzir, tente novamente mais tarde.', error.message)
    }
}

async function handlePlaylist(message, url) {
    let allVideos = []
    let newVideos = []
    // No caso de ser o link de uma playlist
    let playlistIdAndIndex = url.split('list=')[1].split('&index=')

    let playlist = await play.playlist_info(playlistIdAndIndex[0], {incomplete: true}).catch(err => {
        console.log(`[${message.guild.name}] Erro lendo playlist`)
        sendError(message, "Erro lendo playlist!", err.message)

        if(url.includes('watch'))
            handle(message, url.split('&list=')[0])
    })
    if (playlist)
        allVideos = await playlist.all_videos()
    else
        return

    let toAdd = allVideos
    let isVideoAndPlaylist = url.includes('watch?v=')

    if(isVideoAndPlaylist) {
        toAdd = allVideos.slice(playlistIdAndIndex[1] - 1)
    }
    // adiciona os vídeos
    for (let i = 0; i < toAdd.length; i++) {
        const video = translateYTVideoObject(toAdd[i])
        newVideos.push(video)
        await addToQueue(message, video, false)
    }
    // cria a mensagem
    await sendPlaylist(message, `Adicionando a playlist ${playlist.title}`, newVideos, 1, playlist.thumbnail?.url)
    const canPlayNow = (!guildAudioPlayer[message.guild.id]) || isAudioPlayerIdle(message.guild.id)
    // se o bot estiver livre, toca a música
    if(canPlayNow) await playAudio(message) 
}

async function getFirstSearchResult(message, keyword) {
    let playlist = keyword.includes('playlist')
    let options = {limit:1}
    if (playlist)
        options = {limit:1, source: { youtube: 'playlist' }}

    let result = await play.search(keyword, options)

    if(!result)
        await sendError(message, 'Não foi possível encontrar este vídeo.', 'Tente pesquisar de outra forma, ou utilize o link do vídeo.', 'https://i.postimg.cc/CKM1vwV8/turt-think.png')

    let data = result.shift()
    if (playlist)
        await handlePlaylist(message, data.url)
    else
        return data

    return null
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

function validateYoutubeUrl(url) {
    if(!url.startsWith('https')) return false
    return play.yt_validate(url)
}

function translateYTVideoObject(video) {
    if (!video) console.log("Video está nulo!")
    return {
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnails?.shift().url,
        channel: video.channel?.name,
        duration: video.durationRaw
    }
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