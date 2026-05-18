'use client'

import { useCallback, useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DashboardColumn, NewsItem as NewsItemType } from '@/lib/types'
import { MobileColumnSlide } from './MobileColumnSlide'

interface MobileColumnCarouselProps {
  columns: DashboardColumn[]
  columnData: Record<string, NewsItemType[]>
  activeIndex: number
  onIndexChange: (index: number) => void
  onSelectNewsItem: (item: NewsItemType) => void
  hasFilterActive: boolean
  onRefresh: () => Promise<void>
}

/**
 * Mobil kolumnkarusell baserad på embla-carousel-react.
 *
 * Embla sätter `touch-action: pan-y pinch-zoom` på sin container, vilket
 * innebär att vertikala gester routas till barn-elementens scroll (och vår
 * pull-to-refresh) medan horisontella swipes konsumeras av karusellen. Det
 * löser gestkonflikten vi tidigare hade med `framer-motion`'s `drag="x"`.
 *
 * Varje slide är 92% bred och centrerad, så användaren ser ~4% peek av
 * grannkolumnen på vardera sidan — den feedback som signalerar att man kan
 * swipa.
 */
export function MobileColumnCarousel({
  columns,
  columnData,
  activeIndex,
  onIndexChange,
  onSelectNewsItem,
  hasFilterActive,
  onRefresh,
}: MobileColumnCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'x',
    align: 'center',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
    duration: 22,
    startIndex: activeIndex,
  })

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    onIndexChange(emblaApi.selectedScrollSnap())
  }, [emblaApi, onIndexChange])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    if (!emblaApi) return
    if (emblaApi.selectedScrollSnap() !== activeIndex) {
      emblaApi.scrollTo(activeIndex)
    }
  }, [emblaApi, activeIndex])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  return (
    <div className="relative h-full flex flex-col">
      {columns.length > 1 && (
        <>
          {activeIndex > 0 && (
            <button
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card active:bg-muted border border-border shadow-lg rounded-full p-3 transition-all"
              aria-label="Föregående kolumn"
            >
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </button>
          )}
          {activeIndex < columns.length - 1 && (
            <button
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card active:bg-muted border border-border shadow-lg rounded-full p-3 transition-all"
              aria-label="Nästa kolumn"
            >
              <ChevronRight className="h-6 w-6 text-foreground" />
            </button>
          )}
        </>
      )}

      <div className="overflow-hidden flex-1 min-h-0" ref={emblaRef}>
        <div className="flex h-full">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex-[0_0_92%] min-w-0 px-1 h-full"
            >
              <MobileColumnSlide
                column={column}
                items={columnData[column.id] || []}
                onSelectNewsItem={onSelectNewsItem}
                hasFilterActive={hasFilterActive}
                onRefresh={onRefresh}
              />
            </div>
          ))}
        </div>
      </div>

      {columns.length > 1 && (
        <div className="safe-area-bottom pb-4 pt-2 bg-background border-t border-border">
          <div className="flex items-center justify-center gap-2">
            {columns.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className="p-2"
                aria-label={`Gå till kolumn ${index + 1}`}
              >
                <motion.div
                  className={`rounded-full transition-all ${
                    index === activeIndex
                      ? 'bg-primary w-8 h-2'
                      : 'bg-muted-foreground/40 w-2 h-2'
                  }`}
                  layout
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
