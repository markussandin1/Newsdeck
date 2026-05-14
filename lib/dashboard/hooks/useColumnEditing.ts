/**
 * useColumnEditing Hook
 *
 * Inline-editering av en kolumn i DashboardView. Ager:
 *   - editingColumn (id eller null)
 *   - editTitle / editDescription (utkast i formularet)
 *
 * Exponerar:
 *   - startEditing(column) — initiera redigering med kolumnens nuvarande varden
 *   - cancelEditing() — stang utan att spara
 *   - saveColumn(...) — anropa updateColumn-callbacken och stang
 *
 * Notera: tidigare hanterade vi aven flowId/URL-extraktion. Det rev vi
 * sedan P1-5 (workflowId-routing borttagen). Workflows postar nu via
 * columnId, sa flowId-faltet ar legacy och visas inte langre.
 */

import { useState } from 'react'
import { DashboardColumn } from '@/lib/types'

interface UseColumnEditingArgs {
  updateColumn: (columnId: string, title: string, description?: string) => Promise<void>
}

export function useColumnEditing({ updateColumn }: UseColumnEditingArgs) {
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const startEditing = (column: DashboardColumn) => {
    setEditingColumn(column.id)
    setEditTitle(column.title)
    setEditDescription(column.description || '')
  }

  const cancelEditing = () => {
    setEditingColumn(null)
  }

  const saveColumn = async (columnId: string, title: string, description?: string) => {
    await updateColumn(columnId, title, description)
    setEditingColumn(null)
  }

  return {
    editingColumn,
    editTitle,
    editDescription,
    setEditTitle,
    setEditDescription,
    startEditing,
    cancelEditing,
    saveColumn,
  }
}
