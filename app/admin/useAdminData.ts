'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Dashboard, DashboardColumn, NewsItem } from '@/lib/types'

/**
 * Sammlar state och datahämtning för admin-sidan (P2-4 steg 1).
 *
 * Tidigare bodde allt detta som tjugotal `useState` + `useCallback` inne i
 * `AdminPageContent`. Hooken äger nu listor (dashboards, columns, items),
 * urval (selectedDashboard, selectedColumn) och de tre fetch-funktionerna.
 * Render-koden i `page.tsx` plockar bara ut det den behöver.
 */
export function useAdminData() {
  const searchParams = useSearchParams()
  const dashboardIdFromUrl = searchParams.get('dashboardId')

  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [selectedDashboard, setSelectedDashboard] = useState<string>('')
  const [columns, setColumns] = useState<DashboardColumn[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [recentItems, setRecentItems] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const fetchDashboards = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboards')
      const result = await response.json() as {
        success: boolean
        dashboards?: (Dashboard & { columnCount?: number })[]
      }
      if (result.success && Array.isArray(result.dashboards)) {
        const normalizedDashboards = result.dashboards.map(dashboardItem => {
          const { columnCount, ...dashboardWithoutCount } = dashboardItem
          void columnCount
          return dashboardWithoutCount
        })
        setDashboards(normalizedDashboards)

        // Priority: URL param > main dashboard > first dashboard
        if (dashboardIdFromUrl && normalizedDashboards.find(d => d.id === dashboardIdFromUrl)) {
          setSelectedDashboard(dashboardIdFromUrl)
        } else if (!selectedDashboard) {
          const mainDash = normalizedDashboards.find(d => d.id === 'main-dashboard')
          if (mainDash) {
            setSelectedDashboard(mainDash.id)
          } else if (normalizedDashboards.length > 0) {
            setSelectedDashboard(normalizedDashboards[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error)
    }
  }, [selectedDashboard, dashboardIdFromUrl])

  const fetchColumns = useCallback(async (dashboardId: string) => {
    if (!dashboardId) return

    try {
      let endpoint: string
      if (dashboardId === 'main-dashboard') {
        endpoint = '/api/dashboards/main-dashboard'
      } else {
        const dashboard = dashboards.find(d => d.id === dashboardId)
        if (dashboard && dashboard.slug) {
          endpoint = `/api/dashboards/${dashboard.slug}`
        } else {
          console.error(`Dashboard with ID ${dashboardId} not found or has no slug.`)
          return
        }
      }

      const response = await fetch(endpoint)
      const result = await response.json() as {
        success: boolean
        dashboard?: Dashboard
        error?: string
      }
      if (result.success && result.dashboard) {
        const dashboard = result.dashboard
        setColumns(dashboard.columns || [])
        if (dashboard.columns && dashboard.columns.length > 0) {
          setSelectedColumn(dashboard.columns[0].id)
        } else {
          setSelectedColumn('')
        }
      } else {
        console.error('Failed to fetch dashboard:', result.error)
        setColumns([])
        setSelectedColumn('')
      }
    } catch (error) {
      console.error('Failed to fetch columns:', error)
      setColumns([])
      setSelectedColumn('')
    } finally {
      setIsLoading(false)
    }
  }, [dashboards])

  const fetchRecentItems = useCallback(async (dashboardId?: string) => {
    setItemsLoading(true)
    try {
      const targetDashboard = dashboardId || selectedDashboard

      if (!targetDashboard) {
        const response = await fetch('/api/news-items')
        const result = await response.json() as { success: boolean; items: NewsItem[] }
        if (result.success) {
          setRecentItems(result.items.slice(0, 50))
        }
        return
      }

      const dashboard = dashboards.find(d => d.id === targetDashboard)
      if (!dashboard || !dashboard.columns || dashboard.columns.length === 0) {
        setRecentItems([])
        return
      }

      const columnIds = dashboard.columns
        .filter(col => !col.isArchived)
        .map((col: DashboardColumn) => col.id)
      const allColumnItems: NewsItem[] = []

      const endpoint = targetDashboard === 'main-dashboard'
        ? '/api/dashboards/main-dashboard'
        : `/api/dashboards/${dashboard.slug}`

      const dashboardResponse = await fetch(endpoint)
      const dashboardResult = await dashboardResponse.json() as {
        success: boolean
        columnData?: Record<string, NewsItem[]>
      }

      if (dashboardResult.success && dashboardResult.columnData) {
        for (const columnId of columnIds) {
          const columnItems = dashboardResult.columnData[columnId] || []
          allColumnItems.push(...columnItems)
        }

        const uniqueItems = Array.from(
          new Map(allColumnItems.map(item => [item.dbId || item.id, item])).values(),
        ).sort((a, b) => {
          const timeA = new Date(a.createdInDb || a.timestamp).getTime()
          const timeB = new Date(b.createdInDb || b.timestamp).getTime()
          return timeB - timeA
        })

        setRecentItems(uniqueItems.slice(0, 50))
      } else {
        setRecentItems([])
      }
    } catch (error) {
      console.error('Failed to fetch recent items:', error)
      setRecentItems([])
    } finally {
      setItemsLoading(false)
    }
  }, [dashboards, selectedDashboard])

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      setIsAuthenticated(response.ok)
    } catch (error) {
      console.error('Failed to check auth:', error)
      setIsAuthenticated(false)
    }
  }, [])

  // Initial mount: hämta dashboards + auth-status
  useEffect(() => {
    fetchDashboards()
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // När man byter dashboard: hämta kolumner + senaste items
  useEffect(() => {
    if (selectedDashboard && dashboards.length > 0) {
      setSelectedColumn('')
      fetchColumns(selectedDashboard)
      fetchRecentItems(selectedDashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDashboard])

  return {
    dashboards,
    selectedDashboard,
    setSelectedDashboard,
    columns,
    selectedColumn,
    setSelectedColumn,
    recentItems,
    isLoading,
    itemsLoading,
    isAuthenticated,
    fetchRecentItems,
  }
}
