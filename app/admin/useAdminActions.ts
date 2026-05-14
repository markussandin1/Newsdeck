'use client'

import { useState } from 'react'

export type Feedback = { type: 'success' | 'error', message: string }

const EXAMPLE_DATA = [
  {
    id: 'news-001',
    title: 'Breaking News: Stor brand i Stockholm centrum',
    description: 'Räddningstjänst på plats med flera enheter. Byggnaden evakuerad.',
    source: 'workflows',
    timestamp: new Date().toISOString(),
    newsValue: 5,
    category: 'emergency',
    severity: 'critical',
    location: {
      municipality: 'Stockholm',
      county: 'Stockholm',
      name: 'Drottninggatan 50',
    },
  },
  {
    id: 'news-002',
    title: 'Trafikstörningar på E4',
    description: 'Bilkö på flera kilometer efter trafikolycka',
    source: 'workflows',
    timestamp: new Date().toISOString(),
    newsValue: 3,
    category: 'traffic',
    severity: 'medium',
    location: {
      municipality: 'Sollentuna',
      county: 'Stockholm',
    },
  },
]

interface UseAdminActionsArgs {
  selectedDashboard: string
  selectedColumn: string
  jsonInput: string
  setJsonInput: (val: string) => void
  refreshItems: (dashboardId?: string) => void
}

/**
 * Skriv-operationer i adminvyn (P2-4 steg 2):
 *   - deleteItem: ta bort en specifik news_item
 *   - clearColumnData: töm en kolumn pa events
 *   - submitData: POST:a JSON till en kolumn
 *   - runMigration: kor createdInDb-backfill
 *   - loadExample: fyll input-faltet med exempeldata
 *
 * Hooken äger även `feedback`-state — varje action sätter resultat dit.
 */
export function useAdminActions({
  selectedDashboard,
  selectedColumn,
  jsonInput,
  setJsonInput,
  refreshItems,
}: UseAdminActionsArgs) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const deleteItem = async (dbId: string, originalId: string) => {
    if (!confirm(`Är du säker på att du vill ta bort händelsen "${originalId}"?`)) {
      return
    }

    try {
      const response = await fetch('/api/news-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbId }),
      })
      const result = await response.json()

      if (response.ok) {
        setFeedback({ type: 'success', message: result.message })
        refreshItems(selectedDashboard)
      } else {
        setFeedback({
          type: 'error',
          message: result.error || result.message || `Fel ${response.status}: Kunde inte ta bort händelsen`,
        })
      }
    } catch (error) {
      console.error('Failed to delete news item:', error)
      setFeedback({ type: 'error', message: 'Kunde inte ta bort händelsen' })
    }
  }

  const loadExample = () => {
    setJsonInput(JSON.stringify(EXAMPLE_DATA, null, 2))
  }

  const submitData = async () => {
    if (!selectedColumn) {
      setFeedback({ type: 'error', message: 'Välj en kolumn först' })
      return
    }

    try {
      setFeedback(null)
      const data = JSON.parse(jsonInput)

      const response = await fetch(`/api/columns/${selectedColumn}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()

      if (response.ok) {
        setFeedback({ type: 'success', message: result.message })
        setJsonInput('')
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    } catch (error) {
      console.error('Failed to parse JSON payload:', error)
      setFeedback({ type: 'error', message: 'Invalid JSON format' })
    }
  }

  const runMigration = async () => {
    try {
      setFeedback(null)

      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json()

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: `Migration slutförd! ${result.updated} events uppdaterades med createdInDb timestamp.`,
        })
      } else {
        setFeedback({ type: 'error', message: result.error || 'Migration misslyckades' })
      }
    } catch (error) {
      console.error('Failed to run migration:', error)
      setFeedback({ type: 'error', message: 'Kunde inte köra migration' })
    }
  }

  const clearColumnData = async (columnId: string) => {
    if (!confirm('Är du säker på att du vill radera all data från denna kolumn?')) {
      return
    }

    try {
      const response = await fetch(`/api/columns/${columnId}`, { method: 'DELETE' })
      const result = await response.json()

      if (response.ok) {
        setFeedback({ type: 'success', message: result.message })
        refreshItems(selectedDashboard)
      } else {
        setFeedback({
          type: 'error',
          message: result.error || result.message || `Fel ${response.status}: Kunde inte rensa kolumndata`,
        })
      }
    } catch (error) {
      console.error('Failed to clear column data:', error)
      setFeedback({ type: 'error', message: 'Kunde inte rensa kolumndata' })
    }
  }

  return {
    feedback,
    deleteItem,
    loadExample,
    submitData,
    runMigration,
    clearColumnData,
  }
}
