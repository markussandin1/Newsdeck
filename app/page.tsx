'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkUserPreferences = async () => {
      try {
        // Check if user has a home dashboard preference
        const response = await fetch('/api/user/preferences')
        const data = await response.json()

        if (data.success && data.preferences?.defaultDashboardId) {
          // User has a home dashboard, get the dashboard to get its slug
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

        // No home dashboard preference, redirect to dashboards overview
        router.push('/dashboards')
      } catch (error) {
        console.error('Failed to check user preferences:', error)
        // On error, redirect to dashboards overview
        router.push('/dashboards')
      } finally {
        setChecking(false)
      }
    }

    checkUserPreferences()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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
        <div className="text-slate-600">
          {checking ? 'Laddar Newsdeck...' : 'Redirectar...'}
        </div>
      </div>
    </div>
  )
}