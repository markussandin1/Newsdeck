import { useEffect, useRef, useState, useCallback } from 'react'
import type { DashboardColumn, NewsItem } from '@/lib/types'
import type { ColumnData, ConnectionStatus } from '@/lib/dashboard/types'
import { isNewsItemNew } from '@/lib/time-utils'

interface UseDashboardPollingProps {
  columns: DashboardColumn[]
  updateColumnData: (updater: (prev: ColumnData) => ColumnData) => void
  onNewItems?: (columnId: string, items: NewsItem[]) => void
  geoFilters?: {
    regionCodes: string[]
    municipalityCodes: string[]
    showItemsWithoutLocation: boolean
  }
}

interface UseDashboardPollingReturn {
  connectionStatus: ConnectionStatus
  startPolling: (columnId: string) => void
  stopPolling: (columnId: string) => void
  stopAllPolling: () => void
}

/**
 * Hook for managing long-polling connections to column update endpoints.
 * Handles reconnection logic, abort controllers, and connection status.
 */
export function useDashboardPolling({
  columns,
  updateColumnData,
  onNewItems,
  geoFilters,
}: UseDashboardPollingProps): UseDashboardPollingReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const lastSeenTimestampsRef = useRef<Map<string, number>>(new Map())
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map())
  const isCleaningUpRef = useRef(false)
  const backoffRef = useRef<Map<string, number>>(new Map()) // per-column backoff (ms)
  const isPausedRef = useRef(false)

  const stopPolling = useCallback((columnId: string) => {
    const controller = abortControllersRef.current.get(columnId)
    if (controller) {
      controller.abort()
      abortControllersRef.current.delete(columnId)
    }

    const timeout = reconnectTimeoutsRef.current.get(columnId)
    if (timeout) {
      clearTimeout(timeout)
      reconnectTimeoutsRef.current.delete(columnId)
    }

    lastSeenTimestampsRef.current.delete(columnId)
    reconnectAttemptsRef.current.delete(columnId)
    backoffRef.current.delete(columnId)
  }, [])

  const stopAllPolling = useCallback(() => {
    isCleaningUpRef.current = true

    abortControllersRef.current.forEach((controller) => controller.abort())
    abortControllersRef.current.clear()

    reconnectTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    reconnectTimeoutsRef.current.clear()

    lastSeenTimestampsRef.current.clear()
    reconnectAttemptsRef.current.clear()
    backoffRef.current.clear()

    setConnectionStatus('disconnected')
  }, [])

  const startPolling = useCallback(async (columnId: string) => {
    if (isCleaningUpRef.current) {
      return
    }

    if (isPausedRef.current) {
      return
    }

    // Find the column
    const column = columns.find((c) => c.id === columnId)
    if (!column || column.isArchived) {
      return
    }

    // Clear any existing controller
    stopPolling(columnId)

    // Create new abort controller for this polling loop
    const controller = new AbortController()
    abortControllersRef.current.set(columnId, controller)

    setConnectionStatus('connected')
    backoffRef.current.set(columnId, 1000) // start with 1s backoff on error

    // Long polling loop
    while (!isCleaningUpRef.current && !controller.signal.aborted) {
      if (isPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }
      try {
        const lastSeen = lastSeenTimestampsRef.current.get(columnId)

        // Build query parameters
        const params = new URLSearchParams()

        if (lastSeen) {
          params.append('lastSeen', String(lastSeen))
        }

        // Add geographic filters
        if (geoFilters?.regionCodes) {
          geoFilters.regionCodes.forEach(code => params.append('regionCode', code))
        }
        if (geoFilters?.municipalityCodes) {
          geoFilters.municipalityCodes.forEach(code => params.append('municipalityCode', code))
        }
        if (geoFilters?.showItemsWithoutLocation !== undefined) {
          params.append('showItemsWithoutLocation', String(geoFilters.showItemsWithoutLocation))
        }

        const queryString = params.toString()
        const url = queryString
          ? `/api/columns/${columnId}/updates?${queryString}`
          : `/api/columns/${columnId}/updates`

        console.log(`LongPoll: Requesting updates for column ${columnId}`, { lastSeen, hasGeoFilters: !!geoFilters })

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        // Update last seen timestamp
        if (data.timestamp) {
          lastSeenTimestampsRef.current.set(columnId, data.timestamp)
        }

        // Process new items
        if (data.success && data.items && data.items.length > 0) {
          console.log(`LongPoll: Received ${data.items.length} new items for column ${columnId}`)

          updateColumnData((prev) => {
            const existingItems = prev[columnId] || []

            // Deduplicate using item.dbId (unique database ID) and mark as new based on age
            const newItems = data.items
              .filter(
                (newItem: NewsItem) =>
                  !existingItems.some(existing => existing.dbId === newItem.dbId)
              )
              .map((item: NewsItem) => ({
                ...item,
                isNew: isNewsItemNew(item.createdInDb)
              }))

            if (newItems.length === 0) {
              return prev
            }

            console.log(`LongPoll: Adding ${newItems.length} deduplicated items to column ${columnId}`)

            // Only trigger notification if:
            // 1. This is NOT the first poll (lastSeen exists)
            // 2. There are actually new items that are "new" (< 1 minute old)
            const recentItems = newItems.filter(item => item.isNew)
            if (onNewItems && lastSeen && recentItems.length > 0) {
              console.log(`🔔 Triggering notification for column ${columnId} (${recentItems.length} recent items)`)
              onNewItems(columnId, recentItems)
            } else if (!lastSeen) {
              console.log(`🔇 Skipping notification for column ${columnId} (initial load)`)
            }

            return {
              ...prev,
              [columnId]: [...newItems, ...existingItems]
            }
          })
        }

        // Reset backoff on success
        backoffRef.current.set(columnId, 1000)
        // Immediately start next poll
        setConnectionStatus('connected')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Polling was cancelled, exit loop
          console.log(`LongPoll: Aborted for column ${columnId}`)
          break
        }

        console.error(`LongPoll: Error for column ${columnId}`, error)
        setConnectionStatus('disconnected')

        // Exponential backoff on errors (caps at 30s)
        const currentBackoff = backoffRef.current.get(columnId) ?? 1000
        const nextBackoff = Math.min(currentBackoff * 2, 30000)
        backoffRef.current.set(columnId, nextBackoff)
        await new Promise(resolve => setTimeout(resolve, currentBackoff))
      }
    }

    // Cleanup for this column
    abortControllersRef.current.delete(columnId)
  }, [columns, updateColumnData, onNewItems, stopPolling, geoFilters])

  // Auto-start polling for all non-archived columns
  useEffect(() => {
    if (!columns || columns.length === 0) {
      return undefined
    }

    isCleaningUpRef.current = false

    // Start polling for each non-archived column
    columns.forEach((column) => {
      if (!column.isArchived) {
        startPolling(column.id)
      }
    })

    // Cleanup on unmount or when columns change
    return () => {
      stopAllPolling()
    }
  }, [columns, startPolling, stopAllPolling, geoFilters])

  // Pause/resume when tab visibility changes to avoid hammering when hidden
  useEffect(() => {
    const handleVisibility = () => {
      const hidden = document.hidden
      isPausedRef.current = hidden
      if (!hidden) {
        // Resume polling by restarting loops
        columns.forEach((column) => {
          if (!column.isArchived) {
            startPolling(column.id)
          }
        })
      } else {
        // Abort ongoing requests to free connections
        abortControllersRef.current.forEach(controller => controller.abort())
        abortControllersRef.current.clear()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [columns, startPolling])

  // Hard-stop polling on full page hide/unload (navigation away)
  useEffect(() => {
    const handlePageHide = () => {
      stopAllPolling()
    }

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handlePageHide)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handlePageHide)
    }
  }, [stopAllPolling])

  return {
    connectionStatus,
    startPolling,
    stopPolling,
    stopAllPolling,
  }
}
