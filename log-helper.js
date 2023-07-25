import logger from 'nodejslogger'

if(!process.env.TORTUGA_BOT_LOG_FILE) process.env.TORTUGA_BOT_LOG_FILE = 'server.log'
logger.init({'file':process.env.TORTUGA_BOT_LOG_FILE, 'mode':'DIE'})

export function info(content, message) {
    logger.info(`${message ? `[${message.guild.name}]` : ''} ${content}`)
}

export function debug(content, message) {
    logger.debug(`${message ? `[${message.guild.name}]` : ''} ${content}`)
}

export function error(err, message, resume) {
    logger.error(`${message ? `[${message.guild.name}] ` : ''}${resume ? `${resume}: ` : ''}${err ? err : ''}`)
}