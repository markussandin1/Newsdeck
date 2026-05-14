'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardColumn, NewsItem as NewsItemType } from '@/lib/types'
import { ColumnHeader } from './ColumnHeader'
import { ColumnEditForm } from './ColumnEditForm'
import { ColumnContent } from './ColumnContent'

const ONE_HOUR_MS = 60 * 60 * 1000

interface ColumnCardProps {
  column: DashboardColumn
  items: NewsItemType[]
  isEditing: boolean
  editTitle: string
  editDescription: string
  copiedId: string | null
  copiedFeedId: string | null
  openColumnMenuId: string | null
  isDragged: boolean
  isDragOver: boolean
  isSoundMuted: boolean
  hasFilterActive: boolean
  onEditTitleChange: (value: string) => void
  onEditDescriptionChange: (value: string) => void
  onStartEditing: (column: DashboardColumn) => void
  onCancelEditing: () => void
  onSaveColumn: (columnId: string, title: string, description?: string) => void
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
  items,
  isEditing,
  editTitle,
  editDescription,
  copiedId,
  copiedFeedId,
  openColumnMenuId,
  isDragged,
  isDragOver,
  isSoundMuted,
  hasFilterActive,
  onEditTitleChange,
  onEditDescriptionChange,
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
  // Re-tick once per minute so the "breaking senaste timmen"-count stays fresh
  // even when no new items arrive (old items age out of the 1h window).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const { breakingCount, hasCriticalRecent } = useMemo(() => {
    const cutoff = now - ONE_HOUR_MS
    let count = 0
    let critical = false
    for (const item of items) {
      if (item.newsValue < 4) continue
      const ts = new Date(item.createdInDb || item.timestamp).getTime()
      if (Number.isNaN(ts) || ts < cutoff) continue
      count++
      if (item.newsValue === 5) critical = true
    }
    return { breakingCount: count, hasCriticalRecent: critical }
  }, [items, now])

  return (
    <div
      key={column.id}
      data-column-id={column.id}
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
      className={`nd-col transition-colors ${isDragged ? 'opacity-50' : ''} ${
        isDragOver && !isDragged ? 'ring-2 ring-[var(--nd-accent)]' : ''
      }`}
    >
      {/* Static header with drag handle */}
      <div className={`nd-col-header relative ${openColumnMenuId === column.id ? 'z-50' : ''}`}>
        {/* Drag handle */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, column.id)}
          onDragEnd={onDragEnd}
          className="absolute left-0 top-0 bottom-0 w-5 cursor-move hover:bg-[var(--nd-surface-2)] flex flex-col items-center justify-center gap-1 opacity-30 hover:opacity-80 transition-all"
          title="Dra för att flytta kolumn"
        >
          <div className="w-1 h-1 bg-[var(--nd-ink-mute)] rounded-full"></div>
          <div className="w-1 h-1 bg-[var(--nd-ink-mute)] rounded-full"></div>
          <div className="w-1 h-1 bg-[var(--nd-ink-mute)] rounded-full"></div>
          <div className="w-1 h-1 bg-[var(--nd-ink-mute)] rounded-full"></div>
          <div className="w-1 h-1 bg-[var(--nd-ink-mute)] rounded-full"></div>
          <div className="w-1 h-1 bg-[var(--nd-ink-mute)] rounded-full"></div>
        </div>

        {isEditing ? (
          <ColumnEditForm
            column={column}
            editTitle={editTitle}
            editDescription={editDescription}
            copiedId={copiedId}
            onEditTitleChange={onEditTitleChange}
            onEditDescriptionChange={onEditDescriptionChange}
            onSave={onSaveColumn}
            onCancel={onCancelEditing}
            onArchive={onArchiveColumn}
            onCopyId={onCopyId}
          />
        ) : (
          <ColumnHeader
            column={column}
            itemCount={items.length}
            isMenuOpen={openColumnMenuId === column.id}
            isSoundMuted={isSoundMuted}
            copiedFeedId={copiedFeedId}
            criticalCount={breakingCount}
            hasCritical={hasCriticalRecent}
            isLive={items.length > 0}
            onOpenMenu={onOpenMenu}
            onStartEditing={onStartEditing}
            onToggleSound={onToggleSound}
            onCopyFeedUrl={onCopyFeedUrl}
          />
        )}
      </div>

      {/* Static scrollable area */}
      <div className="nd-col-body">
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
