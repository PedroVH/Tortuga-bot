import play from "play-dl";
import {sendError} from "./responses.js";

export async function handleSPTrack(message, query) {
    return await sendError(message, "Spotify indisponível!", "Infelizmente não consigo reproduzir musicas do spotify no momento." +
        "\nIssue no github: https://github.com/play-dl/play-dl/issues/349")

    if(play.is_expired()) await play.refreshToken()
    let track = await play.spotify(query)
    // todo yt search
    return translateSPTrackObject(track)
}

export async function handleSPPlaylist(message, query) {
    return await sendError(message, "Spotify indisponível!", "Infelizmente não consigo reproduzir musicas do spotify no momento." +
        "\nIssue no github: https://github.com/play-dl/play-dl/issues/349")

    if(play.is_expired()) await play.refreshToken()
    let newTracks = []

    let playlist = await play.spotify(query)
    let allTracks = await playlist.all_tracks()

    // adiciona metadata
    newTracks['metadata'] = {
        title: playlist.name,
        thumbnail: playlist.thumbnail?.url
    }

    for (const track of allTracks) {
        newTracks.push(translateSPTrackObject(track))
    }

    return newTracks
}

export function translateSPTrackObject(track) {
    if (!track) console.log("Track está nula!")
    return {
        title: track.name,
        url: track.url,
        thumbnail: track.thumbnail?.url,
        channel: track.artists[0]?.name,
        duration: new Date(track.durationInSec * 1000).toISOString().substring(14, 19)
    }
}