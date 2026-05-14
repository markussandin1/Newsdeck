'use client'

import { useState, useEffect, useRef } from 'react'
import { NewsItem as NewsItemType } from '@/lib/types'
import NewsItem from '@/components/NewsItem'

interface ColumnContentProps {
  columnId: string
  items: NewsItemType[]
  onSelectNewsItem: (item: NewsItemType) => void
  hasFilterActive: boolean
}

export function ColumnContent({
  columnId,
  items,
  onSelectNewsItem,
  hasFilterActive,
}: ColumnContentProps) {
  const [displayCount, setDisplayCount] = useState(25)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Reset display count when items change significantly
  useEffect(() => {
    if (items.length < displayCount) {
      setDisplayCount(25)
    }
  }, [items.length, displayCount])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (firstEntry?.isIntersecting && displayCount < items.length) {
          // Load 25 more items
          setDisplayCount(prev => Math.min(prev + 25, items.length))
        }
      },
      {
        root: null,
        // P3-9: 100px (tidigare 200) trigger:ar laddning senare så användare
        // hinner se botten innan nya items poppas in. Förhindrar visuella
        // hopp vid snabb scroll på långa kolumner.
        rootMargin: '100px',
        threshold: 0.1
      }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [displayCount, items.length])

  if (items.length === 0) {
    if (hasFilterActive) {
      return (
        <div className="nd-col-empty">
          <div className="nd-col-empty-ic">🔍</div>
          <div className="nd-col-empty-t">Inga träffar</div>
          <div className="nd-col-empty-d">Inga händelser matchar sökningen.</div>
        </div>
      )
    }
    return (
      <div className="nd-col-empty">
        <div className="nd-col-empty-ic">◦</div>
        <div className="nd-col-empty-t">Tom kolumn</div>
        <div className="nd-col-empty-d">
          {columnId
            ? <>Väntar på händelser till <code>{columnId.slice(0, 8)}…</code></>
            : <>Väntar på händelser…</>}
        </div>
        <div className="nd-col-empty-hint">
          Behöver du justera kolumnen? Klicka på <span aria-hidden>⋮</span>-menyn uppe till höger
          för inställningar, ljudnotiser och feed-URL.
        </div>
        <div className="nd-col-empty-hint">
          Första gången? Läs <a href="/docs" className="underline hover:no-underline">hur du fyller kolumnen med händelser via Workflows</a>.
        </div>
      </div>
    )
  }

  const visibleItems = items.slice(0, displayCount)
  const hasMore = displayCount < items.length

  return (
    <>
      {visibleItems.map((item) => (
        <div key={`${columnId}-${item.dbId}`} className="mb-2">
          <NewsItem item={item} onSelect={onSelectNewsItem} />
        </div>
      ))}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-4 text-xs text-gray-400"
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </>
  )
}
