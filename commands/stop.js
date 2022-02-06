const { stop } = require('../music')

module.exports = {
    data: {
        name: 'stop',
        desc: 'Zera a playlist e para a música.'
    },
    async execute(message, args) {
        await stop(message)
        message.react('⏹️')
    }
}