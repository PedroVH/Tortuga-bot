const Discord = require('discord.js');
const client = new Discord.Client();
const {servers} = require('./servers');
const commands = require('./commands');
require('dotenv').config();

client.on('ready', () => {
    console.log("Bote tá on.");
    client.user.setPresence({
        status: 'online',
        activity: {
            name: '.help',
            type: 'LISTENING'
        }
    })
})

client.on('message', async (msg) => {
    if(!msg.guild) return;
    if(msg.author.bot) return;
    if(!msg.content) return;

    if(!servers[msg.guild.id]) {
        servers[msg.guild.id] = {
            connection: null,
            dispatcher: null,
            fila: [],
            isPlaying: false,
            isPaused: false
        }
    }
    console.log(msg.guild.name + ": " + msg.content);

    commands(msg, msg.member.voice.channel);
})

client.on("voiceStateUpdate", function(oldMember, newMember){
    if(oldMember.member.user.id == client.user.id) {
        if(!newMember.channelID){
            servers[oldMember.guild.id].connection = null;
            servers[oldMember.guild.id].dispatcher = null;
            servers[oldMember.guild.id].isPlaying = false;
            servers[oldMember.guild.id].fila = [];
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
