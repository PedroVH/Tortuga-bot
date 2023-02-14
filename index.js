require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js');
const { handleCommand, loadCommands } = require('./command-controller')
const { handle } = require('./music')
const client = new Client(
    {
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessageReactions
        ]
})

const prefix = "."
const token = process.env.DISCORD_TOKEN

loadCommands()

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return
    let text = message.content.replace(/^\s+|\s+$|\s+(?=\s)/g, '')
    if (!text) return
    console.log(`[${message.guild.name}] ${message.author.username}: ${text}`)
    text.startsWith(prefix) ? await handleCommand(message, text.toLowerCase().replace(prefix, '')) : await handle(message, text)
})

client.once('ready', () => {
	console.log('\nBot on!\n')
})
client.login(token)