'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const redirect = async () => {
      // Prioritetsordning (P2-3):
      // 1) Server-sparad defaultDashboardId (explicit "hem"-val per user)
      // 2) localStorage `nd.lastVisitedDashboard` (senaste sluggen)
      // 3) Fallback: /dashboards-listan
      try {
        const response = await fetch('/api/user/preferences')
        const data = await response.json()

        if (data.success && data.preferences?.defaultDashboardId) {
          const dashboardResponse = await fetch('/api/dashboards')
          const dashboardData = await dashboardResponse.json()

          if (dashboardData.success) {
            const homeDashboard = dashboardData.dashboards.find(
              (d: { id: string; slug: string }) => d.id === data.preferences.defaultDashboardId
            )

            if (homeDashboard) {
              router.push(`/dashboard/${homeDashboard.slug}`)
              return
            }
          }
        }

        // Ingen server-preference — försök localStorage
        const lastSlug = typeof window !== 'undefined'
          ? window.localStorage.getItem('nd.lastVisitedDashboard')
          : null

        if (lastSlug) {
          // Verifiera att dashboarden fortfarande finns innan vi redirectar
          const verifyResponse = await fetch(`/api/dashboards/${lastSlug}?structureOnly=true`)
          if (verifyResponse.ok) {
            router.push(`/dashboard/${lastSlug}`)
            return
          }
          // Stale entry — rensa
          window.localStorage.removeItem('nd.lastVisitedDashboard')
        }

        router.push('/dashboards')
      } catch (error) {
        console.error('Failed to determine home destination:', error)
        router.push('/dashboards')
      } finally {
        setChecking(false)
      }
    }

    redirect()
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mb-4 mx-auto">
          <Image
            src="/newsdeck-icon.svg"
            alt="Newsdeck logo"
            width={64}
            height={64}
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
        <div className="text-muted-foreground">
          {checking ? 'Laddar Newsdeck...' : 'Redirectar...'}
        </div>
      </div>
    </div>
  )
}