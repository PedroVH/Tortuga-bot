import { sendHelp } from '../responses.js'

export const command = {
    data: {
        name: 'help',
        desc: 'Descrição do funcionamento e comandos do Tortuga.'
    },
    async execute(message) {
        await sendHelp(message)
    }
}