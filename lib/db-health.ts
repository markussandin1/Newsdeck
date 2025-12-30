/**
 * Database Health Check with Cloud SQL Proxy Detection
 *
 * Provides detailed database connection status including:
 * - Connection state
 * - Proxy requirement detection (localhost connections)
 * - Specific error analysis (ECONNREFUSED = proxy not running)
 * - Actionable feedback for developers
 */

import { getDatabaseStatus } from './db-config'

export interface DatabaseHealth {
  connected: boolean
  type: string
  status: string
  error?: string
  proxyRequired: boolean
  proxyRunning?: boolean
}

/**
 * Get detailed database health information with proxy detection
 *
 * @returns DatabaseHealth object with connection status and proxy information
 */
export async function getDetailedDatabaseHealth(): Promise<DatabaseHealth> {
  const basicStatus = await getDatabaseStatus()

  // Check if we're using localhost (requires Cloud SQL Proxy)
  const dbUrl = process.env.DATABASE_URL || ''
  const usesLocalhost = dbUrl.includes('localhost:5432') || dbUrl.includes('127.0.0.1:5432')

  // If using localhost and not connected, analyze the error
  if (usesLocalhost && !basicStatus.connected) {
    // Connection errors that indicate proxy issues
    const isProxyIssue = basicStatus.error?.includes('ECONNREFUSED') ||
                         basicStatus.error?.includes('ECONNRESET') ||
                         basicStatus.error?.includes('Connection refused') ||
                         basicStatus.error?.includes('connect ECONNREFUSED') ||
                         basicStatus.error?.includes('read ECONNRESET')

    return {
      ...basicStatus,
      proxyRequired: true,
      proxyRunning: false,
      status: isProxyIssue
        ? 'Cloud SQL Proxy not running'
        : basicStatus.status
    }
  }

  // If using localhost and connected, proxy is running
  if (usesLocalhost && basicStatus.connected) {
    return {
      ...basicStatus,
      proxyRequired: true,
      proxyRunning: true
    }
  }

  // Direct connection (not using proxy)
  return {
    ...basicStatus,
    proxyRequired: false,
    proxyRunning: undefined
  }
}
