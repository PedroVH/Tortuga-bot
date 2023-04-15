import {Client, GatewayIntentBits} from 'discord.js'
import {handleCommand, loadCommands} from './command-controller.js'
import {handle} from './music.js'
import {readGuild} from './guilds-controller.js'

import {config} from "dotenv";

config()

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

loadCommands().then(() => console.log("All commands loaded!"))

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return

    let guild = await readGuild(message.guildId)
    if (!message.content.includes(".tortuga") && (!guild || guild.channelId !== message.channelId)) return

    let text = message.content.replace(/^\s+|\s+$|\s+(?=\s)/g, '')
    if (!text) return
    console.log(`[${message.guild.name}] ${message.author.username}: ${text}`)
    text.startsWith(prefix) ? await handleCommand(message, text.replace(prefix, '')) : await handle(message, text)
})

client.once('ready', () => {
	console.log('\nBot on!\n')
})
client.login(token)