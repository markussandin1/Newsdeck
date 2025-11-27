'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Dashboard as DashboardType, NewsItem as NewsItemType, DashboardColumn } from '@/lib/types'
import { ColumnData } from '@/lib/dashboard/types'
import { extractWorkflowId } from '@/lib/dashboard/utils'
import { useDashboardData } from '@/lib/dashboard/hooks/useDashboardData'
import { useDashboardPolling } from '@/lib/dashboard/hooks/useDashboardPolling'
import { useColumnNotifications } from '@/lib/dashboard/hooks/useColumnNotifications'
import { useDashboardLayout } from '@/lib/dashboard/hooks/useDashboardLayout'
import NewsItem from './NewsItem'
import NewsItemModal from './NewsItemModal'
import { Button } from './ui/button'
import { Settings, X, Copy, Info, Check, Save, Archive, Trash2, Link2, CheckCircle, Volume2, VolumeX, Menu, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ColumnMapButton from './ColumnMapButton'

interface MainDashboardProps {
  dashboard: DashboardType
  onDashboardUpdate: (dashboard: DashboardType) => void
  dashboardSlug?: string
}

export default function MainDashboard({ dashboard, onDashboardUpdate, dashboardSlug }: MainDashboardProps) {
  const router = useRouter()

  const effectiveDashboardSlug = dashboardSlug || dashboard.slug || (dashboard.id === 'main-dashboard' ? 'main' : dashboard.id)

  // Dashboard data management (extracted to hook)
  const {
    columnData,
    archivedColumns,
    allDashboards,
    lastUpdate,
    isLoading,
    fetchColumnData,
    loadArchivedColumns,
    updateColumnData,
  } = useDashboardData({ dashboard })

  // Audio notification management (extracted to hook)
  const {
    mutedColumns,
    showAudioPrompt,
    toggleMute,
    playNotification,
    enableAudio,
    disableAudio,
  } = useColumnNotifications({ dashboardId: dashboard.id })

  // Long-polling for real-time updates (extracted to hook)
  const { connectionStatus } = useDashboardPolling({
    columns: dashboard?.columns || [],
    updateColumnData,
    onNewItems: playNotification,
  })

  // Layout and mobile state management (extracted to hook)
  const {
    isMobile,
    activeColumnIndex,
    showMobileMenu,
    showDashboardDropdown,
    pullDistance,
    isRefreshing,
    scrollContainerRef,
    dropdownRef,
    activeColumns,
    setShowMobileMenu,
    setShowDashboardDropdown,
    nextColumn,
    prevColumn,
    goToColumn,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDashboardLayout({
    columns: dashboard?.columns || [],
    onRefresh: fetchColumnData,
  })

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
  const [showArchivedColumns, setShowArchivedColumns] = useState(false)
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItemType | null>(null)
  const [showCreateDashboardModal, setShowCreateDashboardModal] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [newDashboardDescription, setNewDashboardDescription] = useState('')
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
  const [showWorkflowHelp, setShowWorkflowHelp] = useState(false)
  const [showExtractionSuccess, setShowExtractionSuccess] = useState(false)

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

  // Separate component for column content with pagination (no memo wrapper - allow all updates)
  const ColumnContent = ({
    columnId,
    items,
    onSelectNewsItem
  }: {
    columnId: string
    items: NewsItemType[]
    onSelectNewsItem: (item: NewsItemType) => void
  }) => {
    const [displayCount, setDisplayCount] = useState(25)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    // Reset display count when items change significantly
    useEffect(() => {
      if (items.length < displayCount) {
        setDisplayCount(25)
      }
    }, [items.length, displayCount])

    // Intersection Observer for infinite scroll
    useEffect(() => {
      if (!loadMoreRef.current) return

      const observer = new IntersectionObserver(
        (entries) => {
          const firstEntry = entries[0]
          if (firstEntry?.isIntersecting && displayCount < items.length) {
            // Load 25 more items
            setDisplayCount(prev => Math.min(prev + 25, items.length))
          }
        },
        {
          root: null,
          rootMargin: '200px', // Start loading when 200px from bottom
          threshold: 0.1
        }
      )

      observer.observe(loadMoreRef.current)

      return () => observer.disconnect()
    }, [displayCount, items.length])

    if (items.length === 0) {
      return (
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
                  href="https://workflows-lab-iap.bnu.bn.nr/"
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
      )
    }

    const visibleItems = items.slice(0, displayCount)
    const hasMore = displayCount < items.length

    return (
      <>
        {visibleItems.map((item, index) => (
          <div key={`${columnId}-${item.dbId}`} className="mb-2">
            <NewsItem
              item={item}
              compact={true}
              onClick={() => onSelectNewsItem(item)}
            />
          </div>
        ))}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center py-4 text-xs text-gray-400"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}
      </>
    )
  }

  ColumnContent.displayName = 'ColumnContent'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="glass border-b border-slate-200 sticky top-0 z-50 safe-area-top">
        <div className="px-4 py-4 safe-area-left safe-area-right">
          {isMobile ? (
            // Mobile Header
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowMobileMenu(true)}
                className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg smooth-transition"
                aria-label="Öppna meny"
              >
                <Menu className="h-6 w-6 text-slate-700" />
              </button>

              <div className="flex-1 text-center px-4">
                <h1 className="text-base font-semibold text-slate-900 truncate">
                  {activeColumns[activeColumnIndex]?.title || dashboard.name}
                </h1>
                <div className="text-xs text-slate-500">
                  {activeColumns[activeColumnIndex]
                    ? `${memoizedColumnData[activeColumns[activeColumnIndex].id]?.length || 0} händelser`
                    : `${activeColumns.length} kolumner`
                  }
                </div>
              </div>

              <button
                onClick={() => setShowDashboardDropdown(true)}
                className="p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg smooth-transition"
                aria-label="Fler alternativ"
              >
                <MoreVertical className="h-6 w-6 text-slate-700" />
              </button>
            </div>
          ) : (
            // Desktop Header
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
                            className={`w-full px-4 py-3 text-left hover:bg-slate-50 smooth-transition flex items-center justify-between ${dash.id === dashboard.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
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
          )}
        </div>
      </div>

      {/* TweetDeck-style Columns / Mobile Single Column View */}
      <div className={isMobile ? "h-[calc(100vh-80px)] overflow-hidden" : "flex overflow-x-auto h-[calc(100vh-100px)]"}>
        {isMobile ? (
          // Mobile: Show one column at a time with swipe gestures
          activeColumns.length > 0 && activeColumns[activeColumnIndex] ? (
            <div className="relative h-full">
              {/* Navigation buttons - Left/Right arrows */}
              {activeColumns.length > 1 && (
                <>
                  {activeColumnIndex > 0 && (
                    <button
                      onClick={prevColumn}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white active:bg-slate-100 shadow-lg rounded-full p-3 transition-all"
                      aria-label="Föregående kolumn"
                    >
                      <ChevronLeft className="h-6 w-6 text-slate-700" />
                    </button>
                  )}
                  {activeColumnIndex < activeColumns.length - 1 && (
                    <button
                      onClick={nextColumn}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white active:bg-slate-100 shadow-lg rounded-full p-3 transition-all"
                      aria-label="Nästa kolumn"
                    >
                      <ChevronRight className="h-6 w-6 text-slate-700" />
                    </button>
                  )}
                </>
              )}

              <motion.div
                key={activeColumns[activeColumnIndex].id}
                className="h-full bg-white flex flex-col"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  const threshold = 50 // Minimum swipe distance
                  const velocity = info.velocity.x

                  // Swipe right (previous column)
                  if (info.offset.x > threshold || velocity > 500) {
                    prevColumn()
                  }
                  // Swipe left (next column)
                  else if (info.offset.x < -threshold || velocity < -500) {
                    nextColumn()
                  }
                }}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
              >
                {/* Pull-to-refresh indicator */}
                <div
                  className="flex items-center justify-center transition-all duration-200 bg-blue-50"
                  style={{
                    height: pullDistance,
                    opacity: Math.min(pullDistance / 60, 1)
                  }}
                >
                  {isRefreshing ? (
                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Uppdaterar...</span>
                    </div>
                  ) : pullDistance > 0 ? (
                    <div className="text-blue-600 text-sm flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: pullDistance > 60 ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        ↓
                      </motion.div>
                      <span>{pullDistance > 60 ? 'Släpp för att uppdatera' : 'Dra för att uppdatera'}</span>
                    </div>
                  ) : null}
                </div>

                {/* Mobile column content without header (header is in mobile header) */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto p-3"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    transform: `translateY(${pullDistance}px)`,
                    transition: isRefreshing || pullDistance === 0 ? 'transform 0.2s ease-out' : 'none'
                  }}
                >
                  <ColumnContent
                    columnId={activeColumns[activeColumnIndex].id}
                    items={memoizedColumnData[activeColumns[activeColumnIndex].id] || []}
                    onSelectNewsItem={setSelectedNewsItem}
                  />
                </div>

                {/* Mobile Column Indicator - Dots at bottom */}
                {activeColumns.length > 1 && (
                  <div className="safe-area-bottom pb-4 pt-2 bg-white border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      {activeColumns.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToColumn(index)}
                          className="p-2"
                          aria-label={`Gå till kolumn ${index + 1}`}
                        >
                          <motion.div
                            className={`rounded-full transition-all ${index === activeColumnIndex
                                ? 'bg-blue-500 w-8 h-2'
                                : 'bg-gray-300 w-2 h-2'
                              }`}
                            layout
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            // No columns available
            <div className="flex items-center justify-center h-full p-8 text-center">
              <div>
                <div className="mb-4 flex justify-center">
                  <Image src="/newsdeck-icon.svg" alt="Newsdeck logo" width={64} height={64} className="w-16 h-16 object-contain opacity-40" />
                </div>
                <div className="text-gray-500 mb-4">Inga kolumner ännu</div>
                <button
                  onClick={() => setShowAddColumnModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 smooth-transition text-sm font-medium"
                >
                  + Lägg till kolumn
                </button>
              </div>
            </div>
          )
        ) : (
          // Desktop: Show all columns side by side
          (dashboard?.columns || [])
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
                  className={`flex-shrink-0 w-80 bg-white border-r border-gray-200 flex flex-col transition-colors ${draggedColumn === column.id ? 'opacity-50' : ''
                    } ${dragOverColumn === column.id && draggedColumn !== column.id ? 'border-l-4 border-blue-500 bg-blue-50' : ''
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
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Kolumnnamn *
                            </label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-input rounded focus:ring-2 focus:ring-ring focus:border-ring bg-background"
                              placeholder="t.ex. Breaking News"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Beskrivning
                            </label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs border border-input rounded resize-none focus:ring-2 focus:ring-ring focus:border-ring bg-background"
                              placeholder="Valfri beskrivning..."
                              rows={2}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <Copy className="h-3 w-3" />
                              Kolumn-ID
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={column.id}
                                readOnly
                                className="flex-1 px-2 py-1.5 text-xs bg-muted border border-input rounded font-mono text-muted-foreground"
                              />
                              <Button
                                type="button"
                                onClick={() => copyToClipboard(column.id, column.id, column.title)}
                                size="sm"
                                title="Kopiera kolumn-ID"
                              >
                                {copiedId === column.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Skicka data direkt hit med Kolumn-ID.
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Link2 className="h-3 w-3" />
                                Anslut till Workflow
                              </label>
                              <Button
                                type="button"
                                onClick={() => setShowWorkflowHelp(!showWorkflowHelp)}
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-xs"
                              >
                                <Info className="h-3 w-3 mr-1" />
                                Hur gör jag?
                              </Button>
                            </div>

                            {/* Expandable help */}
                            {showWorkflowHelp && (
                              <div className="mb-2 p-2 bg-blue-50 rounded-md text-[10px] text-blue-800 space-y-1">
                                <div className="font-medium flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  Så här ansluter du en workflow:
                                </div>
                                <ol className="list-decimal list-inside space-y-0.5 ml-1">
                                  <li>
                                    Öppna Workflows{' '}
                                    <a
                                      href="https://newsdeck-389280113319.europe-west1.run.app/"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline font-medium"
                                    >
                                      → Öppna här
                                    </a>
                                  </li>
                                  <li>Välj det workflow du vill ansluta, se till att ditt workflow har noden &quot;PostToNewsdeck&quot; i slutet av flödet.</li>
                                  <li>Kopiera workflow-URL:en från adressfältet</li>
                                  <li>Klistra in här nedanför</li>
                                </ol>
                                <div className="text-blue-600 mt-1">Vi extraherar automatiskt ID:t från URLen.</div>
                              </div>
                            )}

                            {/* Connection status indicator */}
                            {editFlowId ? (
                              <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-md mb-2">
                                <div className="flex items-center gap-2 text-xs">
                                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                                  <span className="text-emerald-600 font-medium">Ansluten</span>
                                  <Button
                                    type="button"
                                    onClick={() => setEditFlowId('')}
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto h-auto p-1 text-xs hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Koppla från
                                  </Button>
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
                                  className="w-full px-2 py-1.5 text-xs border border-input rounded font-mono focus:ring-2 focus:ring-ring focus:border-ring bg-background"
                                  placeholder="Klistra in workflow-URL från Workflows-appen"
                                />
                                {showExtractionSuccess && (
                                  <div className="text-[10px] text-success flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Workflow-ID extraherat från URL
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-muted-foreground flex-1">
                                    Fyll denna kolumn automatiskt med nyheter från en AI-workflow
                                  </p>
                                  <Button
                                    asChild
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-[10px] whitespace-nowrap"
                                  >
                                    <a
                                      href="https://workflows-lab-iap.bnu.bn.nr/"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Öppna Workflows →
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-border">
                            <Button
                              type="submit"
                              className="flex-1"
                              size="sm"
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Spara ändringar
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                if (confirm(`Är du säker på att du vill arkivera "${column.title}"?`)) {
                                  removeColumn(column.id)
                                  setEditingColumn(null)
                                }
                              }}
                              variant="destructive"
                              size="sm"
                              title="Arkivera kolumn"
                            >
                              <Archive className="h-3 w-3 mr-1" />
                              Arkivera
                            </Button>
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
                            <div className="flex items-center gap-1">
                              {effectiveDashboardSlug && (
                                <ColumnMapButton
                                  dashboardSlug={effectiveDashboardSlug}
                                  columnId={column.id}
                                  columnTitle={column.title}
                                />
                              )}
                              <Button
                                onClick={() => toggleMute(column.id)}
                                variant="ghost"
                                size="icon"
                                title={mutedColumns.has(column.id) ? "Ljud av - Klicka för att aktivera" : "Ljud på - Klicka för att stänga av"}
                              >
                                {mutedColumns.has(column.id) ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                              </Button>
                              <Button
                                onClick={() => startEditing(column)}
                                variant="ghost"
                                size="icon"
                                title="Inställningar"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {columnItems.length} händelser
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Static scrollable area */}
                  <div className="flex-1 overflow-y-auto p-2">
                    <ColumnContent
                      columnId={column.id}
                      items={columnItems}
                      onSelectNewsItem={setSelectedNewsItem}
                    />
                  </div>
                </div>
              )
            })
        )}
        {/* Add Column Button - Desktop only */}
        {!isMobile && (
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
        )}
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
                  className={`px-4 py-2 font-medium text-sm ${!showArchivedColumns
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                >
                  Skapa ny
                </button>
                <button
                  onClick={() => setShowArchivedColumns(true)}
                  className={`px-4 py-2 font-medium text-sm ${showArchivedColumns
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

      {/* Audio Prompt */}
      {showAudioPrompt && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start gap-3">
            <Volume2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium mb-1">Ljud blockerat</div>
              <div className="text-sm text-amber-50 mb-3">
                Din webbläsare blockerar ljud. Klicka på knappen för att aktivera notisljud.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={enableAudio}
                  className="px-4 py-2 bg-white text-amber-600 rounded-lg hover:bg-amber-50 font-medium text-sm"
                >
                  Aktivera ljud
                </button>
                <button
                  onClick={disableAudio}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
                >
                  Aldrig
                </button>
              </div>
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

      {/* Real-time connection indicator */}
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-3 py-2 text-xs text-gray-600 border">
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' && (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Live</span>
            </>
          )}
          {connectionStatus === 'connecting' && (
            <>
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span>Ansluter...</span>
            </>
          )}
          {connectionStatus === 'disconnected' && (
            <>
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>Återansluter...</span>
            </>
          )}
        </div>
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

      {/* Mobile Menu (Hamburger) */}
      <AnimatePresence>
        {showMobileMenu && isMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />

            {/* Drawer from left */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl overflow-y-auto safe-area-left safe-area-top safe-area-bottom"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image src="/newsdeck-icon.svg" alt="Newsdeck" width={40} height={40} className="w-10 h-10" />
                  <h2 className="text-lg font-semibold text-slate-900">Newsdeck</h2>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                  aria-label="Stäng meny"
                >
                  <X className="h-6 w-6 text-slate-700" />
                </button>
              </div>

              {/* Current Dashboard Info */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <div className="text-xs text-slate-500 mb-1">Aktiv dashboard</div>
                <div className="font-semibold text-slate-900">{dashboard.name}</div>
                <div className="text-sm text-slate-600 mt-1">
                  {activeColumns.length} kolumner • {getTotalNewsCount()} händelser
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                {/* Dashboards Section */}
                <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Dashboards
                </div>

                {allDashboards.map((dash) => (
                  <button
                    key={dash.id}
                    onClick={() => {
                      if (dash.slug !== dashboard.slug) {
                        navigateToDashboard(dash.slug)
                      }
                      setShowMobileMenu(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left smooth-transition ${dash.id === dashboard.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{dash.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {dash.columnCount ?? 0} kolumner
                      </div>
                    </div>
                    {dash.id === dashboard.id && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </button>
                ))}

                <button
                  onClick={() => {
                    setShowCreateDashboardModal(true)
                    setShowMobileMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700 mt-1"
                >
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                    +
                  </div>
                  <span className="font-medium">Ny Dashboard</span>
                </button>

                {/* Actions Section */}
                <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-t border-slate-200 pt-4">
                  Åtgärder
                </div>

                <button
                  onClick={() => {
                    setShowAddColumnModal(true)
                    setShowMobileMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
                >
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                    +
                  </div>
                  <span className="font-medium">Lägg till kolumn</span>
                </button>

                <button
                  onClick={async () => {
                    await fetchColumnData()
                    setShowMobileMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
                >
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    🔄
                  </div>
                  <span className="font-medium">Uppdatera data</span>
                </button>

                <Link
                  href={`/admin?dashboardId=${dashboard.id}`}
                  onClick={() => setShowMobileMenu(false)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
                >
                  <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Admin</span>
                </Link>
              </div>

              {/* Footer Info */}
              <div className="p-4 border-t border-slate-200 mt-4 text-xs text-slate-500">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <span>
                    {connectionStatus === 'connected' ? 'Live-uppdateringar aktiva' : 'Ansluter...'}
                  </span>
                </div>
                <div>Senast uppdaterad: {lastUpdate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Column Actions Menu (Three Dots) */}
      <AnimatePresence>
        {showDashboardDropdown && isMobile && activeColumns[activeColumnIndex] && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDashboardDropdown(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed left-0 right-0 bottom-0 bg-white z-50 rounded-t-2xl shadow-2xl safe-area-bottom safe-area-left safe-area-right"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-slate-300 rounded-full"></div>
              </div>

              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 text-center">
                  {activeColumns[activeColumnIndex]?.title}
                </h3>
                <p className="text-xs text-slate-500 text-center mt-1">
                  {memoizedColumnData[activeColumns[activeColumnIndex]?.id]?.length || 0} händelser
                </p>
              </div>

              {/* Actions */}
              <div className="p-2 pb-4">
                <button
                  onClick={() => {
                    toggleMute(activeColumns[activeColumnIndex].id)
                    setShowDashboardDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
                >
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                    {mutedColumns.has(activeColumns[activeColumnIndex].id) ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {mutedColumns.has(activeColumns[activeColumnIndex].id) ? 'Aktivera ljud' : 'Stäng av ljud'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {mutedColumns.has(activeColumns[activeColumnIndex].id)
                        ? 'Notisljud är avstängt för denna kolumn'
                        : 'Ljudnotiser för nya händelser'}
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    startEditing(activeColumns[activeColumnIndex])
                    setShowDashboardDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
                >
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Inställningar</div>
                    <div className="text-xs text-slate-500">Redigera kolumn och workflow</div>
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await fetchColumnData()
                    setShowDashboardDropdown(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left hover:bg-slate-50 text-slate-700"
                >
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                    🔄
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Uppdatera</div>
                    <div className="text-xs text-slate-500">Hämta nya händelser</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowDashboardDropdown(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Avbryt
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
