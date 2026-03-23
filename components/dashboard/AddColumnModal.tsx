'use client'

import { DashboardColumn } from '@/lib/types'
import { extractWorkflowId } from '@/lib/dashboard/utils'
import { Settings, Copy, Check, Info } from 'lucide-react'

interface AddColumnModalProps {
  isOpen: boolean
  showArchivedColumns: boolean
  showWorkflowInput: boolean
  newColumnTitle: string
  newColumnFlowId: string
  urlExtracted: boolean
  createdColumnId: { id: string; title: string } | null
  archivedColumns: DashboardColumn[]
  copiedId: string | null
  activeColumnCount: number
  onClose: () => void
  onTabChange: (showArchived: boolean) => void
  onWorkflowInputToggle: (show: boolean) => void
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onFlowIdChange: (value: string) => void
  onUrlExtractedChange: (value: boolean) => void
  onCreatedColumnIdChange: (value: { id: string; title: string } | null) => void
  onSubmit: () => void
  onRestore: (columnId: string) => void
  onCopyId: (text: string | undefined, columnId: string, columnTitle: string) => void
}

export function AddColumnModal({
  isOpen,
  showArchivedColumns,
  showWorkflowInput,
  newColumnTitle,
  newColumnFlowId,
  urlExtracted,
  createdColumnId,
  archivedColumns,
  copiedId,
  activeColumnCount,
  onClose,
  onTabChange,
  onWorkflowInputToggle,
  onTitleChange,
  onDescriptionChange: _onDescriptionChange,
  onFlowIdChange,
  onUrlExtractedChange,
  onCreatedColumnIdChange,
  onSubmit,
  onRestore,
  onCopyId,
}: AddColumnModalProps) {
  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    onTitleChange('')
    _onDescriptionChange('')
    onFlowIdChange('')
    onUrlExtractedChange(false)
    onCreatedColumnIdChange(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground rounded-lg max-w-md w-full border border-border">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-display font-semibold text-foreground">✨ Skapa ny kolumn</h3>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground text-xl"
            >
              ×
            </button>
          </div>

          {/* Tab buttons */}
          <div className="flex mb-4 border-b border-border">
            <button
              onClick={() => onTabChange(false)}
              className={`px-4 py-2 font-medium text-sm ${!showArchivedColumns
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Skapa ny
            </button>
            <button
              onClick={() => onTabChange(true)}
              className={`px-4 py-2 font-medium text-sm ${showArchivedColumns
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Återställ ({archivedColumns.length})
            </button>
          </div>

          {!showArchivedColumns ? (
            createdColumnId ? (
              // Bekräftelsesteg efter skapad kolumn
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">&quot;{createdColumnId.title}&quot; har skapats</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Kolumn-ID (klistra in i Workflows):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createdColumnId.id}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-muted border border-input rounded font-mono text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => onCopyId(createdColumnId.id, createdColumnId.id, createdColumnId.title)}
                      className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1 text-sm"
                    >
                      {copiedId === createdColumnId.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      Kopiera
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onCreatedColumnIdChange(null)
                      onTabChange(false)
                    }}
                    className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted text-sm"
                  >
                    Stäng
                  </button>
                </div>
              </div>
            ) : (
              // Create new column form
              <form onSubmit={(e) => {
                e.preventDefault()
                if (newColumnTitle.trim()) {
                  onSubmit()
                }
              }}>
                <div className="space-y-4">
                  {/* Column Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Kolumnnamn *
                    </label>
                    <input
                      type="text"
                      value={newColumnTitle}
                      onChange={(e) => onTitleChange(e.target.value)}
                      className="w-full p-3 border border-input rounded-lg font-body focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                      placeholder="t.ex. Breaking News Stockholm"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Workflow Connection Section */}
                  <div className="p-4 bg-blue-50 border border-border rounded-lg">
                    {activeColumnCount === 0 && (
                      <div className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full mb-2">
                        🎯 Rekommenderat för första kolumnen
                      </div>
                    )}

                    <div className="font-display font-medium text-foreground mb-2">
                      🤖 Vill du fylla denna kolumn automatiskt?
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Anslut en AI-workflow för att automatiskt ta emot nyheter - inga fler steg krävs!
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showWorkflowInput}
                        onChange={(e) => onWorkflowInputToggle(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-foreground">
                        Ja, anslut workflow
                      </span>
                    </label>
                  </div>

                  {/* Workflow Input (Conditional) */}
                  {showWorkflowInput ? (
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg transition-all duration-200 ease-in-out">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Workflow-URL
                        </label>
                        <input
                          type="text"
                          value={newColumnFlowId}
                          onChange={(e) => onFlowIdChange(e.target.value)}
                          onBlur={(e) => {
                            const extracted = extractWorkflowId(e.target.value)
                            if (extracted && extracted !== e.target.value) {
                              onFlowIdChange(extracted)
                              onUrlExtractedChange(true)
                              setTimeout(() => onUrlExtractedChange(false), 3000)
                            } else {
                              onFlowIdChange(extracted)
                            }
                          }}
                          className="w-full p-3 border border-border rounded-lg font-body font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Klistra in URL från Workflows-appen"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
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
                    <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg flex items-center gap-2">
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
                      onClose()
                      onTitleChange('')
                      _onDescriptionChange('')
                      onFlowIdChange('')
                      onUrlExtractedChange(false)
                      onTabChange(false)
                    }}
                    className="px-6 py-3 border border-input text-foreground rounded-lg hover:bg-muted"
                  >
                    Avbryt
                  </button>
                </div>
              </form>
            )
          ) : (
            // Restore archived columns
            <div className="space-y-3">
              {archivedColumns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="mb-2">📦</div>
                  <div>Inga arkiverade kolumner</div>
                </div>
              ) : (
                archivedColumns.map((column) => (
                  <div key={column.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{column.title}</div>
                      {column.description && (
                        <div className="text-sm text-muted-foreground mt-1">{column.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Arkiverad: {new Date(column.archivedAt || '').toLocaleDateString('sv-SE')}
                      </div>
                    </div>
                    <button
                      onClick={() => onRestore(column.id)}
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
                    onClose()
                    onTabChange(false)
                  }}
                  className="px-6 py-3 border border-input text-foreground rounded-lg hover:bg-muted"
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
  )
}
