'use client'

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
  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    onNameChange('')
    onDescriptionChange('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground rounded-xl shadow-2xl max-w-md w-full border border-border">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-display font-semibold text-foreground">Skapa ny dashboard</h3>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground text-xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            if (newDashboardName.trim()) {
              onSubmit(newDashboardName, newDashboardDescription)
            }
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Dashboard namn *
                </label>
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="w-full p-3 border border-input rounded-lg font-body focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                  placeholder="t.ex. Nyheter Stockholm"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Beskrivning (valfritt)
                </label>
                <textarea
                  value={newDashboardDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  className="w-full p-3 border border-input rounded-lg font-body focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background text-foreground"
                  placeholder="Beskriv vad denna dashboard ska innehålla..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 mt-6 border-t border-slate-200">
              <button
                type="submit"
                className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 smooth-transition font-medium"
                disabled={!newDashboardName.trim()}
              >
                Skapa dashboard
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 border border-input text-foreground rounded-lg hover:bg-muted smooth-transition font-medium"
              >
                Avbryt
              </button>
            </div>
          </form>

          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">💡 Tips:</div>
              <div>Du kommer att kunna lägga till kolumner i din nya dashboard efter att den skapats.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
