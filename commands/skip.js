const { skip } = require('../music')

module.exports = {
    data: {
        name: 's',
        desc: 'Pula para o próximo item da playlist.'
    },
    async execute(message, args) {
        await skip(message)
        message.react('⏭️')
    }
}