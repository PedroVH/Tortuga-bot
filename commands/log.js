import {flags, guildAudioPlayer, isBotInVoiceChannel, isQueueEmpty, queues} from '../music.js'

export const command = {
    data: {
        name: 'log',
        desc: 'Logs status on the console.',
        hidden: true
    },
    async execute(message) {
        const id = message.guild.id
        let log = `[${message.guild.name}] Status`

        log += `\nVoice channel: ${isBotInVoiceChannel(id) ? 'Connected.' : 'Disconnected.'}`
        log += `\n        Queue: ${isQueueEmpty(id) ? `Empty.` : `${queues[id]?.length} track(s)`}`
        log += `${guildAudioPlayer[id] ?
            `\n       Player: ${guildAudioPlayer[id]?.state?.status}` : ''}`
        log += `${flags[id] ?
            `\n        Flags: ${JSON.stringify(flags[id])}` : ''}`

        console.log(log)
    },
}
