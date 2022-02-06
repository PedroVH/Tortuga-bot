require('dotenv').config()
const { Client, Intents } = require('discord.js')
const { handleCommand, loadCommands } = require('./commands')
const { handleMusic } = require('./music')
const client = new Client(
    { 
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
            Intents.FLAGS.GUILD_VOICE_STATES,
        ]
})

const prefix = "."
const token = process.env.DISCORD_TOKEN

loadCommands()

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return
    let text = message.content.replace(/^\s+|\s+$|\s+(?=\s)/g, '')
    if (!text) return
    text.startsWith(prefix) ? await handleCommand(message, text.toLowerCase().replace(prefix, '')) : await handleMusic(message, text)
})

client.once('ready', () => {
	console.log('\nBot on!\n')
})
client.login(token)