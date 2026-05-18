import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { DashboardColumn } from '@/lib/types'

interface UseDashboardLayoutProps {
  columns: DashboardColumn[]
}

interface UseDashboardLayoutReturn {
  // Mobile state
  isMobile: boolean
  activeColumnIndex: number
  showMobileMenu: boolean
  showDashboardDropdown: boolean

  // Dropdown ref
  dropdownRef: React.RefObject<HTMLDivElement | null>

  // Computed values
  activeColumns: DashboardColumn[]

  // Actions
  setShowMobileMenu: (show: boolean) => void
  setShowDashboardDropdown: (show: boolean) => void
  goToColumn: (index: number) => void
}

/**
 * Hook for managing dashboard layout and mobile state.
 * Handles responsive layout and mobile column navigation state.
 *
 * Pull-to-refresh-logiken har flyttats till `useMobilePullToRefresh` och
 * körs per slide i mobilkarusellen.
 */
export function useDashboardLayout({
  columns,
}: UseDashboardLayoutProps): UseDashboardLayoutReturn {
  const [isMobile, setIsMobile] = useState(false)
  const [activeColumnIndex, setActiveColumnIndex] = useState(0)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showDashboardDropdown, setShowDashboardDropdown] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  const activeColumns = useMemo(() =>
    columns.filter(col => !col.isArchived),
    [columns]
  )

  const goToColumn = useCallback((index: number) => {
    setActiveColumnIndex(index)
  }, [])

  return {
    isMobile,
    activeColumnIndex,
    showMobileMenu,
    showDashboardDropdown,
    dropdownRef,
    activeColumns,
    setShowMobileMenu,
    setShowDashboardDropdown,
    goToColumn,
  }
}
