const { sendMessage, images } = require('../responses')

module.exports = {
	data: {
        name: 'ping',
        desc: 'Responde com Pong!'
    },
	async execute(message, args) {
		try {
			const randomThumb = images[Math.floor(Math.random() * images.length)]
			await sendMessage(message, "🏓 Pong!", "Eu estou online!", randomThumb)
		} catch (err) {
			await message.channel.send('Pong!')
		}
	},
}