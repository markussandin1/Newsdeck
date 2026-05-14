import { useEffect, useState } from 'react'

export type ViewMode = 'columns' | 'pulse' | 'grid'

const STORAGE_KEY = 'nd.viewMode'
const VALID_VIEW_MODES: ViewMode[] = ['columns', 'pulse', 'grid']

function isValidViewMode(value: unknown): value is ViewMode {
  return typeof value === 'string' && (VALID_VIEW_MODES as string[]).includes(value)
}

/**
 * Hanterar vyväljaren (Kolumner / Pulse / Grid) med:
 *  - localStorage-persistens (`nd.viewMode`)
 *  - cross-tab-sync via `storage`-eventet (P2-8)
 *  - SSR-safe init (typeof window-check)
 *
 * Extraherat ur DashboardView (P1-3 steg 3). Tre useState/useEffect-block
 * blir en oneliner i kallaren.
 */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'columns'
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isValidViewMode(stored) ? stored : 'columns'
  })

  // Persist till localStorage vid varje state-uppdatering.
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, viewMode)
  }, [viewMode])

  // Synka mellan flikar.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      if (isValidViewMode(event.newValue)) {
        setViewMode(event.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return [viewMode, setViewMode]
}
