const {servers} = require('./servers.js');
const ytdl = require('ytdl-core');
const ytsearch = require('youtube-search-api');
const ytpl = require('ytpl');
const responses = require('./responses.js');
const constants = require('./constants.json');

module.exports = { 
    join, 
    playCommand, 
    skip, 
    stop, 
    pause, 
    playFromPlaylist, 
    startCommand,
    drop
}

async function join(msg) {
    servers[msg.guild.id].connection = await msg.member.voice.channel.join();
    servers[msg.guild.id].connection.setSpeaking(0);
}

async function playCommand(msg, oQueTocar) {
    video = await getVideo(msg, oQueTocar);
    if(!video) return;
    
    servers[msg.guild.id].fila.push(video);
    await play(msg);
}

async function skip(msg) {
    servers[msg.guild.id].isPlaying = false;
    servers[msg.guild.id].fila.shift();

    if(servers[msg.guild.id].fila[0]) 
        await play(msg);
    else 
        stop(msg);
}

function stop(msg) {
    if(servers[msg.guild.id].connection != null && servers[msg.guild.id].connection.dispatcher != null){
        servers[msg.guild.id].connection.dispatcher.end();
        servers[msg.guild.id].fila = [];
    }
}

function pause(msg) {
    if(servers[msg.guild.id].isPaused) {
        //Resume
        servers[msg.guild.id].isPaused = false;
        servers[msg.guild.id].dispatcher.resume();
        servers[msg.guild.id].dispatcher.pause(true);
        servers[msg.guild.id].dispatcher.resume();
    } else {
        //Pause
        servers[msg.guild.id].isPaused = true;
        servers[msg.guild.id].dispatcher.pause();
    }
}

async function playFromPlaylist(msg) {
    playlist_id = await ytpl.getPlaylistID(msg.content);
    result = await ytpl(playlist_id);

    list = result.items;

    if(msg.content.includes("&list=")){
        number = msg.content.slice(msg.content.lastIndexOf('&index='));
        list = list.filter((item) => item.index >= Number(number.replace('&index=', '')));
    }
    if(!list.length){
        msg.channel.send(responses.getError(undefined, "Não foi possível recuperar esta playlist."));
        return;
    }    
    videoTitles = "";
    once = false;
    for(const item of list) {
        videoTitles = videoTitles.concat("\n" + item.title);
        video = await getVideo(msg, item.url, item.title);
        if(!video) return;
        servers[msg.guild.id].fila.push(video);
        if(!once) {
            once = true;
            await play(msg, true, false);
        }
    }
    msg.channel.send(responses.getMessage("Adicionando na playlist: ", videoTitles));
}

async function startCommand(msg) {
    oQueTocar = msg.content.replace(".start", '').trim();
    if(!oQueTocar) {
        throw new Error();
    }
    await start(msg, oQueTocar, true);
}

async function drop(msg) {
    await start(msg, constants.drops[Math.floor(Math.random() * constants.drops.length)], false);
    msg.channel.send(responses.getMessage("MANDANDO O DROP"));
}

async function play(msg, showPlaying = true, showAdded = true) {
    await join(msg);
    const tocando = servers[msg.guild.id].fila[0];

    if(!servers[msg.guild.id].isPlaying){
        servers[msg.guild.id].isPlaying = true;
        
        servers[msg.guild.id].dispatcher = await servers[msg.guild.id].connection.play(tocando.video);
        if(showPlaying) msg.channel.send(responses.getMessage("🎶 " + tocando.title));
        servers[msg.guild.id].dispatcher.on('finish', async () => await skip(msg));
    }
    else if(showAdded) {
        last = servers[msg.guild.id].fila.slice(-1)[0];
        if(last) msg.channel.send(responses.getMessage("🎶 " + last.title, "Adicionado na playlist."));
    }
}

async function start(msg, url, showPlaying) {
    if(servers[msg.guild.id].isPlaying) servers[msg.guild.id].isPlaying = false;
    let video = await getVideo(msg, url);
    if(!video) return;
    servers[msg.guild.id].fila[0] = video;
    await play(msg, showPlaying, false);
}

async function ytSearch(oQueTocar) {
    result = await ytsearch.GetListByKeyword(oQueTocar);
    return 'https://www.youtube.com/watch?v=' + result.items[0].id;
}

async function getVideo(msg, url, title) {
    let video;
    
    url = await getVideoUrl(url);
    if(!title) title = await getVideoTitle(url);

    video = await getVideoRetry(msg, url, title, 1)
    return {
        'video': video,
        'url': url,
        'title': title
    }
}

async function getVideoRetry(msg, url, title, tries) {
    let video;
    video = ytdl(url, {filter: "audioonly"});
    video.on('error', async () => {
        if(tries < 4) {
            console.log( tries + " tries for " + title)
            await getVideoRetry(msg, url, title, tries++)
        } else {
            msg.channel.send(responses.getWarning(title, "Não foi possível recuperar este vídeo."));
        }
    });
    return video;
}

async function getVideoUrl(oQueTocar) {
    oQueTocar = oQueTocar.trim();
    
    if(!ytdl.validateURL(oQueTocar)){
        oQueTocar = await ytSearch(oQueTocar);
    }
    return oQueTocar;
}

async function getVideoTitle(oQueTocar) {
    videoinfo = await getVideoInfo(oQueTocar);
    return videoInfo.videoDetails.title;
}

async function getVideoInfo(oQueTocar) {
    videoInfo = await ytdl.getBasicInfo(oQueTocar);
    return videoInfo;
}
