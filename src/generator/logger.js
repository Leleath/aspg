const { sendToMainWindow } = require('../windowManager');

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, json } = format;

function sendMessage(info) {
    sendToMainWindow('generatorLog', {
        type: 'log',
        message: `${info.timestamp} ${info.message}`
    });
}

class SendMessageTransport extends transports.Console {
    log(info, callback) {
        super.log(info, () => {
            sendMessage(info);
            callback();
        });
    }
}

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(metadata).length) {
        msg += ` - ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        timestamp({ format: 'HH:mm:ss' }),
        format.errors({ stack: true }),
        format.splat(),
        process.env.NODE_ENV === 'production' ? json() : combine(colorize(), logFormat)
    ),
    transports: [
        new SendMessageTransport(),
        // new transports.Console(),
        // new transports.File({ filename: 'package-generator.log' })
    ]
});

export default logger;