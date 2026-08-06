import { config } from '../config'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  correlationId?: string
}

class Logger {
  private context: Record<string, unknown>

  constructor(context: Record<string, unknown> = {}) {
    this.context = context
  }

  private format(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      context: { ...this.context, ...entry.context },
      correlationId: entry.correlationId,
    })
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug']
    const currentLevel = config.nodeEnv === 'production' ? 'warn' : 'debug'
    return levels.indexOf(level) <= levels.indexOf(currentLevel)
  }

  error(message: string, context?: Record<string, unknown>, correlationId?: string) {
    if (this.shouldLog('error')) {
      console.error(this.format({ timestamp: new Date().toISOString(), level: 'error', message, context, correlationId }))
    }
  }

  warn(message: string, context?: Record<string, unknown>, correlationId?: string) {
    if (this.shouldLog('warn')) {
      console.warn(this.format({ timestamp: new Date().toISOString(), level: 'warn', message, context, correlationId }))
    }
  }

  info(message: string, context?: Record<string, unknown>, correlationId?: string) {
    if (this.shouldLog('info')) {
      console.info(this.format({ timestamp: new Date().toISOString(), level: 'info', message, context, correlationId }))
    }
  }

  debug(message: string, context?: Record<string, unknown>, correlationId?: string) {
    if (this.shouldLog('debug')) {
      console.debug(this.format({ timestamp: new Date().toISOString(), level: 'debug', message, context, correlationId }))
    }
  }

  child(context: Record<string, unknown>): Logger {
    return new Logger({ ...this.context, ...context })
  }
}

export const logger = new Logger()
export default logger