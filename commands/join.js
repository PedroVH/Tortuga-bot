const { join } = require('../music')

module.exports = {
    data: {
        name: 'join',
        desc: 'O Tortuga se conecta na chamada de voz.'
    },
    async execute(message, args) {
        message.react('✨')
        await join(message)
    }
}