import {images, sendMessage} from "../responses.js"

export const command = {
	data: {
        name: 'ping',
        desc: 'Responde com Pong!'
    },
	async execute(message) {
		try {
			const randomThumb = images[Math.floor(Math.random() * images.length)]
			await sendMessage(message, "🏓 Pong!", "Eu estou online!", randomThumb)
		} catch (err) {
			await message.channel.send('Pong!')
		}
	},
}