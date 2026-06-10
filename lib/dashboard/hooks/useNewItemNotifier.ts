import { useEffect, useRef } from 'react'
import type { NewsItem } from '@/lib/types'
import type { ColumnStoreState } from '@/lib/dashboard/column-store'
import { diffNewItems } from '@/lib/dashboard/new-item-diff'

interface UseNewItemNotifierProps {
  columnData: ColumnStoreState
  onNewItems: (columnId: string, items: NewsItem[]) => void
}

/**
 * Enda källan till "nytt item"-notiser. Körs som effekt på columnData —
 * aldrig inne i en setState-updater (som kan köras om av React och gav
 * dubbla ljud). Seen-settet gör effekten idempotent.
 */
export function useNewItemNotifier({ columnData, onNewItems }: UseNewItemNotifierProps): void {
  const seenRef = useRef<Set<string> | null>(null)
  const onNewItemsRef = useRef(onNewItems)
  onNewItemsRef.current = onNewItems

  useEffect(() => {
    // Vänta på första icke-tomma state — annars konsumeras den tysta
    // första körningen av initial-{} och sidladdning replay:ar notiser.
    if (seenRef.current === null && Object.keys(columnData).length === 0) return

    const isFirstRun = seenRef.current === null
    const seen = seenRef.current ?? (seenRef.current = new Set<string>())

    const fresh = diffNewItems(columnData, seen, Date.now(), isFirstRun)
    for (const [columnId, items] of Object.entries(fresh)) {
      onNewItemsRef.current(columnId, items)
    }
  }, [columnData])
}
