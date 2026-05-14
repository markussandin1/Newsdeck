'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Dashboard as DashboardType, NewsItem as NewsItemType } from '@/lib/types'
import { useDashboardData } from '@/lib/dashboard/hooks/useDashboardData'
import { useDashboardStream } from '@/lib/dashboard/hooks/useDashboardStream'
import { usePendingImagePolling } from '@/lib/dashboard/hooks/usePendingImagePolling'
import { useColumnNotifications } from '@/lib/dashboard/hooks/useColumnNotifications'
import { useNotificationSettings } from '@/lib/dashboard/hooks/useNotificationSettings'
import { useDesktopNotifications } from '@/lib/dashboard/hooks/useDesktopNotifications'
import { useDashboardLayout } from '@/lib/dashboard/hooks/useDashboardLayout'
import { useColumnOperations } from '@/lib/dashboard/hooks/useColumnOperations'
import { useClipboard } from '@/lib/dashboard/hooks/useClipboard'
import { useColumnDragDrop } from '@/lib/dashboard/hooks/useColumnDragDrop'
import { useViewMode } from '@/lib/dashboard/hooks/useViewMode'
import { useCurrentUser } from '@/lib/dashboard/hooks/useCurrentUser'
import { useColumnSearch } from '@/lib/dashboard/hooks/useColumnSearch'
import { useDashboardNavigation } from '@/lib/dashboard/hooks/useDashboardNavigation'
import { useColumnEditing } from '@/lib/dashboard/hooks/useColumnEditing'
import { useAddColumnModal } from '@/lib/dashboard/hooks/useAddColumnModal'
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
import { PulseView } from './views/PulseView'
import { GridView } from './views/GridView'

interface DashboardViewProps {
  dashboard: DashboardType
  onDashboardUpdate: (dashboard: DashboardType) => void
}

