/**
 * useColumnEditing Hook
 *
 * Inline-editering av en kolumn i DashboardView. Ager:
 *   - editingColumn (id eller null)
 *   - editTitle / editDescription / editFlowId (utkast i formularet)
 *   - showExtractionSuccess (kort feedback efter URL-extraktion)
 *
 * Exponerar:
 *   - startEditing(column) — initiera redigering med kolumnens nuvarande varden
 *   - cancelEditing() — stang utan att spara
 *   - saveColumn(...) — anropa updateColumn-callbacken och stang
 */

import { useState } from 'react'
import { DashboardColumn } from '@/lib/types'

interface UseColumnEditingArgs {
  updateColumn: (columnId: string, title: string, description?: string, flowId?: string) => Promise<void>
}

export function useColumnEditing({ updateColumn }: UseColumnEditingArgs) {
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFlowId, setEditFlowId] = useState('')
  const [showExtractionSuccess, setShowExtractionSuccess] = useState(false)

  const startEditing = (column: DashboardColumn) => {
    setEditingColumn(column.id)
    setEditTitle(column.title)
    setEditDescription(column.description || '')
    setEditFlowId(column.flowId || '')
  }

  const cancelEditing = () => {
    setEditingColumn(null)
  }

  const saveColumn = async (
    columnId: string,
    title: string,
    description?: string,
    flowId?: string,
  ) => {
    await updateColumn(columnId, title, description, flowId)
    setEditingColumn(null)
    setEditFlowId('')
  }

  return {
    editingColumn,
    editTitle,
    editDescription,
    editFlowId,
    showExtractionSuccess,
    setEditTitle,
    setEditDescription,
    setEditFlowId,
    setShowExtractionSuccess,
    startEditing,
    cancelEditing,
    saveColumn,
  }
}
