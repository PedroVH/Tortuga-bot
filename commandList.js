const constants = require('./constants.json')

const commandList = new Map([
    [constants.commands.ping, {
        description: "Comando pra ver se o bot está online.",
        example: ".ping"
    }],
    [constants.commands.clear, {
        description: "Limpa 100 últimas mensagens (até 14 dias atrás)." + 
                     "\n_Também pode ser seguido pelo número de mensagens a serem deletadas._" + 
                     "\n_Ex.: .cls 2_",
        example: ".clear" + 
                 "\n.clear <número>",
        error_description: "O comando deve ser seguido de um **número**."
    }],
    [constants.commands.join, {
        description: "Faz o bot entrar na call :)",
        example: ".join"
    }],
    [constants.commands.leave, {
        description: "Expulsa o bot :(",
        example: ".leave"
    }], 
    [constants.commands.stop, {
        description: "Para a música e esvazia a playlist.",
        example: ".stop",
        error_description: "A playlist já está vazia."
    }],
    [constants.commands.skip, {
        description: "Pula pra próxima música.",
        example: ".skip"
    }],
    [constants.commands.pause, {
        description: "Pausa/despausa a música.",
        example: ".pause",
        error_description: "Não há músicas a serem pausadas."
    }],
    [constants.commands.playlist, {
        description: "Lista a playlist atual.",
        example: ".playlist"
    }],
    [constants.commands.start, {
        description: "Seguido de pesquisa ou link adiciona a música no início da playlist e começa a tocar ela.",
        example: ".start https://www.youtube.com/watch?v=dQw4w9WgXcQ\n.start Never Gonna Give You Up",
        error_description: "Deve haver um espaço entre .start e a pesquisa ou link do vídeo."
    }],
    [constants.commands.drop, {
        description: "A tortuga manda um drop.",
        example: ".drop"
    }],
    [constants.commands.help, {
        description: "Mostra a lista de comandos. \n_Seguido de um comando mostra um exemplo de uso do comando. Ex.: .help cls_",
        example: ".drop"
    }]
]);

module.exports = { commandList };