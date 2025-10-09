'use client'

import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Dashboard as DashboardType, NewsItem as NewsItemType, DashboardColumn } from '@/lib/types'
import NewsItem from './NewsItem'
import NewsItemModal from './NewsItemModal'
import { Button } from './ui/button'
import { Settings, X, Copy, Info } from 'lucide-react'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const deepEqual = (obj1: unknown, obj2: unknown): boolean => {
  if (Object.is(obj1, obj2)) return true

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false
    return obj1.every((value, index) => deepEqual(value, obj2[index]))
  }

  if (isRecord(obj1) && isRecord(obj2)) {
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) return false

    return keys1.every(key => deepEqual(obj1[key], obj2[key]))
  }

  return false
}

interface MainDashboardProps {
  dashboard: DashboardType
  onDashboardUpdate: (dashboard: DashboardType) => void
}

interface ColumnData {
  [columnId: string]: NewsItemType[]
}

export default function MainDashboard({ dashboard, onDashboardUpdate }: MainDashboardProps) {
  const router = useRouter()
  const [columnData, setColumnData] = useState<ColumnData>({})
  const columnDataRef = useRef<ColumnData>({})
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [showAddColumnModal, setShowAddColumnModal] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnDescription, setNewColumnDescription] = useState('')
  const [newColumnFlowId, setNewColumnFlowId] = useState('')
  const [showWorkflowInput, setShowWorkflowInput] = useState(false)
  const [urlExtracted, setUrlExtracted] = useState(false)
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFlowId, setEditFlowId] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [archivedColumns, setArchivedColumns] = useState<DashboardColumn[]>([])
  const [showArchivedColumns, setShowArchivedColumns] = useState(false)
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItemType | null>(null)
  const [allDashboards, setAllDashboards] = useState<Array<DashboardType & { columnCount?: number }>>([])
  const [showDashboardDropdown, setShowDashboardDropdown] = useState(false)
  const [showCreateDashboardModal, setShowCreateDashboardModal] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [newDashboardDescription, setNewDashboardDescription] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
  const [showWorkflowHelp, setShowWorkflowHelp] = useState(false)
  const [showExtractionSuccess, setShowExtractionSuccess] = useState(false)

  // Extract UUID from workflow URL
  const extractWorkflowId = (input: string): string => {
    const trimmed = input.trim()

    // If it looks like a URL, extract the UUID from it
    if (trimmed.includes('://') || trimmed.includes('/workflows/')) {
      // Match UUID pattern (8-4-4-4-12 hex digits)
      const uuidMatch = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
      if (uuidMatch) {
        return uuidMatch[1]
      }

      // Fallback: take last segment after /
      const segments = trimmed.split('/')
      return segments[segments.length - 1]
    }

    // Otherwise return as-is (already a UUID or custom ID)
    return trimmed
  }

  // Initialize workflow input checkbox when modal opens
  useEffect(() => {
    if (showAddColumnModal) {
      const activeColumns = dashboard?.columns?.filter(col => !col.isArchived) || []
      setShowWorkflowInput(activeColumns.length === 0)
    }
  }, [showAddColumnModal, dashboard?.columns])

  // Simple approach: Just don't recreate columns unnecessarily

  // Memoized column data to prevent unnecessary re-sorting
  const memoizedColumnData = useMemo(() => {
    const result: ColumnData = {}

    Object.entries(columnData).forEach(([columnId, items]) => {
      result[columnId] = [...items].sort((a, b) => {
        const getEventTime = (item: NewsItemType) => {
          // Prefer database creation time (createdInDb) over source timestamp
          if (item.createdInDb) {
            return new Date(item.createdInDb).getTime()
          }
          // Fallback to source timestamp
          return new Date(item.timestamp).getTime()
        }
        return getEventTime(b) - getEventTime(a)
      })
    })

    return result
  }, [columnData])

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
        columnData?: Record<string, NewsItemType[]>
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
            isNew: previousItems.length > 0 && !previousItems.some(existing => existing.id === item.id)
          }))
        })

        // Update state only when there are actual changes
        setColumnData(processedData)
        columnDataRef.current = processedData
        setLastUpdate(new Date())

        // No special scroll handling needed - columns should be stable
      }
    } catch (error) {
      console.error('Failed to fetch column data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dashboard.id, dashboard.slug]) // columnData intentionally excluded to prevent infinite polling

  // Deep equality check to prevent unnecessary re-renders
  // Load archived columns
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

  // Load all dashboards
  const loadAllDashboards = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboards')
      const data = await response.json() as {
        success: boolean
        dashboards: Array<DashboardType & { columnCount?: number }>
      }
      if (data.success && Array.isArray(data.dashboards)) {
        setAllDashboards(data.dashboards)
      }
    } catch (error) {
      console.error('Failed to load dashboards:', error)
    }
  }, [])

  // Polling for real-time updates every 5 seconds
  useEffect(() => {
    if (dashboard?.id) {
      fetchColumnData()
      loadArchivedColumns()
      loadAllDashboards()
    }
  }, [dashboard?.id, fetchColumnData, loadArchivedColumns, loadAllDashboards])

  // Set up SSE connections for real-time updates
  useEffect(() => {
    if (!dashboard?.columns) {
      return undefined
    }

    const eventSources: EventSource[] = []

    // Create SSE connection for each column
    dashboard.columns.forEach((column) => {
      if (column.isArchived) {
        return
      }

      const eventSource = new EventSource(`/api/columns/${column.id}/stream`)

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'connected') {
            console.log(`SSE connected to column ${column.id}`)
          } else if (data.type === 'update' && data.items) {
            // Add new items to column data
            setColumnData((prev) => {
              const existingItems = prev[column.id] || []
              const newItems = data.items.filter(
                (newItem: NewsItemType) =>
                  !existingItems.some(existing => existing.dbId === newItem.dbId)
              )
              return {
                ...prev,
                [column.id]: [...newItems, ...existingItems]
              }
            })
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error)
        }
      })

      eventSource.onerror = () => {
        console.log(`SSE connection error for column ${column.id}, will retry...`)
      }

      eventSources.push(eventSource)
    })

    // Cleanup: close all SSE connections
    return () => {
      eventSources.forEach(es => es.close())
    }
  }, [dashboard?.columns])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDashboardDropdown(false)
      }
    }

    if (showDashboardDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDashboardDropdown])

  const getTotalNewsCount = () => {
    return Object.values(columnData).reduce((total, items) => total + items.length, 0)
  }

  const addColumn = async (title: string, description?: string, flowId?: string) => {
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
        // Update the current dashboard with new column
        const updatedColumns = [...(dashboard?.columns || []), data.column]

        // Use the correct endpoint based on dashboard type
        let updateEndpoint = `/api/dashboards/${dashboard.slug}`
        if (dashboard.id === 'main-dashboard') {
          updateEndpoint = '/api/dashboards/main-dashboard'
        }

        const dashboardResponse = await fetch(updateEndpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columns: updatedColumns })
        })

        const dashboardData = await dashboardResponse.json()
        if (dashboardData.success) {
          onDashboardUpdate(dashboardData.dashboard)
          setShowAddColumnModal(false)
          setNewColumnTitle('')
          setNewColumnDescription('')
          setNewColumnFlowId('')
        }
      }
    } catch (error) {
      console.error('Failed to add column:', error)
    }
  }

  const restoreColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}/restore?dashboardId=${dashboard.id}`, {
        method: 'PUT'
      })

      const data = await response.json()
      if (data.success) {
        onDashboardUpdate(data.dashboard)
        loadArchivedColumns() // Reload archived columns
        setShowAddColumnModal(false)
      }
    } catch (error) {
      console.error('Failed to restore column:', error)
    }
  }

  const removeColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}/archive?dashboardId=${dashboard.id}`, {
        method: 'PUT'
      })

      const data = await response.json()
      if (data.success) {
        onDashboardUpdate(data.dashboard)
        loadArchivedColumns() // Reload archived columns
      }
    } catch (error) {
      console.error('Failed to archive column:', error)
    }
  }

  const updateColumn = async (columnId: string, title: string, description?: string, flowId?: string) => {
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
        // Update the dashboard with updated column
        const updatedColumns = (dashboard?.columns || []).map(col =>
          col.id === columnId
            ? { ...col, title: title.trim(), description: description?.trim(), flowId: flowId?.trim() || undefined }
            : col
        )

        // Use the correct endpoint based on dashboard type
        let updateEndpoint = `/api/dashboards/${dashboard.slug}`
        if (dashboard.id === 'main-dashboard') {
          updateEndpoint = '/api/dashboards/main-dashboard'
        }

        const dashboardResponse = await fetch(updateEndpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columns: updatedColumns })
        })

        const dashboardData = await dashboardResponse.json()
        if (dashboardData.success) {
          onDashboardUpdate(dashboardData.dashboard)
          setEditingColumn(null)
          setEditFlowId('')
        }
      }
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const copyToClipboard = async (text: string | undefined, columnId: string, columnTitle: string, label = 'Kolumn ID') => {
    if (!text) {
      setToastMessage(`Ingen ${label.toLowerCase()} att kopiera för ${columnTitle}`)
      setTimeout(() => setToastMessage(null), 2500)
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(columnId)
      setToastMessage(`${label}: ${text} för kolumnen ${columnTitle} är kopierat`)
      setTimeout(() => {
        setCopiedId(null)
        setToastMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const startEditing = (column: DashboardColumn) => {
    setEditingColumn(column.id)
    setEditTitle(column.title)
    setEditDescription(column.description || '')
    setEditFlowId(column.flowId || '')
  }

  const createDashboard = async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })
      
      const data = await response.json()
      if (data.success) {
        // Navigate to new dashboard
        router.push(`/dashboard/${data.dashboard.slug}`)
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error)
    }
  }

  const navigateToDashboard = useCallback((slug: string) => {
    router.push(`/dashboard/${slug}`)
  }, [router])

  const reorderColumns = async (draggedColumnId: string, targetColumnId: string) => {
    const columns = dashboard?.columns?.filter(col => !col.isArchived) || []
    const draggedIndex = columns.findIndex(col => col.id === draggedColumnId)
    const targetIndex = columns.findIndex(col => col.id === targetColumnId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const reorderedColumns = [...columns]
    const [draggedColumn] = reorderedColumns.splice(draggedIndex, 1)
    reorderedColumns.splice(targetIndex, 0, draggedColumn)

    // Update order property
    const updatedColumns = reorderedColumns.map((col, index) => ({
      ...col,
      order: index
    }))

    // Include archived columns to preserve them
    const archivedColumns = dashboard?.columns?.filter(col => col.isArchived) || []
    const allColumns = [...updatedColumns, ...archivedColumns]

    try {
      let updateEndpoint = `/api/dashboards/${dashboard.slug || dashboard.id}`
      if (dashboard.id === 'main-dashboard') {
        updateEndpoint = '/api/dashboards/main-dashboard'
      }

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
  }

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnId)

    // Use a simple transparent image as drag image to avoid positioning issues
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.globalAlpha = 0.01
      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, 1, 1)
    }
    e.dataTransfer.setDragImage(canvas, 0, 0)

    // Show custom drag preview
    setDragPreview({ x: e.clientX, y: e.clientY, visible: true })

    // Add mouse move listener for drag preview
    const handleMouseMove = (event: MouseEvent) => {
      setDragPreview({ x: event.clientX, y: event.clientY, visible: true })
    }

    document.addEventListener('dragover', handleMouseMove)

    // Clean up listener on drag end
    const cleanup = () => {
      document.removeEventListener('dragover', handleMouseMove)
      document.removeEventListener('dragend', cleanup)
    }
    document.addEventListener('dragend', cleanup)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
    setDragOverColumn(null)
    setDragPreview({ x: 0, y: 0, visible: false })
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    const draggedColumnId = e.dataTransfer.getData('text/plain')

    if (draggedColumnId && draggedColumnId !== targetColumnId) {
      reorderColumns(draggedColumnId, targetColumnId)
    }

    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  // Stable column structure that never gets recreated
  const StableColumn = memo(({
    column,
    children,
    onCopyId,
    onEditColumn,
    onRemoveColumn,
    copiedId
  }: {
    column: DashboardColumn
    children: React.ReactNode
    onCopyId: (text: string | undefined, columnId: string, columnTitle: string, label?: string) => void
    onEditColumn: (column: DashboardColumn) => void
    onRemoveColumn: (columnId: string) => void
    copiedId: string | null
  }) => {
    return (
      <div className="flex-shrink-0 w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Column Header - this part can update */}
        <div className="glass border-b border-slate-200/50 p-4 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => onCopyId(column.id, column.id, column.title)}
                className="text-blue-500 hover:text-blue-700 p-1"
                title="Kopiera kolumn-ID"
              >
                {copiedId === column.id ? '✓' : '📋'}
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    {column.title}
                  </h3>
                  <button
                    onClick={() => onEditColumn(column)}
                    className="text-gray-400 hover:text-gray-600 text-xs"
                    title="Redigera kolumn"
                  >
                    ✏️
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {memoizedColumnData[column.id]?.length || 0} händelser
                </div>
              </div>
            </div>
            <button
              onClick={() => onRemoveColumn(column.id)}
              className="ml-2 text-red-500 hover:text-red-700 text-sm p-1"
              title="Ta bort kolumn"
            >
              ×
            </button>
          </div>
        </div>

        {/* Stable scrollable content area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {children}
        </div>
      </div>
    )
  }, (prevProps, nextProps) => {
    // Only re-render if column metadata changes, NOT content
    return prevProps.column.id === nextProps.column.id &&
           prevProps.column.title === nextProps.column.title &&
           prevProps.column.flowId === nextProps.column.flowId &&
           prevProps.copiedId === nextProps.copiedId
  })

  StableColumn.displayName = 'StableColumn'

  // Separate component for column content that can update independently
  const ColumnContent = memo(({
    columnId,
    items,
    onSelectNewsItem
  }: {
    columnId: string
    items: NewsItemType[]
    onSelectNewsItem: (item: NewsItemType) => void
  }) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 text-sm">
          <div className="mb-4 flex justify-center">
            <Image src="/newsdeck-icon.svg" alt="Newsdeck logo" width={32} height={32} className="w-8 h-8 object-contain" />
          </div>
          <div className="mb-2">Väntar på händelser...</div>
          <div className="text-xs text-gray-400">
            Konfigurationen finns i kolumnhuvudet ↑
          </div>
        </div>
      )
    }

    return (
      <>
        {items.map((item, index) => (
          <div key={`${columnId}-${item.id}-${index}`} className="mb-2">
            <NewsItem
              item={item}
              compact={true}
              onClick={() => onSelectNewsItem(item)}
            />
          </div>
        ))}
      </>
    )
  }, (prevProps, nextProps) => {
    // Only re-render if items actually changed
    return prevProps.items.length === nextProps.items.length &&
           prevProps.items.every((item, index) =>
             item.id === nextProps.items[index]?.id &&
             item.isNew === nextProps.items[index]?.isNew
           )
  })

  ColumnContent.displayName = 'ColumnContent'


  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="glass border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link href="/dashboards">
                <div className="w-16 h-16 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                  <Image src="/newsdeck-icon.svg" alt="Newsdeck logo" width={64} height={64} className="w-16 h-16 object-contain" />
                </div>
              </Link>
              <div className="relative" ref={dropdownRef}>
                <button 
                  className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-3 py-2 smooth-transition"
                  onClick={() => setShowDashboardDropdown(!showDashboardDropdown)}
                >
                  <div>
                    <h1 className="text-xl font-semibold text-slate-900 text-left">{dashboard.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{dashboard?.columns?.filter(col => !col.isArchived)?.length || 0} kolumner</span>
                      <span>•</span>
                      <span>{getTotalNewsCount()} händelser</span>
                    </div>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-slate-400 smooth-transition ${showDashboardDropdown ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dashboard Dropdown */}
                {showDashboardDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-72 glass rounded-xl shadow-soft-lg border border-slate-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-200/50">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Dashboards
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowCreateDashboardModal(true)
                        setShowDashboardDropdown(false)
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 smooth-transition flex items-center gap-3"
                    >
                      <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center text-sm font-bold">
                        +
                      </div>
                      <span className="font-medium text-slate-900">Ny Dashboard</span>
                    </button>
                    
                    <div className="border-t border-slate-200/50 mt-1 pt-1">
                      {allDashboards.map((dash) => (
                        <button
                          key={dash.id}
                          onClick={() => {
                            if (dash.slug !== dashboard.slug) {
                              navigateToDashboard(dash.slug)
  }

                            setShowDashboardDropdown(false)
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-slate-50 smooth-transition flex items-center justify-between ${
                            dash.id === dashboard.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{dash.name}</div>
                            {dash.description && (
                              <div className="text-xs text-slate-500 mt-1">{dash.description}</div>
                            )}
                            <div className="text-xs text-slate-400 mt-1">
                              {dash.columnCount ?? 0} kolumner
                            </div>
                          </div>
                          {dash.id === dashboard.id && (
                            <div className="text-blue-500 text-sm">✓</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <span>{isLoading ? 'Uppdaterar...' : `Live • ${lastUpdate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })}`}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAddColumnModal(true)}
                  className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 smooth-transition text-sm font-medium"
                >
                  + Lägg till kolumn
                </button>
                <button
                  onClick={fetchColumnData}
                  disabled={isLoading}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 smooth-transition text-sm font-medium"
                >
                  🔄 Uppdatera
                </button>
                <Link
                  href={`/admin?dashboardId=${dashboard.id}`}
                  className="px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 smooth-transition text-sm font-medium"
                >
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TweetDeck-style Columns */}
      <div className="flex overflow-x-auto h-[calc(100vh-100px)]">
        {(dashboard?.columns || [])
          .filter(col => !col.isArchived)
          .sort((a, b) => a.order - b.order)
          .map((column) => {
            const columnItems = memoizedColumnData[column.id] || []

            // Use a very stable column container that never changes
            return (
              <div
                key={column.id}
                data-column-id={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`flex-shrink-0 w-80 bg-white border-r border-gray-200 flex flex-col transition-colors ${
                  draggedColumn === column.id ? 'opacity-50' : ''
                } ${
                  dragOverColumn === column.id && draggedColumn !== column.id ? 'border-l-4 border-blue-500 bg-blue-50' : ''
                }`}
              >
                {/* Static header with drag handle */}
                <div className="glass border-b border-slate-200/50 p-4 rounded-t-xl relative">
                  {/* Drag handle */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, column.id)}
                    onDragEnd={handleDragEnd}
                    className="absolute left-0 top-0 bottom-0 w-6 cursor-move hover:bg-gray-100 rounded-l-xl flex flex-col items-center justify-center gap-1 opacity-40 hover:opacity-80 transition-all"
                    title="Dra för att flytta kolumn"
                  >
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  </div>
                  {editingColumn === column.id ? (
                    // Edit Mode
                    <div className="ml-6 space-y-3 bg-muted/50 p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Inställningar
                        </h4>
                        <Button
                          type="button"
                          onClick={() => setEditingColumn(null)}
                          variant="ghost"
                          size="icon"
                          title="Stäng"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <form onSubmit={(e) => {
                        e.preventDefault()
                        updateColumn(column.id, editTitle, editDescription, editFlowId)
                      }} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Kolumnnamn *
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="t.ex. Breaking News"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Beskrivning
                          </label>
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Valfri beskrivning..."
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            📌 Kolumn-ID
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={column.id}
                              readOnly
                              className="flex-1 px-2 py-1.5 text-xs bg-gray-100 border border-gray-300 rounded font-mono text-gray-600"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(column.id, column.id, column.title)}
                              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                              title="Kopiera kolumn-ID"
                            >
                              {copiedId === column.id ? '✓' : '📋'}
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">
                            Skicka data direkt hit med Kolumn-ID.
                          </p>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-gray-600">
                              🔗 Anslut till Workflow
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowWorkflowHelp(!showWorkflowHelp)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              ℹ️ Hur gör jag?
                            </button>
                          </div>

                          {/* Expandable help */}
                          {showWorkflowHelp && (
                            <div className="mb-2 p-2 bg-blue-50 rounded-md text-[10px] text-blue-800 space-y-1">
                              <div className="font-medium">📖 Så här ansluter du en workflow:</div>
                              <ol className="list-decimal list-inside space-y-0.5 ml-1">
                                <li>
                                  Öppna din Workflows-applikation{' '}
                                  <a
                                    href="https://newsdeck-389280113319.europe-west1.run.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline font-medium"
                                  >
                                    → Öppna här
                                  </a>
                                </li>
                                <li>Välj den workflow du vill ansluta, se till att ditt workflow har noden &quot;PostToNewsdeck&quot; i slutet av flödet.</li>
                                <li>Kopiera workflow-URLen från adressfältet</li>
                                <li>Klistra in här nedanför</li>
                              </ol>
                              <div className="text-blue-600 mt-1">Vi extraherar automatiskt ID:t från URLen.</div>
                            </div>
                          )}

                          {/* Connection status indicator */}
                          {editFlowId ? (
                            <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-md mb-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-emerald-600 font-medium">✅ Ansluten</span>
                                <button
                                  type="button"
                                  onClick={() => setEditFlowId('')}
                                  className="ml-auto text-xs text-gray-600 hover:text-red-600"
                                >
                                  🗑️ Koppla från
                                </button>
                              </div>
                              <div className="text-[10px] text-emerald-700 mt-1">
                                Workflow-ID: <code className="bg-white px-1 rounded">{editFlowId}</code>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={editFlowId}
                                onChange={(e) => setEditFlowId(e.target.value)}
                                onBlur={(e) => {
                                  const extracted = extractWorkflowId(e.target.value)
                                  setEditFlowId(extracted)
                                  if (extracted && extracted !== e.target.value) {
                                    setShowExtractionSuccess(true)
                                    setTimeout(() => setShowExtractionSuccess(false), 3000)
                                  }
                                }}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Klistra in workflow-URL från Workflows-appen"
                              />
                              {showExtractionSuccess && (
                                <div className="text-[10px] text-green-600">
                                  ✓ Workflow-ID extraherat från URL
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] text-gray-500 flex-1">
                                  Fyll denna kolumn automatiskt med nyheter från en AI-workflow
                                </p>
                                <a
                                  href="https://newsdeck-389280113319.europe-west1.run.app/"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-600 hover:underline whitespace-nowrap"
                                >
                                  🔗 Öppna Workflows-appen →
                                </a>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-300">
                          <button
                            type="submit"
                            className="flex-1 px-3 py-2 bg-green-500 text-white text-xs rounded hover:bg-green-600 font-medium"
                          >
                            💾 Spara ändringar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Är du säker på att du vill arkivera "${column.title}"?`)) {
                                removeColumn(column.id)
                                setEditingColumn(null)
                              }
                            }}
                            className="px-3 py-2 bg-red-500 text-white text-xs rounded hover:bg-red-600 font-medium"
                            title="Arkivera kolumn"
                          >
                            🗄️ Arkivera
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex justify-between items-start ml-6">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-800">
                            {column.title}
                          </h3>
                          <Button
                            onClick={() => startEditing(column)}
                            variant="ghost"
                            size="icon"
                            title="Inställningar"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {columnItems.length} händelser
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Static scrollable area */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnItems.length === 0 ? (
                    <div className="text-center py-8 px-4 text-gray-500 text-sm">
                      <div className="mb-4 flex justify-center">
                        <Image src="/newsdeck-icon.svg" alt="Newsdeck logo" width={48} height={48} className="w-12 h-12 object-contain opacity-40" />
                      </div>
                      <div className="font-medium text-gray-700 mb-3">Denna kolumn är tom</div>

                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-blue-50 rounded-lg text-left">
                          <div className="font-medium text-blue-800 mb-1 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            För automatiska nyheter:
                          </div>
                          <div className="text-blue-700 mb-2 flex items-center gap-1">
                            Klicka på <Settings className="h-3 w-3 inline" /> och anslut en workflow
                          </div>
                          <Button
                            asChild
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-blue-600 hover:underline font-medium"
                          >
                            <a
                              href="https://newsdeck-389280113319.europe-west1.run.app/"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Öppna Workflows-appen →
                            </a>
                          </Button>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg text-left">
                          <div className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Copy className="h-3 w-3" />
                            För manuell publicering:
                          </div>
                          <div className="text-gray-600 flex items-center gap-1">
                            Använd Kolumn-ID från inställningar <Settings className="h-3 w-3 inline" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    columnItems.map((item, index) => (
                      <div key={`${column.id}-${item.id}-${index}`} className="mb-2">
                        <NewsItem
                          item={item}
                          compact={true}
                          onClick={() => setSelectedNewsItem(item)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

        {/* Add Column Button */}
        <div className="flex-shrink-0 w-80 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
          <button
            onClick={() => setShowAddColumnModal(true)}
            className="flex flex-col items-center text-gray-600 hover:text-gray-800 p-8"
          >
            <div className="w-12 h-12 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-2xl mb-2">
              +
            </div>
            <span className="text-sm">Lägg till kolumn</span>
          </button>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">✨ Skapa ny kolumn</h3>
                <button
                  onClick={() => {
                    setShowAddColumnModal(false)
                    setNewColumnTitle('')
                    setNewColumnDescription('')
                    setNewColumnFlowId('')
                    setUrlExtracted(false)
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              
              {/* Tab buttons */}
              <div className="flex mb-4 border-b">
                <button
                  onClick={() => setShowArchivedColumns(false)}
                  className={`px-4 py-2 font-medium text-sm ${
                    !showArchivedColumns 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Skapa ny
                </button>
                <button
                  onClick={() => setShowArchivedColumns(true)}
                  className={`px-4 py-2 font-medium text-sm ${
                    showArchivedColumns 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Återställ ({archivedColumns.length})
                </button>
              </div>

              {!showArchivedColumns ? (
                // Create new column form
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (newColumnTitle.trim()) {
                    addColumn(newColumnTitle, newColumnDescription, newColumnFlowId)
                  }
                }}>
                  <div className="space-y-4">
                    {/* Column Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kolumnnamn *
                      </label>
                      <input
                        type="text"
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="t.ex. Breaking News Stockholm"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Workflow Connection Section */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      {(dashboard?.columns?.filter(col => !col.isArchived) || []).length === 0 && (
                        <div className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full mb-2">
                          🎯 Rekommenderat för första kolumnen
                        </div>
                      )}

                      <div className="font-medium text-gray-800 mb-2">
                        🤖 Vill du fylla denna kolumn automatiskt?
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        Anslut en AI-workflow för att automatiskt ta emot nyheter - inga fler steg krävs!
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showWorkflowInput}
                          onChange={(e) => setShowWorkflowInput(e.target.checked)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          Ja, anslut workflow
                        </span>
                      </label>
                    </div>

                    {/* Workflow Input (Conditional) */}
                    {showWorkflowInput ? (
                      <div className="space-y-3 p-4 bg-blue-50 rounded-lg transition-all duration-200 ease-in-out">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Workflow-URL
                          </label>
                          <input
                            type="text"
                            value={newColumnFlowId}
                            onChange={(e) => setNewColumnFlowId(e.target.value)}
                            onBlur={(e) => {
                              const extracted = extractWorkflowId(e.target.value)
                              if (extracted && extracted !== e.target.value) {
                                setNewColumnFlowId(extracted)
                                setUrlExtracted(true)
                                setTimeout(() => setUrlExtracted(false), 3000)
                              } else {
                                setNewColumnFlowId(extracted)
                              }
                            }}
                            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Klistra in URL från Workflows-appen"
                          />
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-600">
                              💡 Vi extraherar automatiskt ID:t från URL:en
                            </p>
                            {urlExtracted && (
                              <div className="text-xs text-green-600 font-medium">
                                ✓ Workflow-ID extraherat
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step-by-step Guide */}
                        <div className="p-3 bg-blue-100 rounded-md text-sm text-blue-800">
                          <div className="font-medium mb-2 flex items-center gap-1">
                            <Info className="h-4 w-4" />
                            Så här gör du:
                          </div>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>
                              <a
                                href="https://newsdeck-389280113319.europe-west1.run.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-medium"
                              >
                                🔗 Öppna Workflows-appen →
                              </a>
                            </li>
                            <li>Välj din workflow med &quot;PostToNewsdeck&quot;-nod</li>
                            <li>Kopiera URL:en från adressfältet</li>
                            <li>Klistra in här ovan</li>
                          </ol>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                        <Info className="h-4 w-4 flex-shrink-0" />
                        <span>Inget problem! Du kan ansluta en workflow senare via inställningar <Settings className="h-3 w-3 inline" /></span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4 mt-6 border-t">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                      disabled={!newColumnTitle.trim()}
                    >
                      ✨ Skapa kolumn
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddColumnModal(false)
                        setNewColumnTitle('')
                        setNewColumnDescription('')
                        setNewColumnFlowId('')
                        setUrlExtracted(false)
                        setShowArchivedColumns(false)
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              ) : (
                // Restore archived columns
                <div className="space-y-3">
                  {archivedColumns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="mb-2">📦</div>
                      <div>Inga arkiverade kolumner</div>
                    </div>
                  ) : (
                    archivedColumns.map((column) => (
                      <div key={column.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{column.title}</div>
                          {column.description && (
                            <div className="text-sm text-gray-600 mt-1">{column.description}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Arkiverad: {new Date(column.archivedAt || '').toLocaleDateString('sv-SE')}
                          </div>
                        </div>
                        <button
                          onClick={() => restoreColumn(column.id)}
                          className="ml-3 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          Återställ
                        </button>
                      </div>
                    ))
                  )}
                  
                  <div className="flex justify-end pt-4 mt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddColumnModal(false)
                        setShowArchivedColumns(false)
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Stäng
                    </button>
                  </div>
                </div>
              )}

              {!showArchivedColumns && (
                <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1 flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      Vad händer sen?
                    </div>
                    <div className="flex items-center gap-1">
                      {showWorkflowInput
                        ? <>När kolumnen är skapad börjar den ta emot nyheter från din workflow automatiskt. Du kan också se Kolumn-ID i inställningar <Settings className="h-3 w-3 inline" /> för manuell publicering.</>
                        : <>Kolumnen får ett unikt Kolumn-ID som du hittar i inställningar <Settings className="h-3 w-3 inline" />. Använd det för att skicka data från workflows eller andra källor.</>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          {toastMessage}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-3 py-2 text-xs text-gray-600 border">
        🔄 Auto-uppdatering var 5:e sekund
      </div>

      {/* News Item Modal */}
      <NewsItemModal 
        item={selectedNewsItem}
        onClose={() => setSelectedNewsItem(null)}
      />

      {/* Custom Drag Preview */}
      {dragPreview.visible && draggedColumn && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: dragPreview.x - 160, // Center the 320px wide column
            top: dragPreview.y - 50,
            transform: 'rotate(2deg) scale(0.8)',
          }}
        >
          {(() => {
            const column = dashboard?.columns?.find(col => col.id === draggedColumn)
            if (!column) return null

            return (
              <div className="w-80 bg-white border-2 border-blue-500 rounded-xl shadow-2xl opacity-90">
                <div className="glass border-b border-slate-200/50 p-4 rounded-t-xl">
                  <div className="flex justify-between items-start ml-6">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-800">
                            {column.title}
                          </h3>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {memoizedColumnData[column.id]?.length || 0} händelser
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 text-center text-gray-500 text-sm">
                  Drar kolumn...
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Create Dashboard Modal */}
      {showCreateDashboardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Skapa ny dashboard</h3>
                <button
                  onClick={() => {
                    setShowCreateDashboardModal(false)
                    setNewDashboardName('')
                    setNewDashboardDescription('')
                  }}
                  className="text-slate-500 hover:text-slate-700 text-xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault()
                if (newDashboardName.trim()) {
                  createDashboard(newDashboardName, newDashboardDescription)
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Dashboard namn *
                    </label>
                    <input
                      type="text"
                      value={newDashboardName}
                      onChange={(e) => setNewDashboardName(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="t.ex. Nyheter Stockholm"
                      required
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Beskrivning (valfritt)
                    </label>
                    <textarea
                      value={newDashboardDescription}
                      onChange={(e) => setNewDashboardDescription(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Beskriv vad denna dashboard ska innehålla..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4 mt-6 border-t border-slate-200">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 smooth-transition font-medium"
                    disabled={!newDashboardName.trim()}
                  >
                    Skapa dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDashboardModal(false)
                      setNewDashboardName('')
                      setNewDashboardDescription('')
                    }}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 smooth-transition font-medium"
                  >
                    Avbryt
                  </button>
                </div>
              </form>
              
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">💡 Tips:</div>
                  <div>Du kommer att kunna lägga till kolumner i din nya dashboard efter att den skapats.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
