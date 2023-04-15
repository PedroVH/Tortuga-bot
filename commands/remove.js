import {sendError} from "../responses.js"
import {remove} from "../music.js"

export const command = {
    data: {
        name: 'rm',
        desc: 'Remove uma música da playlist. Deve ser seguido do número da posição da música, e opcionalmente, o número de quantos remover a partir desta posição.'
    },
    async execute(message, args) {
        if(!args || !args[0])
            return await sendError(message, "Você deve enviar o número da música a ser removida na fila!", "Exemplo:\n.rm 2(Posição da música em .queue)\n\tou\n.rm 2 5 (Posição da música e quantas remover a partir da posição)")

        let index = args[0]
        let count = args[1] ? args[1] : '1'

        if(isNaN(index) || index <= 1)
            return await sendError(message, "O número da posição da música deve ser um número maior que 1.")
        if(isNaN(count) || count < 1)
            return await sendError(message, "O número de quantas músicas remover deve ser um número maior que 0.")

        await remove(message, index - 1, count)
    }
}