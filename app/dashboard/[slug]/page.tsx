'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { Dashboard as DashboardType } from '@/lib/types'
import MainDashboard from '@/components/MainDashboard'

export default function DashboardPage() {
  const params = useParams()
  const slug = params.slug as string
  const [dashboard, setDashboard] = useState<DashboardType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/dashboards/${slug}`)
      const data = await response.json()
      
      if (data.success) {
        setDashboard(data.dashboard)
        setError(null)
      } else {
        setError(data.error || 'Dashboard not found')
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      setError('Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (slug) {
      fetchDashboard()
    }
  }, [fetchDashboard, slug])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mb-4 mx-auto">
            <Image
              src="/newsdeck-icon.svg"
              alt="Newsdeck"
              width={64}
              height={64}
              className="w-full h-full object-contain animate-pulse"
            />
          </div>
          <div className="text-slate-600">Laddar dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
            ❌
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Dashboard hittades inte</h1>
          <p className="text-slate-600 mb-4">{error}</p>
          <Link
            href="/dashboard/main"
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 smooth-transition"
          >
            Gå till huvuddashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return null
  }

  return (
    <MainDashboard 
      dashboard={dashboard}
      onDashboardUpdate={setDashboard}
      dashboardSlug={slug}
    />
  )
}
