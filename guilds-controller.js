import {join} from 'node:path'
import {Low} from 'lowdb'
import {JSONFile} from 'lowdb/node'

import {config} from 'dotenv'
import fs from 'fs'

config()

const PATH = process.env['TORTUGA_BOT_STORAGE']
const GUILDS_FILE = `guilds.json`

if (!fs.existsSync(PATH)) {
    fs.mkdirSync(PATH)
    console.log(`Created storage folder ${PATH}`)
}

const file = join(PATH, GUILDS_FILE)
const adapter = new JSONFile(file)
const guildsDb = new Low(adapter, { guilds: '[]' })

export async function readGuild(id) {
    await guildsDb.read()

    let map = new Map(JSON.parse(guildsDb.data.guilds))
    return map.get(id)
}

export async function writeGuild(id, guild) {
    let map = new Map(JSON.parse(guildsDb.data.guilds))
    map.set(id, guild)
    guildsDb.data.guilds = JSON.stringify(Array.from(map.entries()))

    await guildsDb.write()
}
