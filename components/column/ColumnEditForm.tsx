'use client'

import { DashboardColumn } from '@/lib/types'
import { extractWorkflowId } from '@/lib/dashboard/utils'
import { Button } from '@/components/ui/button'
import {
  Settings, X, Copy, Check, Save, Archive, Trash2, Link2, CheckCircle
} from 'lucide-react'

interface ColumnEditFormProps {
  column: DashboardColumn
  editTitle: string
  editDescription: string
  editFlowId: string
  copiedId: string | null
  showExtractionSuccess: boolean
  onEditTitleChange: (value: string) => void
  onEditDescriptionChange: (value: string) => void
  onEditFlowIdChange: (value: string) => void
  onShowExtractionSuccess: (value: boolean) => void
  onSave: (columnId: string, title: string, description?: string, flowId?: string) => void
  onCancel: () => void
  onArchive: (columnId: string) => void
  onCopyId: (text: string | undefined, columnId: string, columnTitle: string) => void
}

export function ColumnEditForm({
  column,
  editTitle,
  editDescription,
  editFlowId,
  copiedId,
  showExtractionSuccess,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditFlowIdChange,
  onShowExtractionSuccess,
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
        onSave(column.id, editTitle, editDescription, editFlowId)
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
            Ange detta ID i din Workflow under steget &quot;Send to Newsdeck&quot;.
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

        {/* Koppla mot Workflow ID — deprecated, dold som standard */}
        <details open={!!editFlowId} className="group">
          <summary className="cursor-pointer list-none flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground select-none">
            <Link2 className="h-3 w-3" />
            Koppla mot Workflow ID (deprecated)
          </summary>
          <div className="mt-2 space-y-2">
            {editFlowId ? (
              <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-md">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Ansluten</span>
                  <Button
                    type="button"
                    onClick={() => onEditFlowIdChange('')}
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
                  onChange={(e) => onEditFlowIdChange(e.target.value)}
                  onBlur={(e) => {
                    const extracted = extractWorkflowId(e.target.value)
                    onEditFlowIdChange(extracted)
                    if (extracted && extracted !== e.target.value) {
                      onShowExtractionSuccess(true)
                      setTimeout(() => onShowExtractionSuccess(false), 3000)
                    }
                  }}
                  className="w-full px-2 py-1.5 font-body text-xs border border-input rounded font-mono focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                  placeholder="Klistra in workflow-URL från Workflows-appen"
                />
                {showExtractionSuccess && (
                  <div className="text-[10px] text-success flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Workflow-ID extraherat från URL
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground">
                  Fyll denna kolumn automatiskt med nyheter från en AI-workflow
                </p>
              </div>
            )}
          </div>
        </details>

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
