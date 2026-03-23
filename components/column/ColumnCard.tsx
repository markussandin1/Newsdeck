'use client'

import { DashboardColumn, NewsItem as NewsItemType } from '@/lib/types'
import { ColumnHeader } from './ColumnHeader'
import { ColumnEditForm } from './ColumnEditForm'
import { ColumnContent } from './ColumnContent'

interface ColumnCardProps {
  column: DashboardColumn
  dashboardSlug: string
  items: NewsItemType[]
  isEditing: boolean
  editTitle: string
  editDescription: string
  editFlowId: string
  copiedId: string | null
  copiedFeedId: string | null
  showExtractionSuccess: boolean
  openColumnMenuId: string | null
  isDragged: boolean
  isDragOver: boolean
  isSoundMuted: boolean
  hasFilterActive: boolean
  onEditTitleChange: (value: string) => void
  onEditDescriptionChange: (value: string) => void
  onEditFlowIdChange: (value: string) => void
  onShowExtractionSuccess: (value: boolean) => void
  onStartEditing: (column: DashboardColumn) => void
  onCancelEditing: () => void
  onSaveColumn: (columnId: string, title: string, description?: string, flowId?: string) => void
  onArchiveColumn: (columnId: string) => void
  onToggleSound: (columnId: string) => void
  onCopyId: (text: string | undefined, columnId: string, columnTitle: string) => void
  onCopyFeedUrl: (columnId: string, columnTitle: string) => void
  onOpenMenu: (columnId: string) => void
  onSelectNewsItem: (item: NewsItemType) => void
  onDragStart: (e: React.DragEvent, columnId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, columnId: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, targetColumnId: string) => void
}

export function ColumnCard({
  column,
  dashboardSlug,
  items,
  isEditing,
  editTitle,
  editDescription,
  editFlowId,
  copiedId,
  copiedFeedId,
  showExtractionSuccess,
  openColumnMenuId,
  isDragged,
  isDragOver,
  isSoundMuted,
  hasFilterActive,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditFlowIdChange,
  onShowExtractionSuccess,
  onStartEditing,
  onCancelEditing,
  onSaveColumn,
  onArchiveColumn,
  onToggleSound,
  onCopyId,
  onCopyFeedUrl,
  onOpenMenu,
  onSelectNewsItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: ColumnCardProps) {
  return (
    <div
      key={column.id}
      data-column-id={column.id}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
      className={`flex-shrink-0 w-80 bg-background border-r border-border flex flex-col transition-colors ${
        isDragged ? 'opacity-50' : ''
      } ${
        isDragOver && !isDragged ? 'border-l-4 border-blue-500 bg-blue-50/50' : ''
      }`}
    >
      {/* Static header with drag handle */}
      <div className={`glass border-b border-border bg-muted/20 p-4 rounded-t-xl relative ${openColumnMenuId === column.id ? 'z-50' : ''}`}>
        {/* Drag handle */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, column.id)}
          onDragEnd={onDragEnd}
          className="absolute left-0 top-0 bottom-0 w-6 cursor-move hover:bg-muted rounded-l-xl flex flex-col items-center justify-center gap-1 opacity-40 hover:opacity-80 transition-all"
          title="Dra för att flytta kolumn"
        >
          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
        </div>

        {isEditing ? (
          <ColumnEditForm
            column={column}
            editTitle={editTitle}
            editDescription={editDescription}
            editFlowId={editFlowId}
            copiedId={copiedId}
            showExtractionSuccess={showExtractionSuccess}
            onEditTitleChange={onEditTitleChange}
            onEditDescriptionChange={onEditDescriptionChange}
            onEditFlowIdChange={onEditFlowIdChange}
            onShowExtractionSuccess={onShowExtractionSuccess}
            onSave={onSaveColumn}
            onCancel={onCancelEditing}
            onArchive={onArchiveColumn}
            onCopyId={onCopyId}
          />
        ) : (
          <ColumnHeader
            column={column}
            dashboardSlug={dashboardSlug}
            itemCount={items.length}
            isMenuOpen={openColumnMenuId === column.id}
            isSoundMuted={isSoundMuted}
            copiedFeedId={copiedFeedId}
            onOpenMenu={onOpenMenu}
            onStartEditing={onStartEditing}
            onToggleSound={onToggleSound}
            onCopyFeedUrl={onCopyFeedUrl}
          />
        )}
      </div>

      {/* Static scrollable area */}
      <div className="flex-1 overflow-y-auto p-2">
        <ColumnContent
          columnId={column.id}
          items={items}
          onSelectNewsItem={onSelectNewsItem}
          hasFilterActive={hasFilterActive}
        />
      </div>
    </div>
  )
}
