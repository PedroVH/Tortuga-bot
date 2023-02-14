const { join } = require('../music')

module.exports = {
    data: {
        name: 'join',
        desc: 'O Tortuga se conecta na chamada de voz.'
    },
    async execute(message) {
        await join(message).then(message.react('✨'))
    }
}