const music = require('./music');
const {servers} = require('./servers');
const constants = require('./constants.json');
const responses = require('./responses');
const {commandList} = require('./commandList')

const comandos = [];

function add(names, impl, voiceChannel = false, hasArgs = false) {
    comandos.push({
        'names': names,
        'impl': impl,
        'voiceChannel': voiceChannel,
        'hasArgs': hasArgs
    });
}

// Ping
add(constants.commands.ping, (msg) => msg.reply("Pong!"))
// Clear
add(constants.commands.clear, (msg) => msg.channel.bulkDelete(100, true))
// Clear <n>
add(constants.commands.clear, (msg) => msg.channel.bulkDelete(Number(msg.content.slice(msg.content.indexOf(' '))) + 1, true), false, true)
// Help
add(constants.commands.help, (msg) => msg.channel.send(responses.getHelp()))
// Help <cmd>
add(constants.commands.help, (msg) => msg.channel.send(responses.getCommandHelp(msg.content.slice(msg.content.indexOf(' ')))), false, true)
// Join
add(constants.commands.join, (msg) => music.join(msg), true)
// Leave
add(constants.commands.leave, (msg) => {
    msg.member.voice.channel.leave();
    servers[msg.guild.id].connection = null;
    servers[msg.guild.id].dispatcher = null;
    servers[msg.guild.id].isPlaying = false;
    servers[msg.guild.id].fila = [];
    msg.react('👌');
}, true)
// Stop
add(constants.commands.stop, (msg) => {music.stop(msg); msg.react('🛑')}, true) 
// Skip
add(constants.commands.skip, (msg) => {music.skip(msg); msg.react('⏩')}, true)
// Pause/Unpause
add(constants.commands.pause, (msg) => {music.pause(msg); msg.react('⏯')}, true)
// Playlist
add(constants.commands.playlist, (msg) => {
    if(!servers[msg.guild.id].fila.length) {
        msg.channel.send(responses.getWarning("Não há músicas na playlist atual."));    
        return;
    }
    index = 1;
    playlist_response = '';
    for (const item of servers[msg.guild.id].fila) {
        playlist_response = playlist_response.concat(index++ + ". " + item.title + "\n");
    }
    msg.channel.send(responses.getMessage('Playlist atual: ', playlist_response));
}, true)
// Start
add(constants.commands.start, (msg) => music.startCommand(msg), true, true)
// Drop
add(constants.commands.drop, (msg) => music.drop(msg), true)

module.exports = async (msg, isInVoiceChannel) => {
    let isCommand = constants.prefixos.find(pre => msg.content.startsWith(pre));
    let found = null;
    try {
        // Se não começar com prefixo
        if(!isCommand){
            if(isInVoiceChannel){
                if(msg.content.includes('list='))
                    music.playFromPlaylist(msg);
                else 
                    music.playCommand(msg, msg.content);
            } else {
                msg.channel.send(responses.notInVoiceChannel);
            }
            return;
        }
        found = getCommand(msg.content.slice(1));
        if(!found) {
            msg.channel.send(responses.commandNotFound);
            return;
        } 
        else if(found.voiceChannel && !isInVoiceChannel) {
            msg.channel.send(responses.notInVoiceChannel);
            return;
        }
        // Executa o comando
        await found.impl(msg);

    } catch (err) {
        if(isCommand && found) {
            errDescription = commandList.get(found.names).error_description;
            if(errDescription) {
                msg.channel.send(responses.getError(undefined, errDescription, found.names[0]));
                return;
            } 
        }
        console.log(err);
        msg.channel.send(responses.getError(err, undefined, found ? found.names[0] : null));
    }
}

function getCommand(comando) {
    let found;
    for(const command of comandos) {
        if(command.hasArgs) {
            if(command.names.find(c => comando.startsWith(c))) found = command;
        } else {
            if(command.names.includes(comando)) found = command;   
        }
        if(found) break;
    }
    return found;
}
