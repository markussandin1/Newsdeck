/**
 * Klient-logger med samma ytliga API som server-loggern, men fungerar i
 * webbläsaren. Skickar bara till console — om vi senare vill koppla in
 * Sentry/Datadog/etc gör vi det här pa ett stalle.
 *
 * I produktion skickas inga debug/info-loggar — bara warn och error.
 * I dev visas alla.
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type Extra = Record<string, unknown>

const isProd = typeof window !== 'undefined' && process.env.NODE_ENV === 'production'

function emit(level: LogLevel, message: string, extra?: Extra) {
  if (isProd && (level === 'debug' || level === 'info')) {
    return
  }

  const args: unknown[] = [`[${message}]`]
  if (extra) args.push(extra)

  switch (level) {
    case 'error':
      console.error(...args)
      break
    case 'warn':
      console.warn(...args)
      break
    default:
      console.log(...args)
  }
}

export const clientLogger = {
  debug: (message: string, extra?: Extra) => emit('debug', message, extra),
  info: (message: string, extra?: Extra) => emit('info', message, extra),
  warn: (message: string, extra?: Extra) => emit('warn', message, extra),
  error: (message: string, extra?: Extra) => emit('error', message, extra),
}
