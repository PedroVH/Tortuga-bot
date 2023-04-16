import play from "play-dl";

export async function handleSOTrack(message, query) {
    let track = await play.soundcloud(query)
    return translateSOTrackObject(track)
}

export async function handleSOPlaylist(message, query) {
    let newTracks = []

    let playlist = await play.soundcloud(query)
    let allTracks = await playlist.all_tracks()

    // adiciona metadata
    newTracks['metadata'] = {
        title: playlist.name,
        thumbnail: allTracks[0].thumbnail
    }

    for (const track of allTracks) {
        newTracks.push(translateSOTrackObject(track))
    }

    return newTracks
}

export function translateSOTrackObject(track) {
    if (!track) console.log("Track está nula!")
    return {
        title: track.name,
        url: track.url,
        thumbnail: track.thumbnail,
        channel: track.user.name,
        duration: new Date(track.durationInSec * 1000).toISOString().substring(14, 19)
    }
}