/**
 * useDashboardData Hook
 *
 * Hanterar datafetchning och state-hantering för dashboarden:
 * - Kolumndata via column-store (applySnapshot/applyPatch)
 * - Hantering av arkiverade kolumner
 * - Laddning av dashboardlista
 *
 * Ingen columnDataRef, ingen deepEqual, inga setState-anrop inne i updaters.
 * fetchColumnData dispatchar applySnapshot funktionellt med requesttid tagen
 * före fetch()-anropet för att skydda mot out-of-order-svar.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Dashboard, NewsItem, DashboardColumn } from '@/lib/types'
import { ColumnData } from '@/lib/dashboard/types'
import { applySnapshot, applyPatch, type ColumnStoreState } from '@/lib/dashboard/column-store'

interface UseDashboardDataProps {
  dashboard: Dashboard
}

interface UseDashboardDataReturn {
  columnData: ColumnStoreState
  archivedColumns: DashboardColumn[]
  allDashboards: Array<Dashboard & { columnCount?: number }>
  lastUpdate: Date
  isLoading: boolean

  fetchColumnData: () => Promise<void>
  loadArchivedColumns: () => Promise<void>
  loadAllDashboards: () => Promise<void>
  refreshAllColumns: () => Promise<void>
  updateColumnData: (updater: (prev: ColumnData) => ColumnData) => void
  patchItem: (columnId: string, dbId: string, item: NewsItem) => void
}

export function useDashboardData({ dashboard }: UseDashboardDataProps): UseDashboardDataReturn {
  const [columnData, setColumnData] = useState<ColumnStoreState>({})
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [archivedColumns, setArchivedColumns] = useState<DashboardColumn[]>([])
  const [allDashboards, setAllDashboards] = useState<Array<Dashboard & { columnCount?: number }>>([])
  // Skydd mot att ett långsamt svar skriver över ett nyare (out-of-order responses)
  const latestRequestRef = useRef(0)

  const fetchColumnData = useCallback(async () => {
    if (!dashboard?.id) return

    // Tid tas FÖRE fetch så applySnapshot kan filtrera SSE-race-fönstret korrekt
    const requestedAt = Date.now()
    latestRequestRef.current = requestedAt

    try {
      setIsLoading(true)
      const endpoint = dashboard.id === 'main-dashboard'
        ? '/api/dashboards/main-dashboard'
        : `/api/dashboards/${dashboard.slug}`

      const response = await fetch(endpoint)
      const data = await response.json() as {
        success: boolean
        columnData?: Record<string, NewsItem[]>
      }

      if (data.success && data.columnData) {
        // Kontrollera att inget nyare request har påbörjats under väntetiden
        if (latestRequestRef.current !== requestedAt) return
        const snapshot = data.columnData
        setColumnData(prev => applySnapshot(prev, snapshot, requestedAt))
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch column data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dashboard.id, dashboard.slug])

  /**
   * Passthrough för konsumenter som fortfarande behöver manipulera kolumndata
   * direkt (t.ex. useDashboardStream). Signaturen är en funktion för att
   * undvika att React-setState:s värde-form skapar inaktuella closures.
   */
  const updateColumnData = useCallback((updater: (prev: ColumnData) => ColumnData) => {
    setColumnData(updater)
  }, [])

  /** Punktuppdaterar ett enskilt item (t.ex. trafikkamerabild klar). */
  const patchItem = useCallback((columnId: string, dbId: string, item: NewsItem) => {
    setColumnData(prev => applyPatch(prev, columnId, dbId, item))
  }, [])

  const loadArchivedColumns = useCallback(async () => {
    try {
      const response = await fetch(`/api/columns/archived?dashboardId=${dashboard.id}`)
      const data = await response.json() as { success: boolean; columns: DashboardColumn[] }
      if (data.success) {
        setArchivedColumns(data.columns)
      }
    } catch (error) {
      console.error('Failed to load archived columns:', error)
    }
  }, [dashboard.id])

  const loadAllDashboards = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboards')
      const data = await response.json() as {
        success: boolean
        dashboards: Array<Dashboard & { columnCount?: number }>
      }
      if (data.success && Array.isArray(data.dashboards)) {
        setAllDashboards(data.dashboards)
      }
    } catch (error) {
      console.error('Failed to load dashboards:', error)
    }
  }, [])

  const refreshAllColumns = useCallback(async () => {
    await fetchColumnData()
  }, [fetchColumnData])

  useEffect(() => {
    if (dashboard?.id) {
      loadArchivedColumns()
      loadAllDashboards()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.id])

  useEffect(() => {
    if (dashboard?.id) {
      fetchColumnData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.id])

  return {
    columnData,
    archivedColumns,
    allDashboards,
    lastUpdate,
    isLoading,

    fetchColumnData,
    loadArchivedColumns,
    loadAllDashboards,
    refreshAllColumns,
    updateColumnData,
    patchItem,
  }
}
