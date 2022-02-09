const { loop } = require('../music')

module.exports = {
    data: {
        name: 'loop',
        desc: 'Bota a música atual em loop.'
    },
    async execute(message, args) {
        await loop(message).then(message.react('🔁'))
    }
}