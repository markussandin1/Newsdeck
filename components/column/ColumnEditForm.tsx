'use client'

import { DashboardColumn } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Settings, X, Copy, Check, Save, Archive } from 'lucide-react'

interface ColumnEditFormProps {
  column: DashboardColumn
  editTitle: string
  editDescription: string
  copiedId: string | null
  onEditTitleChange: (value: string) => void
  onEditDescriptionChange: (value: string) => void
  onSave: (columnId: string, title: string, description?: string) => void
  onCancel: () => void
  onArchive: (columnId: string) => void
  onCopyId: (text: string | undefined, columnId: string, columnTitle: string) => void
}

export function ColumnEditForm({
  column,
  editTitle,
  editDescription,
  copiedId,
  onEditTitleChange,
  onEditDescriptionChange,
  onSave,
  onCancel,
  onArchive,
  onCopyId,
}: ColumnEditFormProps) {
  return (
    <div className="ml-6 space-y-3 bg-muted/50 p-3 rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Inställningar
        </h4>
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          size="icon"
          title="Stäng"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault()
        onSave(column.id, editTitle, editDescription)
      }} className="space-y-3">
        {/* Kolumn-ID — primär status, visas överst */}
        <div className="p-2 bg-muted rounded-md border border-border">
          <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
            <Copy className="h-3 w-3" />
            Kolumn-ID
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              value={column.id}
              readOnly
              onFocus={(e) => e.target.select()}
              className="flex-1 px-2 py-1.5 text-xs bg-background border border-input rounded font-mono text-foreground"
            />
            <Button
              type="button"
              onClick={() => onCopyId(column.id, column.id, column.title)}
              size="sm"
              title="Kopiera kolumn-ID"
            >
              {copiedId === column.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Klistra in detta ID i Newsdeck Publisher-noden i Workflows.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Kolumnnamn *
          </label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="w-full px-2 py-1.5 font-body text-sm border border-input rounded focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
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
            onChange={(e) => onEditDescriptionChange(e.target.value)}
            className="w-full px-2 py-1.5 font-body text-xs border border-input rounded resize-none focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
            placeholder="Valfri beskrivning..."
            rows={2}
          />
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
                onArchive(column.id)
                onCancel()
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
  )
}
