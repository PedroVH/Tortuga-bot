const { sendError } = require('./responses')
const fs = require('fs')

const commands = []

function loadCommands() {
    console.log("Carregando os comandos...")
    const files = fs.readdirSync('./commands').filter(file => file.endsWith('.js'))

    for (const file of files) {
        const command = require(`./commands/${file}`)
        commands[command.data.name] = command
        console.log(command.data.name)
    }
}

async function handleCommand(message, text) {
    let request = text.split(" ")
    let name = request[0]
    let args = request.slice(1)

    const command = commands[name]
	if (!command) return
    try {
        await command.execute(message, args)
    } catch (error) {
        console.error(error)
        await sendError(message, undefined, "Houve um erro ao executar este comando.")
    }
}

module.exports = { handleCommand, loadCommands }