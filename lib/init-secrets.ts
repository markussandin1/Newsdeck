/**
 * Initialize secrets from GCP Secret Manager at application startup
 * This should be called as early as possible in the application lifecycle
 */

import { initializeSecrets } from './secrets'
import { initializeAuthSecrets } from '@/auth'

let initialized = false

export async function initializeApplicationSecrets() {
  // Prevent multiple initializations
  if (initialized) {
    console.log('Secrets already initialized, skipping...')
    return
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Development mode: Using environment variables for secrets')
    initialized = true
    return
  }

  console.log('Production mode: Initializing secrets from GCP Secret Manager...')

  try {
    // Initialize all secrets in parallel
    await Promise.all([
      initializeSecrets(),
      initializeAuthSecrets()
    ])

    console.log('✓ All secrets initialized successfully from Secret Manager')
    initialized = true
  } catch (error) {
    console.error('❌ Failed to initialize secrets:', error)
    throw error
  }
}

// Auto-initialize if in production environment
// This runs when the module is imported
if (process.env.NODE_ENV === 'production') {
  initializeApplicationSecrets().catch((error) => {
    console.error('Fatal: Could not initialize secrets:', error)
    // Don't exit process - let the app try to start and fail gracefully
  })
}
