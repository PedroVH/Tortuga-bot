import {queues} from '../music.js'
import {sendMessage, sendPlaylist} from '../responses.js'

export const command = {
    data: {
        name: 'queue',
        desc: 'Lista os vídeos da playlist atual.',
        requiresVoiceChannel: true
    },
    async execute(message) {
        const queue = queues[message.guild.id]
        if (!queue || queue.length === 0) {
            await sendMessage(message, 'A playlist está vazia!', null, null, false)
            return
        }
        await sendPlaylist(message, 'Playlist atual: ', queue)
    }
}