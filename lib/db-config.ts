// Database configuration switcher
// This file allows easy switching between different database providers

import { persistentDb as vercelKvDb } from './db-persistent'

// Import other database implementations as needed
// import { supabaseDb } from './db-supabase'
// import { planetscaleDb } from './db-planetscale'

// Determine which database to use based on environment variables
const getActiveDatabase = () => {
  // Check for Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    console.log('🟢 Using Vercel KV database')
    return vercelKvDb
  }
  
  // Check for other database providers...
  // if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  //   console.log('🟢 Using Supabase database')
  //   return supabaseDb
  // }
  
  // Default to Vercel KV with in-memory fallback
  console.log('🟡 No external database configured. Using in-memory fallback for development.')
  return vercelKvDb
}

// Export the active database instance
export const activeDb = getActiveDatabase()

// Re-export as default db interface
export const db = activeDb

// Helper function to get database status
export const getDatabaseStatus = async () => {
  try {
    const isConnected = await activeDb.isConnected()
    const type = process.env.KV_REST_API_URL ? 'Vercel KV' : 'In-Memory Fallback'
    
    return {
      connected: isConnected,
      type,
      status: isConnected ? 'Connected' : 'Using fallback storage'
    }
  } catch (error) {
    return {
      connected: false,
      type: 'Unknown',
      status: 'Error checking connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
