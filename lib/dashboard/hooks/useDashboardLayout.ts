import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { DashboardColumn } from '@/lib/types'

interface UseDashboardLayoutProps {
  columns: DashboardColumn[]
  onRefresh: () => Promise<void>
}

interface UseDashboardLayoutReturn {
  // Mobile state
  isMobile: boolean
  activeColumnIndex: number
  showMobileMenu: boolean
  showDashboardDropdown: boolean

  // Pull-to-refresh state
  pullDistance: number
  isRefreshing: boolean
  scrollContainerRef: React.RefObject<HTMLDivElement>

  // Dropdown ref
  dropdownRef: React.RefObject<HTMLDivElement>

  // Computed values
  activeColumns: DashboardColumn[]

  // Actions
  setShowMobileMenu: (show: boolean) => void
  setShowDashboardDropdown: (show: boolean) => void
  nextColumn: () => void
  prevColumn: () => void
  goToColumn: (index: number) => void
  handleTouchStart: (e: React.TouchEvent) => void
  handleTouchMove: (e: React.TouchEvent) => void
  handleTouchEnd: () => Promise<void>
}

/**
 * Hook for managing dashboard layout and mobile state.
 * Handles responsive layout, mobile navigation, pull-to-refresh.
 */
export function useDashboardLayout({
  columns,
  onRefresh,
}: UseDashboardLayoutProps): UseDashboardLayoutReturn {
  // Mobile navigation state
  const [isMobile, setIsMobile] = useState(false)
  const [activeColumnIndex, setActiveColumnIndex] = useState(0)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showDashboardDropdown, setShowDashboardDropdown] = useState(false)

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Dropdown ref for click-outside handling
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDashboardDropdown(false)
      }
    }

    if (showDashboardDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDashboardDropdown])

  // Computed: active (non-archived) columns
  const activeColumns = useMemo(() =>
    columns.filter(col => !col.isArchived),
    [columns]
  )

  // Mobile column navigation
  const nextColumn = useCallback(() => {
    if (activeColumnIndex < activeColumns.length - 1) {
      setActiveColumnIndex(prev => prev + 1)
    }
  }, [activeColumnIndex, activeColumns.length])

  const prevColumn = useCallback(() => {
    if (activeColumnIndex > 0) {
      setActiveColumnIndex(prev => prev - 1)
    }
  }, [activeColumnIndex])

  const goToColumn = useCallback((index: number) => {
    setActiveColumnIndex(index)
  }, [])

  // Pull-to-refresh handlers
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

    // Apply resistance to pull distance
    const resistance = 0.5
    const maxPull = 120
    const adjustedDistance = Math.min(distance * resistance, maxPull)

    setPullDistance(adjustedDistance)
  }, [isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    const threshold = 60 // Minimum pull distance to trigger refresh

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)

      // Trigger data refresh
      await onRefresh()

      // Small delay for visual feedback
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
    isMobile,
    activeColumnIndex,
    showMobileMenu,
    showDashboardDropdown,
    pullDistance,
    isRefreshing,
    scrollContainerRef,
    dropdownRef,
    activeColumns,
    setShowMobileMenu,
    setShowDashboardDropdown,
    nextColumn,
    prevColumn,
    goToColumn,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
