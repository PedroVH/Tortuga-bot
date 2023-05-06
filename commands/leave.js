import {leave} from '../music.js'

export const command = {
    data: {
        name: 'leave',
        desc: 'O Tortuga se desconecta da chamada de voz.',
        requiresVoiceChannel: true
    },
    async execute(message) {
        await leave(message).then(message.react('✌️'))
    }
}