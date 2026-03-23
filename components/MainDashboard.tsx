'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Dashboard as DashboardType, NewsItem as NewsItemType, DashboardColumn } from '@/lib/types'
import { ColumnData } from '@/lib/dashboard/types'
import { useDashboardData } from '@/lib/dashboard/hooks/useDashboardData'
import { useDashboardStream } from '@/lib/dashboard/hooks/useDashboardStream'
import { usePendingImagePolling } from '@/lib/dashboard/hooks/usePendingImagePolling'
import { useColumnNotifications } from '@/lib/dashboard/hooks/useColumnNotifications'
import { useNotificationSettings } from '@/lib/dashboard/hooks/useNotificationSettings'
import { useDesktopNotifications } from '@/lib/dashboard/hooks/useDesktopNotifications'
import { useDashboardLayout } from '@/lib/dashboard/hooks/useDashboardLayout'
import { useGeoFilters } from '@/lib/dashboard/hooks/useGeoFilters'
import { useColumnOperations } from '@/lib/dashboard/hooks/useColumnOperations'
import { useClipboard } from '@/lib/dashboard/hooks/useClipboard'
import { ThemeToggle } from './theme-toggle'
import NewsItemModal from './NewsItemModal'
import { Menu, MoreVertical, ChevronLeft, ChevronRight, Volume2, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { DashboardHeader } from './DashboardHeader'
import { NotificationSettingsModal } from './NotificationSettingsModal'
import { ColumnCard } from './column/ColumnCard'
import { ColumnContent } from './column/ColumnContent'
import { AddColumnModal } from './dashboard/AddColumnModal'
import { CreateDashboardModal } from './dashboard/CreateDashboardModal'
import { DashboardFilterBar } from './dashboard/DashboardFilterBar'
import { MobileMenu } from './dashboard/MobileMenu'
import { MobileColumnActions } from './dashboard/MobileColumnActions'
import { MobileDragPreview } from './dashboard/MobileDragPreview'

interface MainDashboardProps {
  dashboard: DashboardType
  onDashboardUpdate: (dashboard: DashboardType) => void
  dashboardSlug?: string
}

export default function MainDashboard({ dashboard, onDashboardUpdate, dashboardSlug }: MainDashboardProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Geographic filters
  const geoFilters = useGeoFilters({ dashboardId: dashboard.id })

  const memoizedGeoFilters = useMemo(() => ({
    regionCodes: geoFilters.allRegionCodes,
    municipalityCodes: geoFilters.filters.municipalityCodes,
    showItemsWithoutLocation: geoFilters.filters.showItemsWithoutLocation
  }), [
    geoFilters.allRegionCodes.join(','),
    geoFilters.filters.municipalityCodes.join(','),
    geoFilters.filters.showItemsWithoutLocation
  ])

  // Dashboard data management
  const {
    columnData,
    archivedColumns,
    allDashboards,
    lastUpdate,
    fetchColumnData,
    loadArchivedColumns,
    updateColumnData,
  } = useDashboardData({
    dashboard,
    geoFilters: memoizedGeoFilters
  })

  // Notification settings
  const {
    settings: notificationSettings,
    updateGlobalSettings,
    getColumnSettings,
    setColumnSoundEnabled,
  } = useNotificationSettings({ dashboardId: dashboard.id })

  const {
    permission: desktopPermission,
    requestPermission: requestDesktopPermission,
    showNotification: showDesktopNotification,
  } = useDesktopNotifications()

  const {
    showAudioPrompt,
    handleNewItems,
    enableAudio,
    disableAudio,
    testNotification,
  } = useColumnNotifications({
    settings: notificationSettings,
    desktopPermission,
    showDesktopNotification,
    columns: dashboard?.columns || [],
  })

  const { connectionStatus, stopAllPolling } = useDashboardStream({
    columns: dashboard?.columns || [],
    updateColumnData,
    onNewItems: handleNewItems,
    geoFilters: memoizedGeoFilters
  })

  usePendingImagePolling({
    columnData,
    updateColumnData,
  })

  useEffect(() => {
    if (pathname && !pathname.startsWith('/dashboard')) {
      stopAllPolling()
    }
  }, [pathname, stopAllPolling])

  // Layout and mobile state
  const {
    isMobile,
    activeColumnIndex,
    showMobileMenu,
    showDashboardDropdown,
    pullDistance,
    isRefreshing,
    scrollContainerRef,
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

  // Column operations hook
  const {
    createdColumnId,
    setCreatedColumnId,
    addColumn,
    removeColumn,
    restoreColumn,
    updateColumn,
    reorderColumns,
  } = useColumnOperations({
    dashboard,
    onDashboardUpdate,
    onArchivedColumnsReload: loadArchivedColumns,
  })

  // Clipboard hook
  const {
    copiedId,
    copiedFeedId,
    toastMessage,
    copyToClipboard,
    copyColumnFeedUrl,
  } = useClipboard()

  // Modal state
  const [showAddColumnModal, setShowAddColumnModal] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnDescription, setNewColumnDescription] = useState('')
  const [newColumnFlowId, setNewColumnFlowId] = useState('')
  const [showWorkflowInput, setShowWorkflowInput] = useState(false)
  const [urlExtracted, setUrlExtracted] = useState(false)
  const [showArchivedColumns, setShowArchivedColumns] = useState(false)
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFlowId, setEditFlowId] = useState('')
  const [showExtractionSuccess, setShowExtractionSuccess] = useState(false)
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItemType | null>(null)
  const [showCreateDashboardModal, setShowCreateDashboardModal] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [newDashboardDescription, setNewDashboardDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false)
  const [showGeoFilterPanel, setShowGeoFilterPanel] = useState(false)
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false })
  const [userName, setUserName] = useState<string | null>(null)

  // Initialize workflow input checkbox when modal opens
  useEffect(() => {
    if (showAddColumnModal) {
      const activeCols = dashboard?.columns?.filter(col => !col.isArchived) || []
      setShowWorkflowInput(activeCols.length === 0)
    }
  }, [showAddColumnModal, dashboard?.columns])

  // Fetch user session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json()
        if (session?.user) {
          setUserName(session.user.name || session.user.email?.split('@')[0] || null)
        }
      } catch (error) {
        console.error('Failed to fetch session:', error)
      }
    }
    fetchSession()
  }, [])

  // Close column menu on click outside
  useEffect(() => {
    if (!openColumnMenuId) return
    const handleClickOutside = () => setOpenColumnMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openColumnMenuId])

  // Sorted and filtered column data
  const memoizedColumnData = useMemo(() => {
    const result: ColumnData = {}
    Object.entries(columnData).forEach(([columnId, items]) => {
      result[columnId] = [...items].sort((a, b) => {
        const getEventTime = (item: NewsItemType) => {
          if (item.createdInDb) return new Date(item.createdInDb).getTime()
          return new Date(item.timestamp).getTime()
        }
        return getEventTime(b) - getEventTime(a)
      })
    })
    return result
  }, [columnData])

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredColumnData = useMemo(() => {
    if (!normalizedSearchQuery) return memoizedColumnData

    const matchesQuery = (item: NewsItemType) => {
      const locationText = item.location
        ? [item.location.country, item.location.county, item.location.municipality, item.location.area, item.location.street, item.location.name]
            .filter(Boolean).join(' ').toLowerCase()
        : ''
      const searchableText = [item.title, item.description, item.source, item.category]
        .filter(Boolean).join(' ').toLowerCase()
      const combined = `${searchableText} ${locationText}`.trim()
      return combined ? combined.includes(normalizedSearchQuery) : false
    }

    const filtered: ColumnData = {}
    Object.entries(memoizedColumnData).forEach(([columnId, items]) => {
      filtered[columnId] = items.filter(matchesQuery)
    })
    return filtered
  }, [memoizedColumnData, normalizedSearchQuery])

  const hasActiveSearch = normalizedSearchQuery.length > 0 || geoFilters.isActive
  const showSearchNoResults = hasActiveSearch && Object.values(filteredColumnData).every(items => items.length === 0)

  const isColumnSoundMuted = useCallback((columnId: string): boolean => {
    return !getColumnSettings(columnId).soundEnabled
  }, [getColumnSettings])

  const toggleColumnSound = useCallback((columnId: string) => {
    const currentSettings = getColumnSettings(columnId)
    setColumnSoundEnabled(columnId, !currentSettings.soundEnabled)
  }, [getColumnSettings, setColumnSoundEnabled])

  const getTotalNewsCount = () => {
    return Object.values(columnData).reduce((total, items) => total + items.length, 0)
  }

  const startEditing = (column: DashboardColumn) => {
    setEditingColumn(column.id)
    setEditTitle(column.title)
    setEditDescription(column.description || '')
    setEditFlowId(column.flowId || '')
  }

  const handleSaveColumn = async (columnId: string, title: string, description?: string, flowId?: string) => {
    await updateColumn(columnId, title, description, flowId)
    setEditingColumn(null)
    setEditFlowId('')
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
        router.push(`/dashboard/${data.dashboard.slug}`)
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error)
    }
  }

  const navigateToDashboard = useCallback((slug: string) => {
    router.push(`/dashboard/${slug}`)
  }, [router])

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnId)

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
    setDragPreview({ x: e.clientX, y: e.clientY, visible: true })

    const handleMouseMove = (event: MouseEvent) => {
      setDragPreview({ x: event.clientX, y: event.clientY, visible: true })
    }
    document.addEventListener('dragover', handleMouseMove)
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

  const activeColumnCount = activeColumns.length

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="glass border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="px-4 py-4 safe-area-left safe-area-right">
          {isMobile ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 hover:bg-muted active:bg-muted/80 rounded-lg smooth-transition"
                  aria-label="Öppna meny"
                >
                  <Menu className="h-6 w-6 text-foreground" />
                </button>

                <div className="flex-1 text-center px-4">
                  <div className="text-xs text-muted-foreground mb-1">
                    {lastUpdate.toLocaleDateString('sv-SE', {
                      weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm'
                    })} • {lastUpdate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })}
                  </div>
                  <h1 className="text-base font-display font-semibold text-foreground truncate">
                    {activeColumns[activeColumnIndex]?.title || dashboard.name}
                  </h1>
                  <div className="text-xs text-muted-foreground">
                    {activeColumns[activeColumnIndex]
                      ? `${filteredColumnData[activeColumns[activeColumnIndex].id]?.length || 0} händelser`
                      : `${activeColumns.length} kolumner`
                    }
                  </div>
                </div>

                <ThemeToggle />
                <button
                  onClick={() => setShowDashboardDropdown(true)}
                  className="p-2 hover:bg-muted active:bg-muted/80 rounded-lg smooth-transition"
                  aria-label="Fler alternativ"
                >
                  <MoreVertical className="h-6 w-6 text-foreground" />
                </button>
              </div>
            </div>
          ) : null}

          <DashboardHeader
            dashboard={dashboard}
            userName={userName}
            connectionStatus={connectionStatus}
            allDashboards={allDashboards}
            showDashboardDropdown={showDashboardDropdown}
            setShowDashboardDropdown={setShowDashboardDropdown}
            setShowCreateDashboardModal={setShowCreateDashboardModal}
            getTotalNewsCount={getTotalNewsCount}
            navigateToDashboard={navigateToDashboard}
            onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}
            onNavigateAway={stopAllPolling}
          />

          <DashboardFilterBar
            searchQuery={searchQuery}
            showSearchInput={showSearchInput}
            showGeoFilterPanel={showGeoFilterPanel}
            geoFilters={geoFilters}
            hasActiveSearch={hasActiveSearch && !showSearchNoResults}
            onSearchChange={setSearchQuery}
            onToggleSearchInput={setShowSearchInput}
            onToggleGeoFilterPanel={setShowGeoFilterPanel}
          />
        </div>
      </div>

      {/* No-results banner */}
      {showSearchNoResults && (
        <div className="bg-amber-50 border-y border-amber-200 text-amber-800 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {searchQuery && geoFilters.isActive && (
              <>Inga händelser matchar &quot;{searchQuery}&quot; med valda geografiska filter.</>
            )}
            {searchQuery && !geoFilters.isActive && (
              <>Inga händelser matchar &quot;{searchQuery}&quot;.</>
            )}
            {!searchQuery && geoFilters.isActive && (
              <>Inga händelser matchar valda geografiska filter.</>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); geoFilters.clearFilters() }}
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-900 hover:underline"
          >
            <X className="h-4 w-4" />
            Rensa alla filter
          </button>
        </div>
      )}

      {/* TweetDeck-style Columns / Mobile Single Column View */}
      <div className={isMobile ? "h-[calc(100vh-80px)] overflow-hidden" : "flex overflow-x-auto h-[calc(100vh-100px)]"}>
        {isMobile ? (
          activeColumns.length > 0 && activeColumns[activeColumnIndex] ? (
            <div className="relative h-full">
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
                className="h-full bg-background flex flex-col"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, info) => {
                  const threshold = 50
                  const velocity = info.velocity.x
                  if (info.offset.x > threshold || velocity > 500) prevColumn()
                  else if (info.offset.x < -threshold || velocity < -500) nextColumn()
                }}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
              >
                {/* Pull-to-refresh indicator */}
                <div
                  className="flex items-center justify-center transition-all duration-200 bg-blue-50"
                  style={{ height: pullDistance, opacity: Math.min(pullDistance / 60, 1) }}
                >
                  {isRefreshing ? (
                    <div className="flex items-center gap-2 text-blue-600 text-sm">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Uppdaterar...</span>
                    </div>
                  ) : pullDistance > 0 ? (
                    <div className="text-blue-600 text-sm flex items-center gap-2">
                      <motion.div animate={{ rotate: pullDistance > 60 ? 180 : 0 }} transition={{ duration: 0.2 }}>↓</motion.div>
                      <span>{pullDistance > 60 ? 'Släpp för att uppdatera' : 'Dra för att uppdatera'}</span>
                    </div>
                  ) : null}
                </div>

                {/* Mobile column content */}
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
                    items={filteredColumnData[activeColumns[activeColumnIndex].id] || []}
                    onSelectNewsItem={setSelectedNewsItem}
                    hasFilterActive={hasActiveSearch}
                  />
                </div>

                {activeColumns.length > 1 && (
                  <div className="safe-area-bottom pb-4 pt-2 bg-background border-t border-border">
                    <div className="flex items-center justify-center gap-2">
                      {activeColumns.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToColumn(index)}
                          className="p-2"
                          aria-label={`Gå till kolumn ${index + 1}`}
                        >
                          <motion.div
                            className={`rounded-full transition-all ${index === activeColumnIndex ? 'bg-blue-500 w-8 h-2' : 'bg-gray-300 w-2 h-2'}`}
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
            <div className="flex items-center justify-center h-full p-8 text-center">
              <div>
                <div className="mb-4 flex justify-center">
                  <Image src="/newsdeck-icon.svg" alt="Newsdeck logo" width={64} height={64} className="w-16 h-16 object-contain opacity-40" />
                </div>
                <div className="text-muted-foreground mb-4">Inga kolumner ännu</div>
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
          <>
            {(dashboard?.columns || [])
              .filter(col => !col.isArchived)
              .sort((a, b) => a.order - b.order)
              .map((column) => (
                <ColumnCard
                  key={column.id}
                  column={column}
                  dashboardSlug={dashboardSlug || dashboard.slug || dashboard.id}
                  items={filteredColumnData[column.id] || []}
                  isEditing={editingColumn === column.id}
                  editTitle={editTitle}
                  editDescription={editDescription}
                  editFlowId={editFlowId}
                  copiedId={copiedId}
                  copiedFeedId={copiedFeedId}
                  showExtractionSuccess={showExtractionSuccess}
                  openColumnMenuId={openColumnMenuId}
                  isDragged={draggedColumn === column.id}
                  isDragOver={dragOverColumn === column.id && draggedColumn !== column.id}
                  isSoundMuted={isColumnSoundMuted(column.id)}
                  hasFilterActive={hasActiveSearch}
                  onEditTitleChange={setEditTitle}
                  onEditDescriptionChange={setEditDescription}
                  onEditFlowIdChange={setEditFlowId}
                  onShowExtractionSuccess={setShowExtractionSuccess}
                  onStartEditing={startEditing}
                  onCancelEditing={() => setEditingColumn(null)}
                  onSaveColumn={handleSaveColumn}
                  onArchiveColumn={removeColumn}
                  onToggleSound={toggleColumnSound}
                  onCopyId={copyToClipboard}
                  onCopyFeedUrl={copyColumnFeedUrl}
                  onOpenMenu={(id) => setOpenColumnMenuId(id || null)}
                  onSelectNewsItem={setSelectedNewsItem}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
              ))}

            {/* Add Column Button */}
            <div className="flex-shrink-0 w-80 bg-muted/30 border-r border-border flex items-center justify-center">
              <button
                onClick={() => setShowAddColumnModal(true)}
                className="flex flex-col items-center text-muted-foreground hover:text-foreground p-8"
              >
                <div className="w-12 h-12 border-2 border-dashed border-muted-foreground/50 rounded-lg flex items-center justify-center text-2xl mb-2">
                  +
                </div>
                <span className="text-sm">Lägg till kolumn</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AddColumnModal
        isOpen={showAddColumnModal}
        showArchivedColumns={showArchivedColumns}
        showWorkflowInput={showWorkflowInput}
        newColumnTitle={newColumnTitle}
        newColumnFlowId={newColumnFlowId}
        urlExtracted={urlExtracted}
        createdColumnId={createdColumnId}
        archivedColumns={archivedColumns}
        copiedId={copiedId}
        activeColumnCount={activeColumnCount}
        onClose={() => setShowAddColumnModal(false)}
        onTabChange={setShowArchivedColumns}
        onWorkflowInputToggle={setShowWorkflowInput}
        onTitleChange={setNewColumnTitle}
        onDescriptionChange={setNewColumnDescription}
        onFlowIdChange={setNewColumnFlowId}
        onUrlExtractedChange={setUrlExtracted}
        onCreatedColumnIdChange={setCreatedColumnId}
        onSubmit={() => addColumn(newColumnTitle, newColumnDescription, newColumnFlowId)}
        onRestore={async (columnId) => {
          await restoreColumn(columnId)
          setShowAddColumnModal(false)
        }}
        onCopyId={copyToClipboard}
      />

      <CreateDashboardModal
        isOpen={showCreateDashboardModal}
        newDashboardName={newDashboardName}
        newDashboardDescription={newDashboardDescription}
        onClose={() => setShowCreateDashboardModal(false)}
        onNameChange={setNewDashboardName}
        onDescriptionChange={setNewDashboardDescription}
        onSubmit={createDashboard}
      />

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
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-3 py-2 text-xs text-muted-foreground border">
        <div className="flex items-center gap-2">
          {connectionStatus === 'connected' && (
            <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span>Live</span></>
          )}
          {connectionStatus === 'connecting' && (
            <><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div><span>Ansluter...</span></>
          )}
          {connectionStatus === 'disconnected' && (
            <><div className="w-2 h-2 rounded-full bg-red-500"></div><span>Återansluter...</span></>
          )}
        </div>
      </div>

      {/* News Item Modal */}
      <NewsItemModal
        item={selectedNewsItem}
        onClose={() => setSelectedNewsItem(null)}
      />

      {/* Custom Drag Preview */}
      <MobileDragPreview
        dragPreview={dragPreview}
        draggedColumnId={draggedColumn}
        dashboard={dashboard}
        filteredColumnData={filteredColumnData}
      />

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={showMobileMenu}
        isMobile={isMobile}
        dashboard={dashboard}
        allDashboards={allDashboards}
        activeColumnCount={activeColumnCount}
        totalNewsCount={getTotalNewsCount()}
        connectionStatus={connectionStatus}
        lastUpdate={lastUpdate}
        onClose={() => setShowMobileMenu(false)}
        onNavigateToDashboard={navigateToDashboard}
        onOpenAddColumn={() => setShowAddColumnModal(true)}
        onOpenCreateDashboard={() => setShowCreateDashboardModal(true)}
        onRefresh={fetchColumnData}
      />

      {/* Mobile Column Actions Bottom Sheet */}
      <MobileColumnActions
        isOpen={showDashboardDropdown}
        isMobile={isMobile}
        activeColumn={activeColumns[activeColumnIndex]}
        filteredColumnData={filteredColumnData}
        isSoundMuted={activeColumns[activeColumnIndex] ? isColumnSoundMuted(activeColumns[activeColumnIndex].id) : false}
        onClose={() => setShowDashboardDropdown(false)}
        onToggleSound={toggleColumnSound}
        onStartEditing={startEditing}
        onRefresh={fetchColumnData}
      />

      {/* Notification Settings Modal */}
      {isNotificationSettingsOpen && (
        <NotificationSettingsModal
          settings={notificationSettings}
          desktopPermission={desktopPermission}
          onClose={() => setIsNotificationSettingsOpen(false)}
          onUpdateGlobal={updateGlobalSettings}
          onRequestDesktopPermission={requestDesktopPermission}
          onTestNotification={testNotification}
        />
      )}
    </div>
  )
}
