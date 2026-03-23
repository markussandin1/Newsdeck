/**
 * useColumnOperations Hook
 *
 * Manages all column CRUD operations:
 * - addColumn: POST /api/columns + PUT dashboard
 * - removeColumn: PUT /api/columns/[id]/archive
 * - restoreColumn: PUT /api/columns/[id]/restore
 * - updateColumn: PUT /api/columns/[id]
 * - reorderColumns: PUT dashboard with new order
 */

import { useState, useCallback } from 'react'
import { Dashboard } from '@/lib/types'

interface UseColumnOperationsProps {
  dashboard: Dashboard
  onDashboardUpdate: (dashboard: Dashboard) => void
  onArchivedColumnsReload?: () => void
}

interface CreatedColumnId {
  id: string
  title: string
}

interface UseColumnOperationsReturn {
  createdColumnId: CreatedColumnId | null
  setCreatedColumnId: (value: CreatedColumnId | null) => void
  addColumn: (title: string, description?: string, flowId?: string) => Promise<void>
  removeColumn: (columnId: string) => Promise<void>
  restoreColumn: (columnId: string) => Promise<void>
  updateColumn: (columnId: string, title: string, description?: string, flowId?: string) => Promise<void>
  reorderColumns: (draggedColumnId: string, targetColumnId: string) => Promise<void>
}

export function useColumnOperations({
  dashboard,
  onDashboardUpdate,
  onArchivedColumnsReload,
}: UseColumnOperationsProps): UseColumnOperationsReturn {
  const [createdColumnId, setCreatedColumnId] = useState<CreatedColumnId | null>(null)

  const getDashboardEndpoint = useCallback(() => {
    if (dashboard.id === 'main-dashboard') {
      return '/api/dashboards/main-dashboard'
    }
    return `/api/dashboards/${dashboard.slug}`
  }, [dashboard.id, dashboard.slug])

  const addColumn = useCallback(async (title: string, description?: string, flowId?: string) => {
    try {
      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim(),
          flowId: flowId?.trim() || undefined,
          order: dashboard?.columns?.length || 0,
          dashboardId: dashboard?.id
        })
      })

      const data = await response.json()
      if (data.success) {
        const updatedColumns = [...(dashboard?.columns || []), data.column]
        const updateEndpoint = getDashboardEndpoint()

        const dashboardResponse = await fetch(updateEndpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columns: updatedColumns })
        })

        const dashboardData = await dashboardResponse.json()
        if (dashboardData.success) {
          onDashboardUpdate(dashboardData.dashboard)
          setCreatedColumnId({ id: data.column.id, title: data.column.title })
        }
      }
    } catch (error) {
      console.error('Failed to add column:', error)
    }
  }, [dashboard, getDashboardEndpoint, onDashboardUpdate])

  const removeColumn = useCallback(async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}/archive?dashboardId=${dashboard.id}`, {
        method: 'PUT'
      })

      const data = await response.json()
      if (data.success) {
        onDashboardUpdate(data.dashboard)
        onArchivedColumnsReload?.()
      }
    } catch (error) {
      console.error('Failed to archive column:', error)
    }
  }, [dashboard.id, onDashboardUpdate, onArchivedColumnsReload])

  const restoreColumn = useCallback(async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}/restore?dashboardId=${dashboard.id}`, {
        method: 'PUT'
      })

      const data = await response.json()
      if (data.success) {
        onDashboardUpdate(data.dashboard)
        onArchivedColumnsReload?.()
      }
    } catch (error) {
      console.error('Failed to restore column:', error)
    }
  }, [dashboard.id, onDashboardUpdate, onArchivedColumnsReload])

  const updateColumn = useCallback(async (columnId: string, title: string, description?: string, flowId?: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description?.trim(),
          flowId: flowId !== undefined ? flowId.trim() : undefined
        })
      })

      const data = await response.json()
      if (data.success) {
        const updatedColumns = (dashboard?.columns || []).map(col =>
          col.id === columnId
            ? { ...col, title: title.trim(), description: description?.trim(), flowId: flowId?.trim() || undefined }
            : col
        )

        const updateEndpoint = getDashboardEndpoint()

        const dashboardResponse = await fetch(updateEndpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columns: updatedColumns })
        })

        const dashboardData = await dashboardResponse.json()
        if (dashboardData.success) {
          onDashboardUpdate(dashboardData.dashboard)
        }
      }
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }, [dashboard, getDashboardEndpoint, onDashboardUpdate])

  const reorderColumns = useCallback(async (draggedColumnId: string, targetColumnId: string) => {
    const columns = dashboard?.columns?.filter(col => !col.isArchived) || []
    const draggedIndex = columns.findIndex(col => col.id === draggedColumnId)
    const targetIndex = columns.findIndex(col => col.id === targetColumnId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const reorderedColumns = [...columns]
    const [draggedCol] = reorderedColumns.splice(draggedIndex, 1)
    reorderedColumns.splice(targetIndex, 0, draggedCol)

    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      order: index
    }))

    const archivedCols = dashboard?.columns?.filter(col => col.isArchived) || []
    const allColumns = [...updatedColumns, ...archivedCols]

    try {
      const updateEndpoint = getDashboardEndpoint()

      const response = await fetch(updateEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: allColumns })
      })

      const data = await response.json()
      if (data.success) {
        onDashboardUpdate(data.dashboard)
      }
    } catch (error) {
      console.error('Failed to reorder columns:', error)
    }
  }, [dashboard, getDashboardEndpoint, onDashboardUpdate])

  return {
    createdColumnId,
    setCreatedColumnId,
    addColumn,
    removeColumn,
    restoreColumn,
    updateColumn,
    reorderColumns,
  }
}
