const { start } = require('../music')

module.exports = {
    data: {
        name: 'start',
        desc: 'Substitui a música atual pelo argumento desse comando.'
    },
    async execute(message, args) {
        start(message, args)
    }
}