const { sendError, sendMessage, sendPlaylist } = require('./responses')
const ytdl = require('ytdl-core-discord')
const ytsearch = require('youtube-search-api')
const { joinVoiceChannel, 
    getVoiceConnection, 
    VoiceConnectionStatus,
    entersState,
    createAudioPlayer,
    AudioPlayerStatus,
    createAudioResource } = require('@discordjs/voice')
// TODO: Adicionar pause, unpause, loop, start e start (n).

// Salva as playlists das guildas
const queues = []
// Guarda o player que está sendo utilizado em cada guilda. Deve ser usado somente para consultar.
const guildAudioPlayer = []

function makeAudioPlayer(connection, id) {
    const player = createAudioPlayer()
    connection.subscribe(player)
    guildAudioPlayer[id] = player
    return player
}

async function join(message) {
    if (!await validateVoiceChannel(message)) return
    const voiceChannel = message.member.voice.channel
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    })

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`${voiceChannel.guild.name}: Connected`)
    })

    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
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

    connection.on(VoiceConnectionStatus.Destroyed, async (oldState, newState) => {
        console.log(`${voiceChannel.guild.name}: Disconnected`)
        delete guildAudioPlayer[message.guild.id]
        delete queues[message.guild.id]
    })

    // Espera ter terminado de conectar antes de sair do método. 
    await entersState(connection, VoiceConnectionStatus.Ready, 5_000)
    return connection
}

async function leave(message) {
    if (!await validateVoiceChannel(message)) return
    const connection = getVoiceConnection(message.guild.id)
    if (connection) connection.destroy()
}

async function pause(message) {
    if (!await validateVoiceChannel(message)) return
    audioPlayer = guildAudioPlayer[message.guild.id]
    if (!audioPlayer) throw new Error('Não há um audio player para pausar/despausar.')
    isAudioPlayerPaused(id) ? audioPlayer.unpause() : audioPlayer.pause()
}

async function stop (message) {
    if (!await validateVoiceChannel(message)) return
    let audioPlayer = guildAudioPlayer[message.guild.id]
    if (audioPLayer) audioPlayer.stop()
    delete guildAudioPlayer[message.guild.id]
    delete queues[message.guild.id]
}

async function skip(message) {
    console.log("skip enter")
    const id = message.guild.id
    if (!await validateVoiceChannel(message) || (!isAudioPlayerIdle(id) && isAudioPlayerBuffering(id))) return
    if (!queues[id]) return
    queues[id].shift()
    console.log("skip exit")
    await playAudio(message)
}

async function addToQueue(message, title, url, alert=true) {
    const id = message.guild.id
    if (!queues[id]) queues[id] = []
    queues[id].push({ title: title, url: url })
    if (queues[id][1] && alert) await sendMessage(message, `🎶 ${title} adicionado na playlist.`, undefined, null, false)
}

async function playAudio(message) {
    const id = message.guild.id
    // garante connection
    let connection = getVoiceConnection(id)
    if (!connection) connection = await join(message)
    if (!connection) return

    // garante audioPlayer
    let player = makeAudioPlayer(connection, id)
    console.log(player)
    if (!player) return

    // recupera o vídeo e reproduz
    if (!queues[id]) return
    const url = queues[id][0]?.url
    if (!url) return
    player.play(createAudioResource(await ytdl(url)))
    await sendMessage(message, `🎶 ${queues[id][0]?.title}`, '', null, false)

    player.on('error', error => {
        console.error(error)
    })
    // quando o player parar de streamar, atualiza a fila e executa este método novamente
    player.on(AudioPlayerStatus.Idle, async () => {
        await skip(message)
    })
}

async function handleMusic(message, text) {
    if (!await validateVoiceChannel(message)) return
    try {
        let url = text
        if (!ytdl.validateURL(url)) {
            if (url.includes('https://www.youtube.com/playlist?list=')) {
                await handlePlaylist(message, url)
                return
            }
            url = await getUrlByKeyword(text)
            if (!url) sendError(message, 'Não foi possível encontrar este vídeo.', 'Tente pesquisar de outra forma, ou utilize o link do vídeo.', 'https://i.postimg.cc/CKM1vwV8/turt-think.png')
        } else {
            if (url.includes('&list=')) {
                await handlePlaylist(message, url, true)
                return
            }
        }
        const info = await ytdl.getBasicInfo(url)
        const isNotSafe = info.videoDetails.isPrivate || info.videoDetails.age_restricted
        // se não for reproduzível manda um feedback para o usuário antes de cancelar a operação
        if(isNotSafe) { 
            if (info.videoDetails.isPrivate) await sendError(message, '', 'O vídeo é privado.', 'https://i.postimg.cc/y6pNvMfg/turt-blush.png')
            if (info.videoDetails.age_restricted) await sendError(message, '', 'Há uma restrição de idade no vídeo.', 'https://i.postimg.cc/C11g81pv/turt-little.png')
            return
        }
        addToQueue(message, info.videoDetails.title, info.videoDetails.video_url)

        const canPlayNow = !guildAudioPlayer[message.guild.id] || isAudioPlayerIdle(message.guild.id)
        // Toca a música se já não tiver uma tocando
        if(canPlayNow) await playAudio(message) 
    } catch (error) {
        console.log(error)
        await sendError(message, 'Não foi possível reproduzir.', 'Tente novamente mais tarde.')
    }
}

async function handlePlaylist(message, url, isVideoLink=false) {
    let itens = []
    let newVideos = []
    // No caso de ser o link de uma playlist
    let playlistId = url.split('list=')[1].split('&index=')[0]
    let playlist = await ytsearch.GetPlaylistData(playlistId)
    if (playlist) itens = playlist.items
    let afterVideoLink = false
    // adiciona os vídeos
    for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        if (isVideoLink && !afterVideoLink) {
            afterVideoLink = item.id == ytdl.getURLVideoID(url)
            if (!afterVideoLink) continue
        }
        video = {
            title: item.title,
            url: getUrlById(item.id)
        }
        newVideos.push(video)
        addToQueue(message, video.title, video.url, false)   
    }
    // cria a mensagem
    await sendPlaylist(message, 'Adicionando a playlist: ', newVideos)
    console.log((!guildAudioPlayer[message.guild.id]))
    const canPlayNow = (!guildAudioPlayer[message.guild.id]) || isAudioPlayerIdle(message.guild.id)
    if(canPlayNow) await playAudio(message) 
}

async function getUrlByKeyword(keyword) {
    result = await ytsearch.GetListByKeyword(keyword, false, 1)
    if (result) return getUrlById(result.items[0]?.id)
}

async function validateVoiceChannel(message) {
    if (!message.member.voice.channel) {
        await sendError(message, 'Você deve estar conectado em um canal de voz.', '', 'https://i.postimg.cc/CM9RFyjy/turt-phone.png')
        return false
    }
    return true
}

const getUrlById = (id) =>'https://www.youtube.com/watch?v=' + id

const isAudioPlayerIdle = (id) => guildAudioPlayer[id] && guildAudioPlayer[id].state.status == AudioPlayerStatus.Idle

const isAudioPlayerBuffering = (id) => guildAudioPlayer[id] && guildAudioPlayer[id].state.status == AudioPlayerStatus.Buffering

const isAudioPlayerPaused = (id) => guildAudioPlayer[id] && guildAudioPlayer[id].state.status == AudioPlayerStatus.Paused

module.exports = {
    join,
    leave,
    skip,
    pause,
    stop,
    queues,
    handleMusic
}