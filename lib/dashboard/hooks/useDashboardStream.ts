import { useEffect, useRef, useState, useCallback } from 'react'
import type { DashboardColumn, NewsItem } from '@/lib/types'
import type { ColumnData, ConnectionStatus } from '@/lib/dashboard/types'
import { isNewsItemNew } from '@/lib/time-utils'

interface UseDashboardStreamProps {
  columns: DashboardColumn[]
  updateColumnData: (updater: (prev: ColumnData) => ColumnData) => void
  onNewItems?: (columnId: string, items: NewsItem[]) => void
  onReconnect?: () => void
}

// Hur länge vi accepterar tystnad innan vi anser anslutningen död.
// Servern skickar heartbeat var 30:e sekund, så 60s ger en hel missad
// puls innan vi tvingar reconnect.
const STALE_CONNECTION_MS = 60_000
const WATCHDOG_INTERVAL_MS = 15_000
// Tröskel för "OS:et sov" — om en watchdog-tick försenas mer än så här
// antar vi att laptopen varit i sleep eller liknande och tvingar reconnect.
const WAKE_SKEW_MS = 5_000

interface UseDashboardStreamReturn {
  connectionStatus: ConnectionStatus
  stopAllPolling: () => void
}

/**
 * Server-Sent Events hook.
 *
 * Maintains a single persistent SSE connection to /api/stream for all
 * active (non-archived) columns. Reconnects with exponential back-off
 * (1 s → 2 s → 4 s … max 30 s).
 */
