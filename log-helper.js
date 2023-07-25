const now = () => {
    return new Date().toISOString().slice(0, 23).replace('T', ' ')
}

export function log(content) {
    console.log(`${now()} | ${content}`)
}

export function info(message, content) {
    log(`[INFO]  [${message.guild.name}] ${content}`)
}

export function debug(message, content) {
    log(`[DEBUG] [${message.guild.name}] ${content}`)
}

export function error(err, message, resume) {
    console.error(`${now()} - [ERROR] ${message ? `[${message.guild.name}] ` : ""}${resume ? `${resume}: ` : ""}${err ? err : ""}`)
}