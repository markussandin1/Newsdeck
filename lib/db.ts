// Use PostgreSQL - DATABASE_URL is REQUIRED in production
// During build, we allow fallback to avoid build errors
// But at runtime, we log errors if DATABASE_URL is missing

import { persistentDb as pgDb } from './db-postgresql'

// Create a wrapper that logs database connection attempts
const dbWrapper = new Proxy(pgDb, {
  get(target, prop) {
    // Check DATABASE_URL at runtime for each operation
    if (!process.env.DATABASE_URL && typeof target[prop as keyof typeof target] === 'function') {
      console.error(`❌ DATABASE ERROR: DATABASE_URL not set when calling db.${String(prop)}()`)
      console.error('Environment variables:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATA')))
    }

    const value = target[prop as keyof typeof target]
    if (typeof value === 'function') {
      return value.bind(target)
    }
    return value
  }
})

export const db = dbWrapper