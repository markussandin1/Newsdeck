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
  geoFilters?: {
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

      if (currentGeoFilters?.regionCodes) {
        currentGeoFilters.regionCodes.forEach(code => params.append('regionCode', code))
      }

      if (currentGeoFilters?.municipalityCodes) {
        currentGeoFilters.municipalityCodes.forEach(code => params.append('municipalityCode', code))
      }

      if (currentGeoFilters?.showItemsWithoutLocation !== undefined) {
        params.append('showItemsWithoutLocation', String(currentGeoFilters.showItemsWithoutLocation))
      }

      const queryString = params.toString()
      const endpoint = queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint

      const response = await fetch(endpoint)
      const data = await response.json() as {
        success: boolean
        columnData?: Record<string, NewsItem[]>
      }

      if (data.success) {
        const incomingData: ColumnData = data.columnData ? { ...data.columnData } : {}

        // First check if the raw data has changed at all
        const previousData = columnDataRef.current
        const rawDataChanged = !deepEqual(previousData, incomingData)

        if (!rawDataChanged) {
          // No changes detected, skip all updates
          return
        }

        // Process new items only if there are actual changes
        const processedData: ColumnData = {}

        Object.entries(incomingData).forEach(([columnId, newItems]) => {
          // Mark items as "new" if they were created in the last 1 minute
          processedData[columnId] = newItems.map(item => ({
            ...item,
            isNew: isNewsItemNew(item.createdInDb)
          }))
        })

        // Update state only when there are actual changes
        setColumnData(processedData)
        columnDataRef.current = processedData
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
   * Initial data load when dashboard changes
   */
  useEffect(() => {
    if (dashboard?.id) {
      fetchColumnData()
      loadArchivedColumns()
      loadAllDashboards()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard?.id])

  /**
   * Re-fetch data when geographic filters change
   */
  useEffect(() => {
    if (dashboard?.id && geoFilters) {
      fetchColumnData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dashboard?.id,
    geoFilters?.regionCodes?.join(','),
    geoFilters?.municipalityCodes?.join(','),
    geoFilters?.showItemsWithoutLocation
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
