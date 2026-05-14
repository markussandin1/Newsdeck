import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseDashboardNavigationReturn {
  navigateToDashboard: (slug: string) => void
  createDashboard: (name: string, description?: string) => Promise<void>
}

/**
 * Dashboard-nivå-navigation och skapande.
 *
 * Extraherat ur DashboardView (P1-3) — handlade tidigare en inline-funktion
 * + en useCallback för router-push. Båda gör samma sak (navigerar till
 * `/dashboard/{slug}`), så de samlas här.
 *
 * `createDashboard` POSTar mot `/api/dashboards` och hoppar direkt till
 * den nya dashboardens slug om servern svarar med success.
 */
export function useDashboardNavigation(): UseDashboardNavigationReturn {
  const router = useRouter()

  const navigateToDashboard = useCallback((slug: string) => {
    router.push(`/dashboard/${slug}`)
  }, [router])

  const createDashboard = useCallback(async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      })
      const data = await response.json()
      if (data.success && data.dashboard?.slug) {
        router.push(`/dashboard/${data.dashboard.slug}`)
      }
    } catch (error) {
      // Client-context: logger får inte importeras (node:util-beroende)
      console.error('useDashboardNavigation.createDashboardFailed', error)
    }
  }, [router])

  return { navigateToDashboard, createDashboard }
}
