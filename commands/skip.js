import {skip} from "../music.js"

export const command = {
    data: {
        name: 's',
        desc: 'Pula para o próximo item da playlist.'
    },
    async execute(message, args) {
        await skip(message, args[0]).then(message.react('⏭️'))
    }
}