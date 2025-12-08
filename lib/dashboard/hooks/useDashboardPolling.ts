import { useEffect, useRef, useState, useCallback } from 'react'
import type { DashboardColumn, NewsItem } from '@/lib/types'
import type { ColumnData, ConnectionStatus } from '@/lib/dashboard/types'
import { isNewsItemNew } from '@/lib/time-utils'

interface UseDashboardPollingProps {
  columns: DashboardColumn[]
  updateColumnData: (updater: (prev: ColumnData) => ColumnData) => void
  onNewItems?: (columnId: string, items: NewsItem[]) => void
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
}: UseDashboardPollingProps): UseDashboardPollingReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const lastSeenTimestampsRef = useRef<Map<string, number>>(new Map())
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map())
  const isCleaningUpRef = useRef(false)

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
  }, [])

  const stopAllPolling = useCallback(() => {
    isCleaningUpRef.current = true

    abortControllersRef.current.forEach((controller) => controller.abort())
    abortControllersRef.current.clear()

    reconnectTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    reconnectTimeoutsRef.current.clear()

    lastSeenTimestampsRef.current.clear()
    reconnectAttemptsRef.current.clear()

    setConnectionStatus('disconnected')
  }, [])

  const startPolling = useCallback(async (columnId: string) => {
    if (isCleaningUpRef.current) {
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

    // Long polling loop
    while (!isCleaningUpRef.current && !controller.signal.aborted) {
      try {
        const lastSeen = lastSeenTimestampsRef.current.get(columnId)
        const url = lastSeen
          ? `/api/columns/${columnId}/updates?lastSeen=${lastSeen}`
          : `/api/columns/${columnId}/updates`

        console.log(`LongPoll: Requesting updates for column ${columnId}`, { lastSeen })

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

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Cleanup for this column
    abortControllersRef.current.delete(columnId)
  }, [columns, updateColumnData, onNewItems, stopPolling])

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
  }, [columns, startPolling, stopAllPolling])

  return {
    connectionStatus,
    startPolling,
    stopPolling,
    stopAllPolling,
  }
}
