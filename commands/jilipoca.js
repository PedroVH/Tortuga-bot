import {start} from '../music.js'

export const command = {
    data: {
        name: 'jilipoca',
        desc: 'A JILIPOCA PIA.',
        requiresVoiceChannel: true
    },
    async execute(message) {
        await start(message, 'https://www.youtube.com/watch?v=CY9MWObHNhM')
    }
}