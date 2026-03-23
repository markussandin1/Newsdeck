import { useEffect, useRef, useState, useCallback } from 'react'
import type { DashboardColumn, NewsItem } from '@/lib/types'
import type { ColumnData, ConnectionStatus } from '@/lib/dashboard/types'
import { isNewsItemNew } from '@/lib/time-utils'

interface UseDashboardStreamProps {
  columns: DashboardColumn[]
  updateColumnData: (updater: (prev: ColumnData) => ColumnData) => void
  onNewItems?: (columnId: string, items: NewsItem[]) => void
  geoFilters: {
    regionCodes: string[]
    municipalityCodes: string[]
    showItemsWithoutLocation: boolean
  }
}

interface UseDashboardStreamReturn {
  connectionStatus: ConnectionStatus
  startPolling: (columnId: string) => void
  stopPolling: (columnId: string) => void
  stopAllPolling: () => void
}

/**
 * Server-Sent Events hook – replaces useDashboardPolling.
 *
 * Maintains a single persistent SSE connection to /api/stream for all
 * active (non-archived) columns. Returns the same interface as
 * useDashboardPolling so MainDashboard.tsx requires minimal changes.
 *
 * Reconnects with exponential back-off (1 s → 2 s → 4 s … max 30 s).
 */
export function useDashboardStream({
  columns,
  updateColumnData,
  onNewItems,
  geoFilters,
}: UseDashboardStreamProps): UseDashboardStreamReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  // Refs to avoid stale closures
  const columnsRef = useRef(columns)
  const geoFiltersRef = useRef(geoFilters)
  const updateColumnDataRef = useRef(updateColumnData)
  const onNewItemsRef = useRef(onNewItems)
  const isInitialConnectionRef = useRef(true)

  columnsRef.current = columns
  geoFiltersRef.current = geoFilters
  updateColumnDataRef.current = updateColumnData
  onNewItemsRef.current = onNewItems

  // Track when each column was last seen so we can detect truly new items
  const lastSeenTimestampsRef = useRef<Map<string, number>>(new Map())

  // EventSource + cleanup refs
  const eventSourceRef = useRef<EventSource | null>(null)
  const backoffRef = useRef(1000)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isStoppedRef = useRef(false)

  // -------------------------------------------------------------------------
  // Build the SSE URL from active columns and geo filters
  // -------------------------------------------------------------------------
  const buildUrl = useCallback((cols: DashboardColumn[]) => {
    const activeCols = cols.filter(c => !c.isArchived)
    if (activeCols.length === 0) return null

    const params = new URLSearchParams()
    params.set('columns', activeCols.map(c => c.id).join(','))

    const filters = geoFiltersRef.current
    if (filters.regionCodes.length > 0) {
      filters.regionCodes.forEach(code => params.append('regionCode', code))
    }
    if (filters.municipalityCodes.length > 0) {
      filters.municipalityCodes.forEach(code => params.append('municipalityCode', code))
    }
    if (filters.showItemsWithoutLocation !== undefined) {
      params.set('showItemsWithoutLocation', String(filters.showItemsWithoutLocation))
    }

    return `/api/stream?${params.toString()}`
  }, [])

  // -------------------------------------------------------------------------
  // Process incoming items from SSE
  // -------------------------------------------------------------------------
  const handleItems = useCallback((columnId: string, items: NewsItem[]) => {
    const lastSeen = lastSeenTimestampsRef.current.get(columnId)

    updateColumnDataRef.current((prev: ColumnData) => {
      const existingItems = prev[columnId] || []

      const incomingItems: NewsItem[] = items.map((item: NewsItem) => ({
        ...item,
        isNew: isNewsItemNew(item.createdInDb),
      }))

      const brandNewItems: NewsItem[] = []
      const updatedSourceIds = new Set<string>()

      for (const incomingItem of incomingItems) {
        const isDuplicateDbId = existingItems.some(e => e.dbId === incomingItem.dbId)
        if (isDuplicateDbId) continue

        const existingWithSameSource = incomingItem.id
          ? existingItems.find(e => e.id && e.id === incomingItem.id)
          : null

        if (existingWithSameSource) {
          updatedSourceIds.add(incomingItem.id!)
        }
        brandNewItems.push(incomingItem)
      }

      if (brandNewItems.length === 0) return prev

      const recentItems = brandNewItems.filter(item => item.isNew)
      if (onNewItemsRef.current && lastSeen && recentItems.length > 0) {
        onNewItemsRef.current(columnId, recentItems)
      }

      const filteredExisting = updatedSourceIds.size > 0
        ? existingItems.filter(e => !e.id || !updatedSourceIds.has(e.id))
        : existingItems

      return {
        ...prev,
        [columnId]: [...brandNewItems, ...filteredExisting],
      }
    })

    // Update last-seen timestamp
    lastSeenTimestampsRef.current.set(columnId, Date.now())
  }, [])

  // -------------------------------------------------------------------------
  // Open (or reopen) the SSE connection
  // -------------------------------------------------------------------------
  const connect = useCallback(() => {
    if (isStoppedRef.current) return

    const url = buildUrl(columnsRef.current)
    if (!url) {
      setConnectionStatus('disconnected')
      return
    }

    // Close any existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setConnectionStatus('connecting')
    const source = new EventSource(url)
    eventSourceRef.current = source

    source.onopen = () => {
      setConnectionStatus('connected')
      backoffRef.current = 1000 // reset back-off on successful connection
      isInitialConnectionRef.current = false
      console.log('SSE: connection opened', { url })
    }

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type: string
          columnId?: string
          items?: NewsItem[]
          timestamp?: number
        }

        if (data.type === 'items' && data.columnId && data.items && data.items.length > 0) {
          console.log(`SSE: received ${data.items.length} items for column ${data.columnId}`)
          handleItems(data.columnId, data.items)
        }
        // heartbeat and connected messages are intentionally ignored
      } catch (err) {
        console.error('SSE: failed to parse message', err, event.data)
      }
    }

    source.onerror = () => {
      if (isStoppedRef.current) return

      console.warn('SSE: connection error, scheduling reconnect in', backoffRef.current, 'ms')
      setConnectionStatus('disconnected')

      source.close()
      eventSourceRef.current = null

      // Exponential back-off, cap at 30 s
      const delay = backoffRef.current
      backoffRef.current = Math.min(delay * 2, 30_000)

      reconnectTimerRef.current = setTimeout(() => {
        if (!isStoppedRef.current) {
          connect()
        }
      }, delay)
    }
  }, [buildUrl, handleItems])

  // -------------------------------------------------------------------------
  // Stop the SSE connection entirely
  // -------------------------------------------------------------------------
  const stopAllPolling = useCallback(() => {
    isStoppedRef.current = true

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    lastSeenTimestampsRef.current.clear()
    setConnectionStatus('disconnected')
  }, [])

  // -------------------------------------------------------------------------
  // Compatibility shims for useDashboardPolling interface
  // (SSE manages all columns in one connection, so per-column start/stop
  //  simply reconnects the whole stream)
  // -------------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const startPolling = useCallback((_columnId: string) => {
    // Individual column start is a no-op in SSE mode;
    // the stream reconnect in the main useEffect handles it.
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stopPolling = useCallback((_columnId: string) => {
    // Individual column stop is a no-op; call stopAllPolling to tear down.
  }, [])

  // -------------------------------------------------------------------------
  // Connect on mount, reconnect when columns or geo filters change
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!columns || columns.length === 0) return

    isStoppedRef.current = false

    // Cancel any pending reconnect timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    connect()

    return () => {
      stopAllPolling()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Re-connect when active column list changes (archived state or column set)
    columns.filter(c => !c.isArchived).map(c => c.id).join(','),
    // Re-connect when geo filters change
    geoFilters.regionCodes.join(','),
    geoFilters.municipalityCodes.join(','),
    String(geoFilters.showItemsWithoutLocation),
  ])

  // -------------------------------------------------------------------------
  // Pause/resume when tab visibility changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Close connection to free server resources while tab is hidden
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = null
        }
      } else {
        // Tab became visible again – reconnect immediately
        if (!isStoppedRef.current) {
          backoffRef.current = 1000 // reset back-off
          connect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [connect])

  // -------------------------------------------------------------------------
  // Hard-stop on page unload
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handlePageHide = () => stopAllPolling()
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
