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

interface UseDashboardDataProps {
  dashboard: Dashboard
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
  updateColumnData: React.Dispatch<React.SetStateAction<ColumnData>>
}

export function useDashboardData({ dashboard }: UseDashboardDataProps): UseDashboardDataReturn {
  const [columnData, setColumnData] = useState<ColumnData>({})
  const columnDataRef = useRef<ColumnData>({})
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [archivedColumns, setArchivedColumns] = useState<DashboardColumn[]>([])
  const [allDashboards, setAllDashboards] = useState<Array<Dashboard & { columnCount?: number }>>([])

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
      let endpoint = `/api/dashboards/${dashboard.slug}`
      if (dashboard.id === 'main-dashboard') {
        endpoint = '/api/dashboards/main-dashboard'
      }

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
          const previousItems = previousData[columnId] ?? []

          processedData[columnId] = newItems.map(item => ({
            ...item,
            isNew: previousItems.length > 0 && !previousItems.some(existing => existing.dbId === item.dbId)
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
    updateColumnData: setColumnData, // Expose setter for external updates (e.g., long-polling)
  }
}
