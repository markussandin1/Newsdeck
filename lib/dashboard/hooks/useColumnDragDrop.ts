import { useCallback, useState } from 'react'

interface DragPreview {
  x: number
  y: number
  visible: boolean
}

interface UseColumnDragDropProps {
  reorderColumns: (draggedColumnId: string, targetColumnId: string) => void | Promise<void>
}

interface UseColumnDragDropReturn {
  draggedColumn: string | null
  dragOverColumn: string | null
  dragPreview: DragPreview
  handleDragStart: (e: React.DragEvent, columnId: string) => void
  handleDragEnd: () => void
  handleDragOver: (e: React.DragEvent, columnId: string) => void
  handleDragLeave: () => void
  handleDrop: (e: React.DragEvent, targetColumnId: string) => void
}

/**
 * Hanterar drag-and-drop för att flytta om kolumner i en dashboard.
 *
 * Extraherat ur DashboardView (P1-3 steg 2) eftersom logiken är fristående
 * och utgör ~50 rader plus 3 useState. Tidigare låg allt inline i
 * DashboardView vilket gjorde komponenten svår att överblicka.
 *
 * - `draggedColumn` / `dragOverColumn`: visuell highlight medan dragningen
 *   pågår.
 * - `dragPreview`: position för mobil/touch-preview-overlay (renderas av
 *   <MobileDragPreview/>).
 * - Drop-handlern delegerar omarrangeringen till `reorderColumns`
 *   (server-state-action) som kallaren skickar in.
 */
export function useColumnDragDrop({
  reorderColumns,
}: UseColumnDragDropProps): UseColumnDragDropReturn {
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview>({ x: 0, y: 0, visible: false })

  const handleDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnId)

    // Dölj browser-default-preview (en transparent 1x1-canvas funkar
    // som "ingen preview"). Vår egen <MobileDragPreview/> tar över.
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.globalAlpha = 0.01
      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, 1, 1)
    }
    e.dataTransfer.setDragImage(canvas, 0, 0)
    setDragPreview({ x: e.clientX, y: e.clientY, visible: true })

    const handleMouseMove = (event: MouseEvent) => {
      setDragPreview({ x: event.clientX, y: event.clientY, visible: true })
    }
    document.addEventListener('dragover', handleMouseMove)
    const cleanup = () => {
      document.removeEventListener('dragover', handleMouseMove)
      document.removeEventListener('dragend', cleanup)
    }
    document.addEventListener('dragend', cleanup)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedColumn(null)
    setDragOverColumn(null)
    setDragPreview({ x: 0, y: 0, visible: false })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    const draggedColumnId = e.dataTransfer.getData('text/plain')
    if (draggedColumnId && draggedColumnId !== targetColumnId) {
      void reorderColumns(draggedColumnId, targetColumnId)
    }
    setDraggedColumn(null)
    setDragOverColumn(null)
  }, [reorderColumns])

  return {
    draggedColumn,
    dragOverColumn,
    dragPreview,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
