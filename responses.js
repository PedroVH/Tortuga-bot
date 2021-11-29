const constants = require("./constants.json");
const Discord = require('discord.js');
const {commandList} = require('./commandList') 
const message = '#008000';
const error = '#C70039';
const warning = error;

const notInVoiceChannel = getWarning("Você tem que estar conectado em um canal de voz.");
const commandNotFound = getWarning("Este comando não existe!", "Tente .help para ver a lista de comandos que eu posso fazer.");

module.exports = { 
    getHelp, 
    getCommandHelp,
    getMessage,
    getWarning,
    getError,
    notInVoiceChannel,
    commandNotFound
};

function getHelp() {
    prefixos_fmt = '';
    constants.prefixos.forEach(pre => prefixos_fmt = prefixos_fmt.concat(" " + pre));

    fields = [];
    for(const command of commandList) {
        name_fmt = '';
        command[0].forEach(n => name_fmt = name_fmt.concat(n + "  "));
        fields.push({
            name: name_fmt,
            value: command[1].description
        })
    }
    const embed = new Discord.MessageEmbed()
        .setTitle("Help")
        .setColor(message)
        .setDescription("Para colocar uma música, é só enviar o link ou a pesquisa neste canal!" + 
                        "\n\nLinks de playlists funcionam também ;)" +
                        "\n\n_Exemplo de link: https://www.youtube.com/watch?v=dQw4w9WgXcQ_" +
                        "\n_Exemplo de pesquisa: Never Gonna Give You Up_" +
                        "\n\n**Prefixos: **" + prefixos_fmt + "\n" +
                        "\n**Lista de comandos: **\n")
        .addFields(fields)
        .setFooter("Se tiver dúvidas, fale com Pedrones#1832");

    return embed;
}

function getCommandHelp(command) {
    command = command.trim();
    commandTitles = [];
    for(const key of commandList.keys()) {
        if(key.includes(command)) {
            commandTitles = key;
            break;
        }
    }
    let cmd = commandList.get(commandTitles);
    if(!cmd) {
        return commandNotFound;
    }
    const embed = new Discord.MessageEmbed()
        .setTitle(command)
        .setColor(message)
        .setDescription(cmd.description)
        .addField("Exemplo", cmd.example)
        .setFooter("Se tiver dúvidas, fale com Pedrones#1832");

    return embed;
}

function getMessage(title, description) {
    const embed = new Discord.MessageEmbed()
    .setTitle(title)
    .setColor(message);

    if(description) embed.setDescription(description);

    return embed;
}

function getError(err, description, comando, footer, title = "Erro!") {
    if(err && !description) description = err.name + "\n" + err.message;
    const embed = new Discord.MessageEmbed()
        .setTitle(title)
        .setColor(error);

    if(description) embed.setDescription(description);

    if(!footer){
        if(!comando) comando = "<nome do comando>";
        footer = "Para mais informações sobre este comando, digite '.help " + comando + "'";
    }
    embed.setFooter(footer);
    return embed;
}

function getWarning(title, description) {
    const embed = new Discord.MessageEmbed()
        .setTitle(title)
        .setColor(warning);

    if(description) embed.setDescription(description);
    
    return embed;
}
