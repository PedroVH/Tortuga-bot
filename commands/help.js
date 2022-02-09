const { sendHelp } = require('../responses')

module.exports = {
    data: {
        name: 'help',
        desc: 'Descrição do funcionamento e comandos do Tortuga.'
    },
    async execute(message, args) {
        await sendHelp(message)
    }
}