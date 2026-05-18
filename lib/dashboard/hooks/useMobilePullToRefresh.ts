import { useCallback, useRef, useState } from 'react'

interface UseMobilePullToRefreshOptions {
  onRefresh: () => Promise<void>
}

interface UseMobilePullToRefreshReturn {
  pullDistance: number
  isRefreshing: boolean
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => Promise<void>
}

/**
 * Per-slide pull-to-refresh för mobilkarusellen. Lyssnar endast på touch när
 * scroll-containern står vid topp (scrollTop === 0). I kombination med
 * `touch-action: pan-y` på elementet routar webbläsaren horisontella gester
 * vidare till embla utan att trigga PTR.
 */
export function useMobilePullToRefresh({
  onRefresh,
}: UseMobilePullToRefreshOptions): UseMobilePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current
    if (!container || container.scrollTop > 0) return
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current
    if (!container || container.scrollTop > 0 || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - touchStartY.current)
    const resistance = 0.5
    const maxPull = 120
    setPullDistance(Math.min(distance * resistance, maxPull))
  }, [isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    const threshold = 60
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      await onRefresh()
      setTimeout(() => {
        setIsRefreshing(false)
        setPullDistance(0)
      }, 500)
    } else {
      setPullDistance(0)
    }
    touchStartY.current = 0
  }, [pullDistance, isRefreshing, onRefresh])

  return {
    pullDistance,
    isRefreshing,
    scrollContainerRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
