/**
 * useDashboardData Hook
 *
 * Manages dashboard data fetching and state management:
 * - Column data loading and updates
 * - Archived columns management
 * - Dashboard list loading
 * - Deep equality checking to prevent unnecessary re-renders
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { Dashboard, NewsItem, DashboardColumn } from '@/lib/types'
import { ColumnData } from '@/lib/dashboard/types'
import { deepEqual } from '@/lib/dashboard/utils'
import { isNewsItemNew } from '@/lib/time-utils'

interface UseDashboardDataProps {
  dashboard: Dashboard
  geoFilters: {
    regionCodes: string[]
    municipalityCodes: string[]
    showItemsWithoutLocation: boolean
  }
}

interface UseDashboardDataReturn {
  // State
  columnData: ColumnData
  archivedColumns: DashboardColumn[]
  allDashboards: Array<Dashboard & { columnCount?: number }>
  lastUpdate: Date
  isLoading: boolean

  // Actions
  fetchColumnData: () => Promise<void>
  loadArchivedColumns: () => Promise<void>
  loadAllDashboards: () => Promise<void>
  refreshAllColumns: () => Promise<void>
  updateColumnData: (updater: React.SetStateAction<ColumnData>) => void
}

export function useDashboardData({ dashboard, geoFilters }: UseDashboardDataProps): UseDashboardDataReturn {
  const [columnData, setColumnData] = useState<ColumnData>({})
  const columnDataRef = useRef<ColumnData>({})
  const geoFiltersRef = useRef(geoFilters)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [archivedColumns, setArchivedColumns] = useState<DashboardColumn[]>([])
  const [allDashboards, setAllDashboards] = useState<Array<Dashboard & { columnCount?: number }>>([])

  // Keep ref in sync with prop
  useEffect(() => {
    geoFiltersRef.current = geoFilters
  }, [geoFilters])

  /**
   * Fetch all column data for the current dashboard
   * Uses deep equality checking to prevent unnecessary re-renders
   */
  const fetchColumnData = useCallback(async () => {
    if (!dashboard?.id) {
      return
    }

    try {
      setIsLoading(true)
      // Use the correct endpoint based on dashboard type
      let baseEndpoint = `/api/dashboards/${dashboard.slug}`
      if (dashboard.id === 'main-dashboard') {
        baseEndpoint = '/api/dashboards/main-dashboard'
      }

      // Build query parameters for geographic filters
      const params = new URLSearchParams()
      const currentGeoFilters = geoFiltersRef.current

      if (currentGeoFilters.regionCodes.length > 0) {
        currentGeoFilters.regionCodes.forEach(code => params.append('regionCode', code))
      }

      if (currentGeoFilters.municipalityCodes.length > 0) {
        currentGeoFilters.municipalityCodes.forEach(code => params.append('municipalityCode', code))
      }

      if (currentGeoFilters.showItemsWithoutLocation !== undefined) {
        params.append('showItemsWithoutLocation', String(currentGeoFilters.showItemsWithoutLocation))
      }

      const queryString = params.toString()
      const endpoint = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint

      console.log('📡 Fetching column data:', endpoint)
      const response = await fetch(endpoint)
      const data = await response.json() as {
        success: boolean
        columnData?: Record<string, NewsItem[]>
      }

      if (data.success) {
        const incomingData: ColumnData = data.columnData ? { ...data.columnData } : {}

        // Merge incoming data with existing polling state to prevent flash
        // Items added via polling are preserved; fetch data is used for the rest
        const mergedData: ColumnData = {}

        Object.entries(incomingData).forEach(([columnId, newItems]) => {
          const existingItems = columnDataRef.current[columnId] || []
          const existingByDbId = new Map(existingItems.map(item => [item.dbId, item]))

          const incomingDbIds = new Set(newItems.map(i => i.dbId).filter(Boolean))
          const pollingOnlyItems = existingItems.filter(
            item => item.dbId && !incomingDbIds.has(item.dbId)
          )

          // If polling has a newer version of an item (same source_id, different dbId),
          // skip the stale fetch version to avoid showing duplicates
          const pollingOnlySourceIds = new Set(
            pollingOnlyItems.map(i => i.id).filter(Boolean)
          )

          const merged = newItems
            .filter(item => !item.id || !pollingOnlySourceIds.has(item.id))
            .map(item => {
              const existing = item.dbId ? existingByDbId.get(item.dbId) : undefined
              return existing ?? { ...item, isNew: isNewsItemNew(item.createdInDb) }
            })

          mergedData[columnId] = [...pollingOnlyItems, ...merged]
        })

        const rawDataChanged = !deepEqual(columnDataRef.current, mergedData)
        if (!rawDataChanged) {
          return
        }

        setColumnData(mergedData)
        columnDataRef.current = mergedData
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch column data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dashboard.id, dashboard.slug])

  /**
   * Load archived columns for the current dashboard
   */
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

  /**
   * Load all available dashboards
   */
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

  /**
   * Refresh all columns (alias for fetchColumnData for backwards compatibility)
   */
  const refreshAllColumns = useCallback(async () => {
    await fetchColumnData()
  }, [fetchColumnData])

  /**
   * Update column data externally (e.g., from long-polling)
   * This wrapper ensures columnDataRef and lastUpdate stay in sync
   */
  const updateColumnData = useCallback((updater: React.SetStateAction<ColumnData>) => {
    setColumnData(prev => {
      // Calculate new value (handle both function and direct value)
      const newValue = typeof updater === 'function' ? updater(prev) : updater

      // Update ref to keep it in sync
      columnDataRef.current = newValue

      // Update timestamp
      setLastUpdate(new Date())

      return newValue
    })
  }, [])

  /**
   * Load dashboard structure (archived columns, all dashboards) when dashboard changes.
   * Does NOT fetch column data here – that is handled by the effect below.
   */
  useEffect(() => {
    if (dashboard?.id) {
      loadArchivedColumns()
      loadAllDashboards()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.id])

  /**
   * Fetch column data on initial mount and whenever geographic filters change.
   * Only one fetchColumnData() call is triggered at a time, preventing the
   * race condition where two concurrent calls overwrite each other's results.
   */
  useEffect(() => {
    if (dashboard?.id) {
      fetchColumnData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dashboard?.id,
    geoFilters.regionCodes.join(','),
    geoFilters.municipalityCodes.join(','),
    geoFilters.showItemsWithoutLocation
  ])

  return {
    // State
    columnData,
    archivedColumns,
    allDashboards,
    lastUpdate,
    isLoading,

    // Actions
    fetchColumnData,
    loadArchivedColumns,
    loadAllDashboards,
    refreshAllColumns,
    updateColumnData, // Wrapped setter that keeps ref and lastUpdate in sync
  }
}
