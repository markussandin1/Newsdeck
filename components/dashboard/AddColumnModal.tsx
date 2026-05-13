'use client'

import { useEffect } from 'react'
import { DashboardColumn } from '@/lib/types'
import { extractWorkflowId } from '@/lib/dashboard/utils'
import { Settings, Copy, Check, Info, ExternalLink } from 'lucide-react'

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
  onDescriptionChange,
  onFlowIdChange,
  onUrlExtractedChange,
  onCreatedColumnIdChange,
  onSubmit,
  onRestore,
  onCopyId,
}: AddColumnModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = 'unset'
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    onTitleChange('')
    onDescriptionChange('')
    onFlowIdChange('')
    onUrlExtractedChange(false)
    onCreatedColumnIdChange(null)
  }

  return (
    <div className="nd-modal-wrap" onClick={handleClose}>
      <div className="nd-modal nd-modal-sm" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="nd-mh-l">
            <span className="nd-mh-col">Ny kolumn</span>
          </div>
          <div className="nd-mh-r">
            <button onClick={handleClose} aria-label="Stäng" className="nd-mh-x">✕</button>
          </div>
        </header>

        <div className="nd-mbody">
          <div className="nd-tabs">
            <button
              type="button"
              onClick={() => onTabChange(false)}
              className={`nd-tab ${!showArchivedColumns ? 'nd-active' : ''}`}
            >
              Skapa ny
            </button>
            <button
              type="button"
              onClick={() => onTabChange(true)}
              className={`nd-tab ${showArchivedColumns ? 'nd-active' : ''}`}
            >
              Återställ ({archivedColumns.length})
            </button>
          </div>

          {!showArchivedColumns ? (
            createdColumnId ? (
              // Bekräftelsesteg efter skapad kolumn
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nd-live)' }}>
                  <Check className="h-4 w-4" />
                  <span style={{ fontWeight: 600 }}>&quot;{createdColumnId.title}&quot; har skapats</span>
                </div>
                <div>
                  <label className="nd-label">Kolumn-ID (klistra in i Workflows)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={createdColumnId.id}
                      readOnly
                      className="nd-input nd-mono"
                    />
                    <button
                      type="button"
                      onClick={() => onCopyId(createdColumnId.id, createdColumnId.id, createdColumnId.title)}
                      className="nd-btn nd-btn-primary"
                      style={{ flexShrink: 0 }}
                    >
                      {copiedId === createdColumnId.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Kopiera
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Create new column form
              <form
                id="add-column-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (newColumnTitle.trim()) onSubmit()
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="nd-label">Kolumnnamn *</label>
                    <input
                      type="text"
                      value={newColumnTitle}
                      onChange={(e) => onTitleChange(e.target.value)}
                      className="nd-input"
                      placeholder="t.ex. Breaking News Stockholm"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="nd-tip">
                    {activeColumnCount === 0 && (
                      <div style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 99,
                        background: 'color-mix(in oklch, var(--nd-live) 20%, transparent)',
                        color: 'var(--nd-live)', fontSize: 10.5,
                        fontFamily: 'var(--nd-font-mono)', letterSpacing: '0.04em',
                        textTransform: 'uppercase', marginBottom: 8,
                      }}>
                        Rekommenderat för första kolumnen
                      </div>
                    )}
                    <div className="nd-tip-title">🤖 Fyll kolumnen automatiskt?</div>
                    <div style={{ marginBottom: 10 }}>
                      Anslut en AI-workflow så tar kolumnen emot nyheter direkt — inga fler steg krävs.
                    </div>
                    <label className="nd-checkbox">
                      <input
                        type="checkbox"
                        checked={showWorkflowInput}
                        onChange={(e) => onWorkflowInputToggle(e.target.checked)}
                      />
                      <span style={{ fontWeight: 500 }}>Ja, anslut workflow</span>
                    </label>
                  </div>

                  {showWorkflowInput ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label className="nd-label">Workflow-URL</label>
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
                          className="nd-input nd-mono"
                          placeholder="Klistra in URL från Workflows-appen"
                        />
                        <div style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginTop: 4, fontSize: 11, color: 'var(--nd-ink-mute)',
                        }}>
                          <span>Vi extraherar automatiskt ID:t från URL:en</span>
                          {urlExtracted && (
                            <span style={{ color: 'var(--nd-live)', fontWeight: 600 }}>
                              ✓ ID extraherat
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="nd-tip">
                        <div className="nd-tip-title">
                          <Info className="h-3.5 w-3.5" />
                          Så här gör du
                        </div>
                        <ol>
                          <li>
                            <a
                              href="https://workflows-lab-iap.bnu.bn.nr/"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Öppna Workflows-appen <ExternalLink className="h-3 w-3 inline" />
                            </a>
                          </li>
                          <li>Välj din workflow med &quot;PostToNewsdeck&quot;-nod</li>
                          <li>Kopiera URL:en från adressfältet</li>
                          <li>Klistra in här ovan</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <div className="nd-tip" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Inget problem! Du kan ansluta en workflow senare via kolumnens inställningar <Settings className="h-3 w-3 inline" />.</span>
                    </div>
                  )}
                </div>
              </form>
            )
          ) : (
            // Restore archived columns
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {archivedColumns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--nd-ink-mute)' }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>📦</div>
                  <div>Inga arkiverade kolumner</div>
                </div>
              ) : (
                archivedColumns.map((column) => (
                  <div
                    key={column.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, padding: 12,
                      background: 'var(--nd-bg-soft)',
                      border: '1px solid var(--nd-line-soft)',
                      borderRadius: 'var(--nd-r-md)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--nd-ink)' }}>{column.title}</div>
                      {column.description && (
                        <div style={{ fontSize: 12, color: 'var(--nd-ink-mute)', marginTop: 2 }}>
                          {column.description}
                        </div>
                      )}
                      <div style={{
                        fontSize: 11, color: 'var(--nd-ink-mute)', marginTop: 4,
                        fontFamily: 'var(--nd-font-mono)',
                      }}>
                        Arkiverad: {new Date(column.archivedAt || '').toLocaleDateString('sv-SE')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestore(column.id)}
                      className="nd-btn nd-btn-primary"
                      style={{ flexShrink: 0 }}
                    >
                      Återställ
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <footer className="nd-mfoot">
          {createdColumnId ? (
            <button type="button" onClick={handleClose} className="nd-btn nd-btn-primary">
              Stäng
            </button>
          ) : showArchivedColumns ? (
            <button
              type="button"
              onClick={() => { onClose(); onTabChange(false) }}
              className="nd-btn nd-btn-ghost"
            >
              Stäng
            </button>
          ) : (
            <>
              <button type="button" onClick={handleClose} className="nd-btn nd-btn-ghost">
                Avbryt
              </button>
              <button
                type="submit"
                form="add-column-form"
                disabled={!newColumnTitle.trim()}
                className="nd-btn nd-btn-primary"
              >
                Skapa kolumn
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
