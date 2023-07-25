import fs from 'fs'
import * as log from './log-helper.js'

import {sendError} from './responses.js'
import {commands} from './commands.js'

export async function loadCommands() {
    log.log('Loading commands...')
    const files = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

    for (const file of files) {
        let command = (await import(`./commands/${file}`)).command
        commands[command.data.name] = command
        log.log(`loaded ${command.data.name}`)
    }
}

export async function handleCommand(message, text) {
    let request = text.split(' ')
    let name = request[0]
    let args = request.slice(1)

    const command = commands[name.toLowerCase()]
	if (!command) return
    try {
        if(command.data.requiresVoiceChannel && !message.member.voice.channel)
            return await sendError(message, 'Você deve estar conectado em um canal de voz.', '', 'https://i.postimg.cc/CM9RFyjy/turt-phone.png')

        await command.execute(message, args)
    } catch (e) {
        log.error(e, message)
        await sendError(message, undefined, 'Houve um erro ao executar este comando.')
    }
}