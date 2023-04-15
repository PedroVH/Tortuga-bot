import {pause} from "../music.js"

export const command = {
    data: {
        name: 'p',
        desc: 'Pausa/despausa a reprodução da música.'
    },
    async execute(message) {
        await pause(message).then(message.react('⏯️'))
    }
}