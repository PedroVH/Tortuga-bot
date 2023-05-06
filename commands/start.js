import {start} from '../music.js'

export const command = {
    data: {
        name: 'start',
        desc: 'Substitui a música atual pelo argumento desse comando.',
        requiresVoiceChannel: true
    },
    async execute(message, args) {
        await start(message, args.join(" "))
    }
}