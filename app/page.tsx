'use client'

import { useState, useEffect } from 'react'
import { Dashboard as DashboardType } from '@/lib/types'
import MainDashboard from '@/components/MainDashboard'

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardType | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchMainDashboard = async () => {
    try {
      const response = await fetch('/api/dashboard/main')
      const data = await response.json()
      if (data.success) {
        setDashboard(data.dashboard)
      }
    } catch (error) {
      console.error('Failed to fetch main dashboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMainDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Laddar Newsdeck...</p>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-700 mb-2">Kunde inte ladda dashboard</div>
          <button 
            onClick={fetchMainDashboard}
            className="text-blue-500 hover:text-blue-700"
          >
            Försök igen
          </button>
        </div>
      </div>
    )
  }

  return <MainDashboard dashboard={dashboard} onDashboardUpdate={setDashboard} />
}