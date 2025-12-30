'use client'

import { useEffect, useState } from 'react'
import { Database, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

interface DatabaseStatus {
  connected: boolean
  proxyRequired: boolean
  proxyRunning?: boolean
  status: string
  action?: string | null
}

/**
 * DatabaseStatusIndicator
 *
 * Visual indicator for database connection status (development only)
 *
 * Features:
 * - Shows green badge when connected (fades after 3 seconds)
 * - Shows persistent red banner when disconnected
 * - Auto-checks every 30 seconds
 * - Manual "Check again" button
 * - Specific instructions for Cloud SQL Proxy issues
 */
export function DatabaseStatusIndicator() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [showSuccess, setShowSuccess] = useState(true)

  const checkStatus = async () => {
    try {
      setIsChecking(true)
      const res = await fetch('/api/status/database')
      const data = await res.json()
      setStatus({
        connected: data.success,
        proxyRequired: data.database.proxyRequired,
        proxyRunning: data.database.proxyRunning,
        status: data.database.status,
        action: data.action
      })

      // If connected, show success briefly then hide
      if (data.success) {
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Failed to check database status:', error)
      setStatus({
        connected: false,
        proxyRequired: false,
        status: 'Failed to check status',
        action: null
      })
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Check on mount
    checkStatus()

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!status) return null

  // Show success indicator briefly
  if (status.connected && showSuccess) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-green-800 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
        <CheckCircle className="h-4 w-4" />
        <span>Database connected</span>
      </div>
    )
  }

  // Don't show anything if connected after success message faded
  if (status.connected) {
    return null
  }

  // Show error banner if disconnected
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-red-50 border-2 border-red-200 rounded-lg p-4 max-w-md shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-900 mb-1">
            Database Connection Error
          </h3>
          <p className="text-sm text-red-800 mb-2">{status.status}</p>

          {status.proxyRequired && !status.proxyRunning && (
            <div className="mb-3">
              <p className="text-sm text-red-700 mb-2">
                The Cloud SQL Proxy is not running. Start it with:
              </p>
              <code className="block bg-red-100 text-red-900 px-3 py-2 rounded text-xs font-mono mb-2 select-all">
                npm run proxy:start
              </code>
              <p className="text-xs text-red-600">
                Or use <code className="bg-red-100 px-1 py-0.5 rounded">npm run dev:full</code> to auto-start
              </p>
            </div>
          )}

          <button
            onClick={checkStatus}
            disabled={isChecking}
            className="flex items-center gap-1.5 text-sm text-red-700 hover:text-red-900 disabled:opacity-50 font-medium transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check again'}
          </button>
        </div>
      </div>
    </div>
  )
}
