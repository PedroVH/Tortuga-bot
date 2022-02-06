const { MessageEmbed, MessageAttachment } = require('discord.js')
const messageColor = '#008000'
const errorColor = '#C70039'

const images = [
    "https://i.postimg.cc/CM9RFyjy/turt-phone.png",         // profile          // 0
    "https://i.postimg.cc/QMDNFhMP/turt-curse.png",         // upset            // 1
    "https://i.postimg.cc/Dys80CgS/turt-sad.png",           // upset            // 2
    "https://i.postimg.cc/pLHyFDGq/turt-sight.png",         // upset            // 3           
    "https://i.postimg.cc/CKM1vwV8/turt-think.png",         // think            // 4
    "https://i.postimg.cc/MZnc2Zfb/turt-romantic.png",      // love             // 5
    "https://i.postimg.cc/y6pNvMfg/turt-blush.png",         // love             // 6
    "https://i.postimg.cc/fT0M5Jtp/turt-in-love.png",       // love             // 7
    "https://i.postimg.cc/2SQrRMxx/turt-kiss.png",          // love             // 8
    "https://i.postimg.cc/wB9H62fY/turt-kiss3.png",         // love             // 9
    "https://i.postimg.cc/6q4xHm3n/turt-love.png",          // love             // 10
    "https://i.postimg.cc/9z35sYRS/turt-love-letter.png",   // love             // 11
    "https://i.postimg.cc/63mNfX9B/turt-love3.png",         // love             // 12
    "https://i.postimg.cc/90DC6fx4/turt-horny.png",         // horny            // 13
    "https://i.postimg.cc/8cxNNV3Z/turt-hot.png",           // horny            // 14
    "https://i.postimg.cc/d0nFDCpk/turt-laugh.png",         // happy            // 15
    "https://i.postimg.cc/pTqdN4RS/turt-balloon.png",       // happy            // 16
    "https://i.postimg.cc/4dLX2c1k/turt-happy.png",         // happy            // 17
    "https://i.postimg.cc/2yt8yWqF/turt-birthday.png",      // happy            // 18
    "https://i.postimg.cc/zDQJnnBT/turt-hungry.png",        // happy            // 19
    "https://i.postimg.cc/t4NJtY8y/turt-sweet.png",         // happy            // 20
    "https://i.postimg.cc/tgzqPwZg/turt-cowboy.png",        // happy            // 21
    "https://i.postimg.cc/C11g81pv/turt-little.png",        // happy            // 22
    "https://i.postimg.cc/NjqBnBRM/turt-king.png",          // happy            // 23
    "https://i.postimg.cc/XYd7Npnd/turt-cool.png",          // happy            // 24
    "https://i.postimg.cc/ncsh535d/turt-cat.png",           // happy            // 25
    "https://i.postimg.cc/85P1b4Mm/turt-dog.png",           // happy            // 26
    "https://i.postimg.cc/28PSf4NC/turt-cold.png",                              // 27
]

async function sendError (message, title="Erro!", description="", thumbnail=null, hasThumbnail=true) {
    const embed = new MessageEmbed().setTitle(title)
    .setDescription(description)
    .setColor(errorColor)
    
    if (hasThumbnail) embed.setThumbnail(thumbnail ? thumbnail : getRandomUpset())
    
    message.channel.send({ embeds: [embed] })
}

async function sendMessage (message, title, description="", thumbnail=null, hasThumbnail=true) {
    const embed = new MessageEmbed().setTitle(title)
                                    .setDescription(description)
                                    .setColor(messageColor)

    if (hasThumbnail) embed.setThumbnail(thumbnail ? thumbnail : getRandomHappy())

    message.channel.send({ embeds: [embed] })
}

async function sendPlaylist (message, title, playlist) {
    let description = ''
    for (let i = 0; i < playlist.length; i++) {
        const element = playlist[i]
        description = description.concat(`${i + 1}. ${element.title}\n`)
    }
    const embed = new MessageEmbed().setTitle(title)
                                    .setDescription(description)
                                    .setColor(messageColor)
                                    .setThumbnail(images[0])

    message.channel.send({ embeds: [embed] })
}

const getRandomUpset = () => images[getRandomInteger(1, 5)]
const getRandomRomantic = () => images[getRandomInteger(6, 13)]
const getRandomHorny = () => images[getRandomInteger(14, 15)]
const getRandomHappy = () => images[getRandomInteger(16, 26)]
const getRandomInteger = (min, max) => Math.floor(Math.random() * (max - min) ) + min

module.exports = {
    sendError,
    sendMessage,
    sendPlaylist,
    getRandomUpset,
    getRandomRomantic,
    getRandomHorny,
    getRandomHappy,
    images
}