export function useDashboardStream({
  columns,
  updateColumnData,
  onNewItems,
  onReconnect,
}: UseDashboardStreamProps): UseDashboardStreamReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  // Refs to avoid stale closures
  const columnsRef = useRef(columns)
  const updateColumnDataRef = useRef(updateColumnData)
  const onNewItemsRef = useRef(onNewItems)
  const onReconnectRef = useRef(onReconnect)
  const isInitialConnectionRef = useRef(true)

  columnsRef.current = columns
  updateColumnDataRef.current = updateColumnData
  onNewItemsRef.current = onNewItems
  onReconnectRef.current = onReconnect

  // Senaste mottagna meddelandet (items eller heartbeat). Används av watchdog
  // för att upptäcka "zombie"-anslutningar där TCP ser öppen ut men inga
  // events kommer fram (laptop sleep, NAT-timeout, mobilnätbyte).
  const lastMessageAtRef = useRef<number>(Date.now())
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Föregående watchdog-tick — om elapsed >> interval har OS sannolikt sovit
  // och vi bör tvinga reconnect direkt utan att vänta in stale-tröskeln.
  const lastWatchdogTickRef = useRef<number>(Date.now())

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

    return `/api/stream?${params.toString()}`
  }, [])

  // -------------------------------------------------------------------------
  // Process incoming items from SSE
  // -------------------------------------------------------------------------
  const handleItems = useCallback((columnId: string, items: NewsItem[]) => {
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

      // Allt som kommer via SSE är per definition nytt for klienten — SSE
      // skickar bara events publicerade efter att vi prenumererat, och dbId-
      // dedupen ovan filtrerar bort eventuella dubbletter mot existing state.
      // Vi notifierar utan lastSeen-/isNew-gates eftersom de gjorde att
      // första eventet i en kolumn alltid missade ljud, och att events fördröjda
      // av reconnect-/pubsub-glitch slogs som "för gamla".
      if (onNewItemsRef.current) {
        onNewItemsRef.current(columnId, brandNewItems)
      }

      const filteredExisting = updatedSourceIds.size > 0
        ? existingItems.filter(e => !e.id || !updatedSourceIds.has(e.id))
        : existingItems

      return {
        ...prev,
        [columnId]: [...brandNewItems, ...filteredExisting],
      }
    })
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
      lastMessageAtRef.current = Date.now()

      // Vid återanslutning (inte första gången): hämta in allt vi missade
      // under tiden anslutningen var nere. eventQueue rensar dessutom items
      // äldre än 5 min server-side, så utan refetch är nattens events borta.
      if (!isInitialConnectionRef.current) {
        onReconnectRef.current?.()
      }
      isInitialConnectionRef.current = false
    }

    source.onmessage = (event) => {
      lastMessageAtRef.current = Date.now()
      try {
        const data = JSON.parse(event.data) as {
          type: string
          columnId?: string
          items?: NewsItem[]
          timestamp?: number
        }

        if (data.type === 'items' && data.columnId && data.items && data.items.length > 0) {
          handleItems(data.columnId, data.items)
        }
        // heartbeat and connected messages are intentionally ignored
      } catch (err) {
        console.error('SSE: failed to parse message', err)
      }
    }

    source.onerror = () => {
      if (isStoppedRef.current) return

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
  // Tvinga reconnect direkt (utan backoff). Används av watchdog och
  // visibilitychange när vi misstänker att anslutningen är zombie.
  // -------------------------------------------------------------------------
  const forceReconnect = useCallback(() => {
    if (isStoppedRef.current) return

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    backoffRef.current = 1000
    connect()
  }, [connect])

  // -------------------------------------------------------------------------
  // Stop the SSE connection entirely
  // -------------------------------------------------------------------------
  const stopAllPolling = useCallback(() => {
    isStoppedRef.current = true

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (watchdogTimerRef.current) {
      clearInterval(watchdogTimerRef.current)
      watchdogTimerRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setConnectionStatus('disconnected')
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
  ])

  // -------------------------------------------------------------------------
  // SSE-anslutningen hålls öppen även när tab:en är dold så att nya items
  // (och tillhörande desktop-/ljudnotiser) levereras direkt när Newsdeck
  // ligger i en bakgrundsflik. Anslutningen återansluter automatiskt via
  // backoff-logiken i onerror om Cloud Run stänger den vid request-timeout.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Watchdog: EventSource.onerror triggar inte alltid när TCP är "zombie"
  // (laptop sleep, NAT-timeout, nätbyte). Heartbeaten kommer var 30:e sekund;
  // om vi inte sett ett meddelande på 60s antar vi att anslutningen är död
  // och tvingar reconnect.
  // -------------------------------------------------------------------------
  useEffect(() => {
    lastWatchdogTickRef.current = Date.now()

    watchdogTimerRef.current = setInterval(() => {
      const now = Date.now()
      const sinceLastTick = now - lastWatchdogTickRef.current
      lastWatchdogTickRef.current = now

      if (isStoppedRef.current) return
      if (!eventSourceRef.current) return

      // Wall-clock-skip: om vi förväntade oss en tick var WATCHDOG_INTERVAL_MS
      // men det har gått mycket längre har OS:et sannolikt sovit (laptop lock).
      // Tvinga reconnect direkt + hämta missade items, vänta inte in stale-fönstret.
      if (sinceLastTick > WATCHDOG_INTERVAL_MS + WAKE_SKEW_MS) {
        onReconnectRef.current?.()
        forceReconnect()
        return
      }

      const silentFor = now - lastMessageAtRef.current
      if (silentFor > STALE_CONNECTION_MS) {
        forceReconnect()
      }
    }, WATCHDOG_INTERVAL_MS)

    return () => {
      if (watchdogTimerRef.current) {
        clearInterval(watchdogTimerRef.current)
        watchdogTimerRef.current = null
      }
    }
  }, [forceReconnect])

  // -------------------------------------------------------------------------
  // Visibility-handler: när användaren kommer tillbaka till fliken efter
  // att laptopen varit i sleep eller fliken legat i bakgrund länge så
  // hämtar vi färsk data och, om anslutningen ser tyst ut, tvingar reconnect.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (isStoppedRef.current) return

      onReconnectRef.current?.()

      const silentFor = Date.now() - lastMessageAtRef.current
      if (silentFor > STALE_CONNECTION_MS) {
        forceReconnect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [forceReconnect])

  // -------------------------------------------------------------------------
  // Wake-/återkomst-signaler som visibilitychange missar:
  // - focus: triggar när användaren klickar på fönstret efter Mac-sleep
  //   (tabben var visible före och efter, så visibilitychange tiger).
  // - online: triggar när nätverket kommer tillbaka efter glitch/nätbyte.
  // Båda gör samma sak: refetcha färsk data och tvinga reconnect om tyst.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleResume = () => {
      if (isStoppedRef.current) return
      onReconnectRef.current?.()
      forceReconnect()
    }

    window.addEventListener('focus', handleResume)
    window.addEventListener('online', handleResume)
    return () => {
      window.removeEventListener('focus', handleResume)
      window.removeEventListener('online', handleResume)
    }
  }, [forceReconnect])

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
    stopAllPolling,
  }
}
