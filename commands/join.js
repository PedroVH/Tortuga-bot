import {join} from "../music.js"

export const command = {
    data: {
        name: 'join',
        desc: 'O Tortuga se conecta na chamada de voz.'
    },
    async execute(message) {
        await join(message).then(message.react('✨'))
    }
}