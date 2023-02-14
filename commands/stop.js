const { stop } = require('../music')

module.exports = {
    data: {
        name: 'stop',
        desc: 'Zera a playlist e para a música.'
    },
    async execute(message) {
        await stop(message).then(message.react('⏹️'))
    }
}