'use client'

import { motion } from 'framer-motion'
import type { DashboardColumn, NewsItem as NewsItemType } from '@/lib/types'
import { ColumnContent } from '@/components/column/ColumnContent'
import { useMobilePullToRefresh } from '@/lib/dashboard/hooks/useMobilePullToRefresh'

interface MobileColumnSlideProps {
  column: DashboardColumn
  items: NewsItemType[]
  onSelectNewsItem: (item: NewsItemType) => void
  hasFilterActive: boolean
  onRefresh: () => Promise<void>
}

export function MobileColumnSlide({
  column,
  items,
  onSelectNewsItem,
  hasFilterActive,
  onRefresh,
}: MobileColumnSlideProps) {
  const {
    pullDistance,
    isRefreshing,
    scrollContainerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useMobilePullToRefresh({ onRefresh })

  return (
    <div className="h-full bg-background flex flex-col">
      <div
        className="flex items-center justify-center transition-all duration-200 bg-muted/40"
        style={{ height: pullDistance, opacity: Math.min(pullDistance / 60, 1) }}
      >
        {isRefreshing ? (
          <div className="flex items-center gap-2 text-foreground text-sm">
            <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            <span>Uppdaterar...</span>
          </div>
        ) : pullDistance > 0 ? (
          <div className="text-foreground text-sm flex items-center gap-2">
            <motion.div
              animate={{ rotate: pullDistance > 60 ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ↓
            </motion.div>
            <span>{pullDistance > 60 ? 'Släpp för att uppdatera' : 'Dra för att uppdatera'}</span>
          </div>
        ) : null}
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3"
        style={{
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          transform: `translateY(${pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ColumnContent
          columnId={column.id}
          items={items}
          onSelectNewsItem={onSelectNewsItem}
          hasFilterActive={hasFilterActive}
        />
      </div>
    </div>
  )
}
