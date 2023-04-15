import {stop} from "../music.js"

export const command = {
    data: {
        name: 'stop',
        desc: 'Zera a playlist e para a música.'
    },
    async execute(message) {
        await stop(message).then(message.react('⏹️'))
    }
}