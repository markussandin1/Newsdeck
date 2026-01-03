'use client'

import { useEffect, useRef } from 'react'
import { NewsItem } from '@/lib/types'
import { GalleryImageCard } from '@/components/GalleryImageCard'

interface GalleryGridProps {
  items: NewsItem[]
  onItemClick: (item: NewsItem) => void
  onLoadMore: () => void
  hasMore: boolean
  loadingMore: boolean
  loadError?: string | null
  onRetry?: () => void
}

export function GalleryGrid({
  items,
  onItemClick,
  onLoadMore,
  hasMore,
  loadingMore,
  loadError,
  onRetry
}: GalleryGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (firstEntry?.isIntersecting && hasMore && !loadingMore && !loadError) {
          onLoadMore()
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
  }, [hasMore, loadingMore, loadError, onLoadMore])

  return (
    <>
      {/* Masonry Grid using CSS Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-auto">
        {items.map((item) => (
          <GalleryImageCard
            key={item.dbId}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>

      {/* Loading indicator */}
      {loadingMore && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Error state */}
      {loadError && (
        <div className="text-center py-6 text-sm text-destructive space-y-2">
          <div>{loadError}</div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
            >
              Försök igen
            </button>
          )}
        </div>
      )}

      {/* End indicator */}
      {!hasMore && items.length > 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Inga fler bilder att visa
        </div>
      )}
    </>
  )
}
