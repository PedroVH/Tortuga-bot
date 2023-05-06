import play from 'play-dl'
import {sendError} from './responses.js'
import {handle} from './music.js'

export async function handleYTTrack(message, query) {
    let YTVideo = (await play.video_basic_info(query)).video_details
    return translateYTVideoObject(YTVideo)
}

export async function handleYTPlaylist(message, query) {
    let allVideos = []
    let newVideos = []
    // In case it's a playlist link
    let playlistIdAndIndex = query.split('list=')[1].split('&index=')

    let playlist = await play.playlist_info(playlistIdAndIndex[0], {incomplete: true}).catch(err => {
        console.log(`[${message.guild.name}] Erro lendo playlist`)
        sendError(message, "Erro lendo playlist!", err.message)

        if(query.includes('watch'))
            handle(message, query.split('&list=')[0])
    })
    if (playlist)
        allVideos = await playlist.all_videos()
    else
        return

    let toAdd = allVideos
    let isVideoAndPlaylist = query.includes('watch?v=')

    if(isVideoAndPlaylist) {
        toAdd = allVideos.slice(playlistIdAndIndex[1] - 1)
    }

    // adds metadata
    newVideos['metadata'] = {
        title: playlist.title,
        thumbnail: playlist.thumbnail?.url
    }

    // adds tracks
    for (const video of toAdd) {
        newVideos.push(translateYTVideoObject(video))
    }
    return newVideos
}

export async function getFirstYTSearchResult(message, query) {
    let playlist = query.includes('playlist')
    let options = {limit:1}
    if (playlist)
        options = {limit:1, source: { youtube: 'playlist' }}

    let result = await play.search(query, options)

    if(!result)
        await sendError(message, 'Não foi possível encontrar este vídeo no youtube.', 'Tente pesquisar de outra forma, ou utilize o link do vídeo.', 'https://i.postimg.cc/CKM1vwV8/turt-think.png')

    let data = result.shift()
    if (playlist)
        return await handleYTPlaylist(message, data.url)
    else
        return translateYTVideoObject(data)
}

export function translateYTVideoObject(video) {
    if (!video) console.log('Video está nulo!')
    return {
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnails?.shift().url,
        channel: video.channel?.name,
        duration: video.live ? 'Live' : video.durationRaw
    }
}