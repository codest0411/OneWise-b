type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const format = (level: LogLevel, message: string, meta?: Record<string, unknown> | string) => {
  const timestamp = new Date().toISOString()
  if (meta) {
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`
  }
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown> | string) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(format('debug', message, meta))
    }
  },
  info(message: string, meta?: Record<string, unknown> | string) {
    console.info(format('info', message, meta))
  },
  warn(message: string, meta?: Record<string, unknown> | string) {
    console.warn(format('warn', message, meta))
  },
  error(message: string, meta?: Record<string, unknown> | string) {
    console.error(format('error', message, meta))
  },
}
