const { queues } = require('../music')
const { sendError, sendPlaylist } = require('../responses')

module.exports = {
    data: {
        name: 'queue',
        desc: 'Lista os vídeos da playlist atual.'
    },
    async execute(message, args) {
        const queue = queues[message.guild.id]
        if (!queue) {
            await sendError(message, undefined, "A playlist está vazia.")
            return
        }
        await sendPlaylist(message, "Playlist atual: ", queue)
    }
}