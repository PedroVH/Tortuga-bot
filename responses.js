import {commands} from "./commands.js"
import { EmbedBuilder } from 'discord.js'

const messageColor = '#008000'
// const warningColor = '#DBF227'
const errorColor = '#C70039'

export const images = [
    'https://i.postimg.cc/CM9RFyjy/turt-phone.png',         // profile          // 0
    'https://i.postimg.cc/QMDNFhMP/turt-curse.png',         // upset            // 1
    'https://i.postimg.cc/Dys80CgS/turt-sad.png',           // upset            // 2
    'https://i.postimg.cc/pLHyFDGq/turt-sight.png',         // upset            // 3           
    'https://i.postimg.cc/CKM1vwV8/turt-think.png',         // think            // 4
    'https://i.postimg.cc/MZnc2Zfb/turt-romantic.png',      // love             // 5
    'https://i.postimg.cc/y6pNvMfg/turt-blush.png',         // love             // 6
    'https://i.postimg.cc/fT0M5Jtp/turt-in-love.png',       // love             // 7
    'https://i.postimg.cc/2SQrRMxx/turt-kiss.png',          // love             // 8
    'https://i.postimg.cc/wB9H62fY/turt-kiss3.png',         // love             // 9
    'https://i.postimg.cc/6q4xHm3n/turt-love.png',          // love             // 10
    'https://i.postimg.cc/9z35sYRS/turt-love-letter.png',   // love             // 11
    'https://i.postimg.cc/63mNfX9B/turt-love3.png',         // love             // 12
    'https://i.postimg.cc/90DC6fx4/turt-horny.png',         // horny            // 13
    'https://i.postimg.cc/8cxNNV3Z/turt-hot.png',           // horny            // 14
    'https://i.postimg.cc/d0nFDCpk/turt-laugh.png',         // happy            // 15
    'https://i.postimg.cc/pTqdN4RS/turt-balloon.png',       // happy            // 16
    'https://i.postimg.cc/4dLX2c1k/turt-happy.png',         // happy            // 17
    'https://i.postimg.cc/2yt8yWqF/turt-birthday.png',      // happy            // 18
    'https://i.postimg.cc/zDQJnnBT/turt-hungry.png',        // happy            // 19
    'https://i.postimg.cc/t4NJtY8y/turt-sweet.png',         // happy            // 20
    'https://i.postimg.cc/tgzqPwZg/turt-cowboy.png',        // happy            // 21
    'https://i.postimg.cc/C11g81pv/turt-little.png',        // happy            // 22
    'https://i.postimg.cc/NjqBnBRM/turt-king.png',          // happy            // 23
    'https://i.postimg.cc/XYd7Npnd/turt-cool.png',          // happy            // 24
    'https://i.postimg.cc/ncsh535d/turt-cat.png',           // happy            // 25
    'https://i.postimg.cc/85P1b4Mm/turt-dog.png',           // happy            // 26
    'https://i.postimg.cc/28PSf4NC/turt-cold.png',                              // 27
]

export async function sendError (message, title='Erro!', description=null, thumbnail=null, hasThumbnail=true) {
    const embed = new EmbedBuilder().setTitle(title)
                                    .setColor(errorColor)

    if(description) embed.setDescription(description)
    if (hasThumbnail) embed.setThumbnail(thumbnail ? thumbnail : getRandomUpset())
    
    await message.channel.send({ embeds: [embed] })
}

export async function sendMessage (message, title, description=null, thumbnail=null, hasThumbnail=true) {
    const embed = new EmbedBuilder().setTitle(title)
                                    .setColor(messageColor)

    if(description) embed.setDescription(description)
    if (hasThumbnail) embed.setThumbnail(thumbnail ? thumbnail : getRandomHappy())

    await message.channel.send({ embeds: [embed] })
}

export async function sendVideoMessage (message, video, added = true) {
    let title = `🎶 ${video.duration ? `[${video.duration}]` : ''} ${video.title}`
    if(added) title += ' adicionado na playlist'

    let description = ''
    if(video.channel) description += `${video.channel}`

    const embed = new EmbedBuilder().setTitle(title)
        .setColor(messageColor)

    if(description) embed.setDescription(description)
    embed.setThumbnail(video.thumbnail ? video.thumbnail : getRandomHappy())

    await message.channel.send({ embeds: [embed] })
}

export async function sendPlaylist (message, title, playlist,  initialNumber= 1, thumbnail = images[0]) {
    const embed = new EmbedBuilder().setTitle(title)
                                    .setColor(messageColor)
                                    .setThumbnail(thumbnail)
    let description = ''
    for (let i = 0; i < playlist.length; i++) {
        const element = playlist[i]
        description = description.concat(`${initialNumber++}. ${element.title}\n`)
    }
    if(description)
        embed.setDescription(description)

    await message.channel.send({ embeds: [embed] })
}

export async function sendHelp (message) {
    let title = 'Help!'
    let description = 
    'Para tocar uma música, simplesmente cole o **link** do Youtube aqui.\n'+
    '_Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ _\n\n'+
    'Você também pode **pesquisar** pela música!\n'+
    '_Ex: Never Gonna Give You Up_\n\n'+
    'Também é possível adicionar **playlists** do Youtube, através de um link ou de um vídeo da playlist.\n\n'+
    'Algumas observações: \n' +
        '\t• Os vídeos/playlists não podem ser privados ou ter restrição de idade;\n' +
        '\t• Playlists não podem ser muito grandes, por conta de problemas técnicos;\n' +
        '\t• Playlists não podem ser mix do youtube, pois essas são privadas;\n\n'+
    '**Comandos:** _começe com \'.\' (ponto)_\n'
    const embed = new EmbedBuilder().setTitle(title)

    for (const key in commands) {
        if (Object.hasOwnProperty.call(commands, key)) {
            const element = commands[key]
            embed.addFields({ name: element.data.name, value: element.data.desc })
        }
    }
    embed.setDescription(description)
         .setColor(messageColor)
         .setThumbnail(getRandomHappy())

    await message.channel.send({ embeds: [embed] })
}

const getRandomUpset = () => images[getRandomInteger(1, 5)]
const getRandomRomantic = () => images[getRandomInteger(6, 13)]
const getRandomHorny = () => images[getRandomInteger(14, 15)]
const getRandomHappy = () => images[getRandomInteger(16, 26)]
const getRandomInteger = (min, max) => Math.floor(Math.random() * (max - min) ) + min