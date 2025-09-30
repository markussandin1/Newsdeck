// Database configuration - PostgreSQL only
// This file provides the active database instance for the application

import { persistentDb as pgDb } from './db-postgresql'

// Check if DATABASE_URL is configured
if (!process.env.DATABASE_URL) {
  console.error('❌ CRITICAL: DATABASE_URL environment variable is not set!')
  console.error('The application REQUIRES a PostgreSQL database to function.')
  console.error('Please set DATABASE_URL in your environment variables.')
} else {
  console.log('🟢 PostgreSQL database configured')
}

// Export the PostgreSQL database instance
export const activeDb = pgDb

// Re-export as default db interface
export const db = activeDb

// Helper function to get database status
export const getDatabaseStatus = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      return {
        connected: false,
        type: 'PostgreSQL',
        status: 'DATABASE_URL not configured',
        error: 'Missing DATABASE_URL environment variable'
      }
    }

    const isConnected = await activeDb.isConnected()

    return {
      connected: isConnected,
      type: 'PostgreSQL',
      status: isConnected ? 'Connected' : 'Connection failed'
    }
  } catch (error) {
    return {
      connected: false,
      type: 'PostgreSQL',
      status: 'Error checking connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
