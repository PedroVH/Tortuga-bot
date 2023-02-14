const { start } = require('../music')

module.exports = {
    data: {
        name: 'jilipoca',
        desc: 'A JILIPOCA PIA.'
    },
    async execute(message) {
        await start(message, 'https://www.youtube.com/watch?v=CY9MWObHNhM')
    }
}