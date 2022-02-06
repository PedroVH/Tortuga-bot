module.exports = {
    data: {
        name: 'cls',
        desc: 'Exclui a última mensagem. Seguido de um número *n*, deleta as últimas *n* mensagens do canal.'
    },
    async execute(message, args) {
        let num = 1
        if (args && args.length == 1 && !isNaN(args[0])) num = Number.parseInt(args[0])
        if (num >= 100) num = 99
        await message.channel.bulkDelete(++num, true)
    }
}