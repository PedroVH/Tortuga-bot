const { pause } = require('../music')

module.exports = {
    data: {
        name: 'p',
        desc: 'Pausa/despausa a reprodução da música.'
    },
    async execute(message) {
        await pause(message).then(message.react('⏯️'))
    }
}