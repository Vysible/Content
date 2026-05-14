import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  name: 'vysible',
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:dd.mm.yyyy HH:MM:ss',
        ignore: 'pid,hostname',
        messageKey: 'msg',
      },
    },
  }),
  redact: {
    paths: ['email', 'password', 'name', 'encryptedKey', '*.email', '*.password', '*.name'],
    censor: '[REDACTED]',
  },
})
