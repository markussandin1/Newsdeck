'use client'

import Link from 'next/link'
import { DashboardColumn } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Settings, Check, Rss, Globe2, Volume2, VolumeX, MoreVertical } from 'lucide-react'

interface ColumnHeaderProps {
  column: DashboardColumn
  dashboardSlug: string
  itemCount: number
  isMenuOpen: boolean
  isSoundMuted: boolean
  copiedFeedId: string | null
  onOpenMenu: (columnId: string) => void
  onStartEditing: (column: DashboardColumn) => void
  onToggleSound: (columnId: string) => void
  onCopyFeedUrl: (columnId: string, columnTitle: string) => void
}

export function ColumnHeader({
  column,
  dashboardSlug,
  itemCount,
  isMenuOpen,
  isSoundMuted,
  copiedFeedId,
  onOpenMenu,
  onStartEditing,
  onToggleSound,
  onCopyFeedUrl,
}: ColumnHeaderProps) {
  return (
    <div className="flex justify-between items-start ml-6">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground">
            {column.title}
          </h3>
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
                <Link
                  href={`/dashboard/${dashboardSlug}/columns/${column.id}/map`}
                  onClick={() => onOpenMenu('')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted smooth-transition"
                >
                  <Globe2 className="h-4 w-4 text-muted-foreground" />
                  Visa karta
                </Link>
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
    </div>
  )
}
