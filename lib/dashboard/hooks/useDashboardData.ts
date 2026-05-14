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
}

interface UseDashboardDataReturn {
  columnData: ColumnData
  archivedColumns: DashboardColumn[]
  allDashboards: Array<Dashboard & { columnCount?: number }>
  lastUpdate: Date
  isLoading: boolean

  fetchColumnData: () => Promise<void>
  loadArchivedColumns: () => Promise<void>
  loadAllDashboards: () => Promise<void>
  refreshAllColumns: () => Promise<void>
  updateColumnData: (updater: React.SetStateAction<ColumnData>) => void
}

export function useDashboardData({ dashboard }: UseDashboardDataProps): UseDashboardDataReturn {
  const [columnData, setColumnData] = useState<ColumnData>({})
  const columnDataRef = useRef<ColumnData>({})
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [archivedColumns, setArchivedColumns] = useState<DashboardColumn[]>([])
  const [allDashboards, setAllDashboards] = useState<Array<Dashboard & { columnCount?: number }>>([])

  const fetchColumnData = useCallback(async () => {
    if (!dashboard?.id) {
      return
    }

    try {
      setIsLoading(true)
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

        const mergedData: ColumnData = {}

        Object.entries(incomingData).forEach(([columnId, newItems]) => {
          const existingItems = columnDataRef.current[columnId] || []
          const existingByDbId = new Map(existingItems.map(item => [item.dbId, item]))

          const incomingDbIds = new Set(newItems.map(i => i.dbId).filter(Boolean))
          const pollingOnlyItems = existingItems.filter(
            item => item.dbId && !incomingDbIds.has(item.dbId)
          )

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

  const updateColumnData = useCallback((updater: React.SetStateAction<ColumnData>) => {
    setColumnData(prev => {
      const newValue = typeof updater === 'function' ? updater(prev) : updater
      columnDataRef.current = newValue
      setLastUpdate(new Date())
      return newValue
    })
  }, [])

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
  }
}
