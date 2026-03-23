'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { NewsItem as NewsItemType } from '@/lib/types'
import { Settings, Copy, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        rootMargin: '200px', // Start loading when 200px from bottom
        threshold: 0.1
      }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [displayCount, items.length])

  if (items.length === 0) {
    if (hasFilterActive) {
      return (
        <div className="text-center py-8 px-4 text-muted-foreground text-sm">
          <div className="mb-2 text-2xl">🔍</div>
          <div>Inga händelser matchar sökningen.</div>
        </div>
      )
    }
    return (
      <div className="text-center py-8 px-4 text-muted-foreground text-sm">
        <div className="mb-4 flex justify-center">
          <Image src="/newsdeck-icon.svg" alt="Newsdeck logo" width={48} height={48} className="w-12 h-12 object-contain opacity-40" />
        </div>
        <div className="font-medium text-foreground mb-3">Denna kolumn är tom</div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-blue-50 rounded-lg text-left">
            <div className="font-medium text-blue-800 mb-1 flex items-center gap-1">
              <Info className="h-3 w-3" />
              För automatiska nyheter:
            </div>
            <div className="text-blue-700 mb-2 flex items-center gap-1">
              Klicka på <Settings className="h-3 w-3 inline" /> och anslut en workflow
            </div>
            <Button
              asChild
              variant="link"
              size="sm"
              className="h-auto p-0 text-blue-600 hover:underline font-medium"
            >
              <a
                href="https://workflows-lab-iap.bnu.bn.nr/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Öppna Workflows-appen →
              </a>
            </Button>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg text-left">
            <div className="font-medium text-foreground mb-1 flex items-center gap-1">
              <Copy className="h-3 w-3" />
              För manuell publicering:
            </div>
            <div className="text-muted-foreground flex items-center gap-1">
              Använd Kolumn-ID från inställningar <Settings className="h-3 w-3 inline" />
            </div>
          </div>
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
          <NewsItem
            item={item}
            compact={true}
            onClick={() => onSelectNewsItem(item)}
          />
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
