// Use PostgreSQL when DATABASE_URL is set, otherwise use mock data for local development
// During build, we allow fallback to avoid build errors

import { persistentDb as pgDb } from './db-postgresql'
import { mockDb } from './mock-data'

const USE_MOCK = !process.env.DATABASE_URL

// Log which database mode we're using
if (typeof window === 'undefined') {
  // Only log on server
  if (USE_MOCK) {
    console.log('📦 Using MOCK database (DATABASE_URL not set)')
    console.log('   Local development mode - data is ephemeral')
  } else {
    console.log('🗄️ Using PostgreSQL database')
  }
}

// Select the appropriate database implementation
const selectedDb = USE_MOCK ? mockDb : pgDb

// Create a wrapper that logs database connection attempts when using PostgreSQL without URL
const dbWrapper = USE_MOCK
  ? selectedDb
  : new Proxy(pgDb, {
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

// Export helper to check if we're using mock data
export const isUsingMockData = () => USE_MOCK