export default function DashboardView({ dashboard, onDashboardUpdate }: DashboardViewProps) {
  const pathname = usePathname()

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

  // Column-editing inline-state (egen hook)
  const {
    editingColumn,
    editTitle,
    editDescription,
    setEditTitle,
    setEditDescription,
    startEditing,
    cancelEditing,
    saveColumn: handleSaveColumn,
  } = useColumnEditing({ updateColumn })

  // Add-column-modal state (egen hook)
  const addColumnModal = useAddColumnModal()

  // Ovriga modal-/UI-state
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItemType | null>(null)
  const [showCreateDashboardModal, setShowCreateDashboardModal] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [newDashboardDescription, setNewDashboardDescription] = useState('')
  // searchQuery + filtering extraherat till useColumnSearch (P1-3)
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false)
  const [showSearchInput, setShowSearchInput] = useState(false)
  // viewMode + localStorage + cross-tab-sync extraherat till useViewMode (P1-3 steg 3)
  const [viewMode, setViewMode] = useViewMode()
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null)
  const userName = useCurrentUser()

  // Close column menu on click outside
  useEffect(() => {
    if (!openColumnMenuId) return
    const handleClickOutside = () => setOpenColumnMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openColumnMenuId])

  const {
    searchQuery,
    setSearchQuery,
    filteredColumnData,
    hasActiveSearch,
    showSearchNoResults,
  } = useColumnSearch({ columnData })

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

  // startEditing + handleSaveColumn lever i useColumnEditing (ovan).

  // Dashboard-nivå-navigation extraherat till useDashboardNavigation (P1-3 steg 6)
  const { navigateToDashboard, createDashboard } = useDashboardNavigation()

  // Drag & drop — extraherat till useColumnDragDrop (P1-3 steg 2)
  const {
    draggedColumn,
    dragOverColumn,
    dragPreview,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnDragDrop({ reorderColumns })

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
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Mobile-only filter bar */}
          <div className="lg:hidden">
            <DashboardFilterBar
              searchQuery={searchQuery}
              showSearchInput={showSearchInput}
              hasActiveSearch={hasActiveSearch && !showSearchNoResults}
              onSearchChange={setSearchQuery}
              onToggleSearchInput={setShowSearchInput}
            />
          </div>
        </div>
      </div>

      {/* No-results banner */}
      {showSearchNoResults && (
        <div className="bg-amber-50 border-y border-amber-200 text-amber-800 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {searchQuery && (
              <>Inga händelser matchar &quot;{searchQuery}&quot;.</>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-900 hover:underline"
          >
            <X className="h-4 w-4" />
            Rensa filter
          </button>
        </div>
      )}

      {/* Dashboard Content: Columns / Pulse / Grid views */}
      {!isMobile && viewMode === 'pulse' && (
        <div className="h-[calc(100vh-56px)]">
          <PulseView
            columns={activeColumns}
            columnData={filteredColumnData}
            onSelectItem={setSelectedNewsItem}
          />
        </div>
      )}
      {!isMobile && viewMode === 'grid' && (
        <div className="h-[calc(100vh-56px)]">
          <GridView
            columns={activeColumns}
            columnData={filteredColumnData}
            onSelectItem={setSelectedNewsItem}
          />
        </div>
      )}
      <div className={`${(!isMobile && viewMode !== 'columns') ? 'hidden' : ''} ${isMobile ? "h-[calc(100vh-80px)] overflow-hidden" : "nd-cols-scroller h-[calc(100vh-56px)]"}`}>
        {isMobile ? (
          activeColumns.length > 0 && activeColumns[activeColumnIndex] ? (
            <div className="relative h-full">
              {activeColumns.length > 1 && (
                <>
                  {activeColumnIndex > 0 && (
                    <button
                      onClick={prevColumn}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card active:bg-muted border border-border shadow-lg rounded-full p-3 transition-all"
                      aria-label="Föregående kolumn"
                    >
                      <ChevronLeft className="h-6 w-6 text-foreground" />
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
                onDragEnd={(_e, info) => {
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
                  onClick={addColumnModal.open}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 smooth-transition text-sm font-medium"
                >
                  + Lägg till kolumn
                </button>
              </div>
            </div>
          )
        ) : (
          // Desktop: Show all columns side by side
          <div className="nd-cols-inner">
            {(dashboard?.columns || [])
              .filter(col => !col.isArchived)
              .sort((a, b) => a.order - b.order)
              .map((column) => (
                <ColumnCard
                  key={column.id}
                  column={column}
                  items={filteredColumnData[column.id] || []}
                  isEditing={editingColumn === column.id}
                  editTitle={editTitle}
                  editDescription={editDescription}
                  copiedId={copiedId}
                  copiedFeedId={copiedFeedId}
                  openColumnMenuId={openColumnMenuId}
                  isDragged={draggedColumn === column.id}
                  isDragOver={dragOverColumn === column.id && draggedColumn !== column.id}
                  isSoundMuted={isColumnSoundMuted(column.id)}
                  hasFilterActive={hasActiveSearch}
                  onEditTitleChange={setEditTitle}
                  onEditDescriptionChange={setEditDescription}
                  onStartEditing={startEditing}
                  onCancelEditing={cancelEditing}
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

            {/* Add Column placeholder */}
            <button
              onClick={addColumnModal.open}
              className="nd-col-add"
              aria-label="Lägg till kolumn"
            >
              <span className="nd-col-add-plus">＋</span>
              <span className="nd-col-add-label">Lägg till kolumn</span>
              <span className="nd-col-add-sub">Koppla från Workflows</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddColumnModal
        isOpen={addColumnModal.isOpen}
        showArchivedColumns={addColumnModal.showArchivedTab}
        newColumnTitle={addColumnModal.newColumnTitle}
        newColumnDescription={addColumnModal.newColumnDescription}
        createdColumnId={createdColumnId}
        archivedColumns={archivedColumns}
        copiedId={copiedId}
        onClose={addColumnModal.close}
        onTabChange={addColumnModal.setShowArchivedTab}
        onTitleChange={addColumnModal.setNewColumnTitle}
        onDescriptionChange={addColumnModal.setNewColumnDescription}
        onCreatedColumnIdChange={setCreatedColumnId}
        onSubmit={() => addColumn(
          addColumnModal.newColumnTitle,
          addColumnModal.newColumnDescription,
        )}
        onRestore={async (columnId) => {
          await restoreColumn(columnId)
          addColumnModal.close()
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
      <div className="fixed bottom-4 right-4 bg-card rounded-full shadow-lg px-3 py-2 text-xs text-muted-foreground border border-border">
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
        columns={dashboard?.columns || []}
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
        onOpenAddColumn={addColumnModal.open}
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
