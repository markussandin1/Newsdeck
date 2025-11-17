import { inspect } from 'node:util'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type Extra = Record<string, unknown>

const serializeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    const errorObj: Record<string, unknown> = {
      name: value.name,
      message: value.message,
      stack: value.stack
    }
    // Handle error.cause if it exists (ES2022+)
    const cause = (value as Error & { cause?: unknown }).cause
    if (cause) {
      errorObj.cause = serializeValue(cause)
    }
    return errorObj
  }
  if (Array.isArray(value)) {
    return value.map(serializeValue)
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = serializeValue(val)
    }
    return result
  }
  return value
}

const toExtras = (extra?: Extra | Record<string, unknown>): Extra | undefined => {
  if (!extra) return undefined
  const result: Extra = {}
  for (const [key, value] of Object.entries(extra)) {
    result[key] = serializeValue(value)
  }
  return result
}

const buildPayload = (level: LogLevel, message: string, extra?: Extra) => ({
  level,
  message,
  timestamp: new Date().toISOString(),
  ...extra
})

const log = (level: LogLevel, message: string, extra?: Extra) => {
  const payload = buildPayload(level, message, toExtras(extra))
  const serialized = JSON.stringify(payload)

  switch (level) {
    case 'debug':
    case 'info':
      console.log(serialized)
      break
    case 'warn':
      console.warn(serialized)
      break
    case 'error':
      console.error(serialized)
      break
    default:
      console.log(serialized)
  }
}

export const logger = {
  debug: (message: string, extra?: Extra) => log('debug', message, extra),
  info: (message: string, extra?: Extra) => log('info', message, extra),
  warn: (message: string, extra?: Extra) => log('warn', message, extra),
  error: (message: string, extra?: Extra) => log('error', message, extra),
  inspect: (label: string, value: unknown, level: LogLevel = 'debug') => {
    log(level, `${label}: ${inspect(value, { depth: 3 })}`)
  }
}

export type Logger = typeof logger
