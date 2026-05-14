'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { DashboardColumn } from '@/lib/types'
import { Copy, Check, Info, ExternalLink } from 'lucide-react'

interface AddColumnModalProps {
  isOpen: boolean
  showArchivedColumns: boolean
  newColumnTitle: string
  newColumnDescription: string
  createdColumnId: { id: string; title: string } | null
  archivedColumns: DashboardColumn[]
  copiedId: string | null
  onClose: () => void
  onTabChange: (showArchived: boolean) => void
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCreatedColumnIdChange: (value: { id: string; title: string } | null) => void
  onSubmit: () => void
  onRestore: (columnId: string) => void
  onCopyId: (text: string | undefined, columnId: string, columnTitle: string) => void
}

export function AddColumnModal({
  isOpen,
  showArchivedColumns,
  newColumnTitle,
  newColumnDescription,
  createdColumnId,
  archivedColumns,
  copiedId,
  onClose,
  onTabChange,
  onTitleChange,
  onDescriptionChange,
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
              /* ── Bekräftelse efter skapad kolumn ────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--nd-live)' }}>
                  <Check className="h-4 w-4" />
                  <span style={{ fontWeight: 600 }}>
                    &quot;{createdColumnId.title}&quot; har skapats
                  </span>
                </div>

                <div>
                  <label className="nd-label">Kolumn-ID</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={createdColumnId.id}
                      readOnly
                      className="nd-input nd-mono"
                      onFocus={(e) => e.target.select()}
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

                <div className="nd-tip">
                  <div className="nd-tip-title">
                    <Info className="h-3.5 w-3.5" />
                    Så här fyller du kolumnen med händelser
                  </div>
                  <ol>
                    <li>Öppna ditt flöde i <strong>Workflows</strong></li>
                    <li>Lägg till noden <strong>Newsdeck Publisher</strong> i slutet av flödet</li>
                    <li>Klistra in kolumn-ID:t ovan i nodens konfiguration</li>
                    <li>Spara och kör flödet — nya händelser dyker upp här direkt</li>
                  </ol>
                  <div style={{ marginTop: 10, fontSize: 12 }}>
                    Vill du se hela flödet?{' '}
                    <Link
                      href="/docs"
                      onClick={handleClose}
                      style={{ textDecoration: 'underline' }}
                    >
                      Läs dokumentationen <ExternalLink className="h-3 w-3 inline" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Skapa ny ───────────────────────────────────────────── */
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

                  <div>
                    <label className="nd-label">Beskrivning <span style={{ color: 'var(--nd-ink-mute)', fontWeight: 400 }}>(valfri)</span></label>
                    <input
                      type="text"
                      value={newColumnDescription}
                      onChange={(e) => onDescriptionChange(e.target.value)}
                      className="nd-input"
                      placeholder="Vad bevakar kolumnen?"
                    />
                  </div>

                  <div className="nd-tip">
                    <div className="nd-tip-title">
                      <Info className="h-3.5 w-3.5" />
                      Vad händer sen?
                    </div>
                    <div>
                      När kolumnen är skapad får du ett kolumn-ID som du klistrar in i{' '}
                      <strong>Newsdeck Publisher</strong>-noden i Workflows. Det är så händelserna hittar hit.
                    </div>
                  </div>
                </div>
              </form>
            )
          ) : (
            /* ── Återställ arkiverade ─────────────────────────────────── */
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
              Klart
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
