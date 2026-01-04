// Use PostgreSQL only. Mock DB is disabled.
import { persistentDb as pgDb } from './db-postgresql'

// Fail fast if DATABASE_URL is missing on the server
if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Mock database is disabled.')
}

// Bind methods to preserve `this` context
export const db = new Proxy(pgDb, {
  get(target, prop) {
    const value = target[prop as keyof typeof target]
    if (typeof value === 'function') {
      return value.bind(target)
    }
    return value
  }
})

export const isUsingMockData = () => false
