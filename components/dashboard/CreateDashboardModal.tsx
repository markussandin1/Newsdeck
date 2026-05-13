'use client'

import { useEffect } from 'react'

interface CreateDashboardModalProps {
  isOpen: boolean
  newDashboardName: string
  newDashboardDescription: string
  onClose: () => void
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onSubmit: (name: string, description?: string) => void
}

export function CreateDashboardModal({
  isOpen,
  newDashboardName,
  newDashboardDescription,
  onClose,
  onNameChange,
  onDescriptionChange,
  onSubmit,
}: CreateDashboardModalProps) {
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
    onNameChange('')
    onDescriptionChange('')
  }

  return (
    <div className="nd-modal-wrap" onClick={handleClose}>
      <div className="nd-modal nd-modal-sm" onClick={(e) => e.stopPropagation()}>
        <header>
          <div className="nd-mh-l">
            <span className="nd-mh-col">Ny dashboard</span>
          </div>
          <div className="nd-mh-r">
            <button onClick={handleClose} aria-label="Stäng" className="nd-mh-x">✕</button>
          </div>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (newDashboardName.trim()) {
              onSubmit(newDashboardName, newDashboardDescription)
            }
          }}
        >
          <div className="nd-mbody">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="nd-label">Dashboard-namn *</label>
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="nd-input"
                  placeholder="t.ex. Nyheter Stockholm"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="nd-label">Beskrivning (valfritt)</label>
                <textarea
                  value={newDashboardDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  className="nd-textarea"
                  placeholder="Beskriv vad denna dashboard ska innehålla…"
                  rows={3}
                />
              </div>

              <div className="nd-tip">
                <div className="nd-tip-title">💡 Tips</div>
                Du kan lägga till kolumner i din nya dashboard direkt efter att den skapats.
              </div>
            </div>
          </div>

          <footer className="nd-mfoot">
            <button type="button" onClick={handleClose} className="nd-btn nd-btn-ghost">
              Avbryt
            </button>
            <button type="submit" disabled={!newDashboardName.trim()} className="nd-btn nd-btn-primary">
              Skapa dashboard
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
