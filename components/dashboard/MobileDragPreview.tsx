'use client'

import { Dashboard } from '@/lib/types'
import { ColumnData } from '@/lib/dashboard/types'

interface MobileDragPreviewProps {
  dragPreview: { x: number; y: number; visible: boolean }
  draggedColumnId: string | null
  dashboard: Dashboard
  filteredColumnData: ColumnData
}

export function MobileDragPreview({
  dragPreview,
  draggedColumnId,
  dashboard,
  filteredColumnData,
}: MobileDragPreviewProps) {
  if (!dragPreview.visible || !draggedColumnId) return null

  const column = dashboard?.columns?.find(col => col.id === draggedColumnId)
  if (!column) return null

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: dragPreview.x - 160, // Center the 320px wide column
        top: dragPreview.y - 50,
        transform: 'rotate(2deg) scale(0.8)',
      }}
    >
      <div className="w-80 bg-white border-2 border-blue-500 rounded-xl shadow-2xl opacity-90">
        <div className="glass border-b border-slate-200/50 p-4 rounded-t-xl">
          <div className="flex justify-between items-start ml-6">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {column.title}
                  </h3>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {filteredColumnData[column.id]?.length || 0} händelser
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 text-center text-muted-foreground text-sm">
          Drar kolumn...
        </div>
      </div>
    </div>
  )
}
