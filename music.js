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
// Guarda o player que está sendo utilizado em cada guilda
const guildAudioPlayer = []


function makeAudioPlayer(connection, id) {
    const player = createAudioPlayer()
    connection.subscribe(player)
    guildAudioPlayer[id] = player
}

async function join(voiceChannel) {
    if (!validateVoiceChannel(voiceChannel)) return
    const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    })

    connection.on(VoiceConnectionStatus.Ready, () => {
        console.log(`Connected to ${voiceChannel.guild.name}.`)
        makeAudioPlayer(connection, voiceChannel.guild.id)
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
        console.log(`Disconnected de ${voiceChannel.guild.name}.`)
        guildAudioPlayer[voiceChannel.guild.id] = null
    })

    // Espera ter terminado de conectar antes de sair do método. 
    await entersState(connection, VoiceConnectionStatus.Ready, 5_000)
    return connection
}

async function leave(message) {
    if (!validateVoiceChannel(message.member.voice.channel)) return
    const connection = getVoiceConnection(message.guild.id)
    if (connection) connection.destroy()
}

async function pause(message) {
    if (!validateVoiceChannel(message.member.voice.channel)) return
    audioPlayer = guildAudioPlayer[message.guild.id]
    if (!audioPlayer) throw new Error('Não há um audio player para pausar/despausar.')
    audioPlayer.state.status == AudioPlayerStatus.Paused ? audioPlayer.unpause() : audioPlayer.pause()
}

async function stop (message) {
    if (!validateVoiceChannel(message.member.voice.channel)) return
    audioPlayer = guildAudioPlayer[message.guild.id]
    if (!audioPlayer) throw new Error('Não há o que parar.')
    audioPlayer.stop()
    delete queues[message.guild.id]
}

async function skip(message) {
    if (!validateVoiceChannel(message.member.voice.channel)) return
    const id = message.guild.id
    if (!queues[id]) return
    queues[id].shift()
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
    const voiceChannel = message.member.voice.channel
    // garante connection
    let connection = getVoiceConnection(id)
    if (!connection) connection = await join(voiceChannel)
    if (!connection) return

    // garante audioPlayer
    let player = guildAudioPlayer[id]
    if (!player) player = makeAudioPlayer(connection, id)
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
    const voiceChannel = message.member.voice.channel
    if (!validateVoiceChannel(voiceChannel)) return
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

        const canPlayNow = (!guildAudioPlayer[message.guild.id]) || (guildAudioPlayer[message.guild.id] && guildAudioPlayer[message.guild.id].state.status == AudioPlayerStatus.Idle)
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
    const canPlayNow = (!guildAudioPlayer[message.guild.id]) || (guildAudioPlayer[message.guild.id] && guildAudioPlayer[message.guild.id].state.status == AudioPlayerStatus.Idle)
    if(canPlayNow) await playAudio(message) 
}

async function getUrlByKeyword(keyword) {
    result = await ytsearch.GetListByKeyword(keyword, false, 1)
    if (result) return getUrlById(result.items[0]?.id)
}

function getUrlById(id) {
    return 'https://www.youtube.com/watch?v=' + id
}

async function validateVoiceChannel(voiceChannel) {
    if (!voiceChannel) {
        await sendError(message, 'Você deve estar conectado em um canal de voz.', '', 'https://i.postimg.cc/CM9RFyjy/turt-phone.png')
        return false
    }
    return true
}

module.exports = {
    join,
    leave,
    skip,
    pause,
    stop,
    queues,
    handleMusic
}