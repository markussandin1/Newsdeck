'use client'

import { DashboardColumn } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Settings, Check, Rss, Volume2, VolumeX, MoreVertical } from 'lucide-react'

interface ColumnHeaderProps {
  column: DashboardColumn
  itemCount: number
  isMenuOpen: boolean
  isSoundMuted: boolean
  copiedFeedId: string | null
  /** Number of items with newsValue >= 4 received in the last hour */
  criticalCount?: number
  /** True if any of the items in the 1h window has newsValue === 5 — switches the row colour to red */
  hasCritical?: boolean
  /** When true, the live-indicator chip pulses green; otherwise muted */
  isLive?: boolean
  onOpenMenu: (columnId: string) => void
  onStartEditing: (column: DashboardColumn) => void
  onToggleSound: (columnId: string) => void
  onCopyFeedUrl: (columnId: string, columnTitle: string) => void
}

export function ColumnHeader({
  column,
  itemCount,
  isMenuOpen,
  isSoundMuted,
  copiedFeedId,
  criticalCount = 0,
  hasCritical = false,
  isLive = false,
  onOpenMenu,
  onStartEditing,
  onToggleSound,
  onCopyFeedUrl,
}: ColumnHeaderProps) {
  return (
    <div className="ml-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="font-display font-semibold text-foreground truncate min-w-0">
              {column.title}
            </h3>
            <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0">
              {itemCount}
            </span>
          </div>
          {column.description && (
            <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">
              {column.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={`nd-col-live ${isLive ? 'nd-on' : ''}`}
            title={isLive
              ? 'Live — kolumnen har händelser och tar emot uppdateringar i realtid'
              : 'Vilande — väntar på första händelsen'}
          >
            <span className="nd-col-live-dot" />
            {isLive ? 'Live' : 'Vilande'}
          </span>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              title="Fler alternativ"
              onClick={(e) => {
                e.stopPropagation()
                onOpenMenu(isMenuOpen ? '' : column.id)
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-52 bg-popover rounded-lg shadow-lg border border-border py-1 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50">
                  {itemCount} händelser
                </div>
                <button
                  onClick={() => onToggleSound(column.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted smooth-transition text-left"
                >
                  {isSoundMuted
                    ? <VolumeX className="h-4 w-4 text-muted-foreground" />
                    : <Volume2 className="h-4 w-4 text-muted-foreground" />}
                  {isSoundMuted ? 'Aktivera ljud' : 'Stäng av ljud'}
                </button>
                <button
                  onClick={() => { onCopyFeedUrl(column.id, column.title); onOpenMenu('') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted smooth-transition text-left"
                >
                  {copiedFeedId === column.id
                    ? <Check className="h-4 w-4 text-muted-foreground" />
                    : <Rss className="h-4 w-4 text-muted-foreground" />}
                  {copiedFeedId === column.id ? 'Kopierat!' : 'Kopiera feed-URL'}
                </button>
                <button
                  onClick={() => { onStartEditing(column); onOpenMenu('') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted smooth-transition text-left"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Kolumninställningar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {criticalCount > 0 && (
        <div className={`nd-col-crit ${hasCritical ? 'nd-has-critical' : ''}`}>
          {criticalCount === 1
            ? '1 stor händelse senaste timmen'
            : `${criticalCount} stora händelser senaste timmen`}
        </div>
      )}
    </div>
  )
}
