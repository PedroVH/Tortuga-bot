import {sendError, sendMessage} from '../responses.js'
import {writeGuild} from '../guilds-controller.js'
import {PermissionsBitField} from 'discord.js'

export const command = {
    data: {
        name: 'tortuga',
        desc: 'Configura o tortuga para só ler mensagens do canal atual.'
    },
    async execute(message) {
        if(!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return await sendError(message, 'Sem autorização!', 'Somente usuários com a permissão \"Gerenciar Servidor\" podem utilizar este comando.')
        }
        await writeGuild(message.guild.id, {
            name: message.guild.name,
            channelId: message.channelId
        })
        await sendMessage(message, 'Feito!', `Eu só lerei mensagens no canal ${message.channel.name} a partir de agora.`)
    },
}