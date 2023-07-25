import * as log from './log-helper.js'
import {Client, GatewayIntentBits} from 'discord.js'
import {handleCommand, loadCommands} from './command-controller.js'
import {handle} from './music.js'
import {readGuild} from './guilds-controller.js'

import {config} from 'dotenv'
import {sendMessage} from './responses.js'
import play from 'play-dl'

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

play.getFreeClientID().then((clientID) => {
    play.setToken({
        soundcloud : {
            client_id : clientID
        }
    })
})

loadCommands().then(() => log.info('All commands loaded!'))

client.on('messageCreate', async message => {
    if (message.author.bot || !message.content) return

    let guild = await readGuild(message.guildId)

    if(guild) {
        if(guild.channelId !== message.channelId) return
    } else if(!message.content.includes('.tortuga')) {
        return await sendMessage(message, 'Me configure!', "Escreva '.tortuga' em um canal para começar a usar o tortuga.\n" +
            'Recomendo utilizar um canal dedicado para mim, pois vou tentar entender todas as mensagens enviadas nele!\n\n' +
            "Utilize '.help' no canal escolhido para saber mais.")
    }

    let text = message.content.replace(/^\s+|\s+$|\s+(?=\s)/g, '')
    if (!text) return
    log.info(`${message.author.username}: ${text}`, message)
    text.startsWith(prefix) ? await handleCommand(message, text.replace(prefix, '')) : await handle(message, text)
})

client.once('ready', () => {
    log.info('Bot ready!')
})
client.login(token)