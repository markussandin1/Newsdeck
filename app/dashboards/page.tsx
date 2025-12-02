'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Dashboard } from '@/lib/types'
import { WeatherStrip } from '@/components/WeatherStrip'
import { UserMenu } from '@/components/UserMenu'

type DashboardWithStats = Dashboard & {
  columnCount?: number
  followerCount?: number
  isFollowing?: boolean
}

export default function DashboardsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine')
  const [dashboards, setDashboards] = useState<DashboardWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [newDashboardDescription, setNewDashboardDescription] = useState('')
  const [creatingDashboard, setCreatingDashboard] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboards = async (mine: boolean) => {
    setLoading(true)
    try {
      const url = mine ? '/api/dashboards?mine=true' : '/api/dashboards'
      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setDashboards(data.dashboards)
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboards(activeTab === 'mine')
  }, [activeTab])

  const handleTabChange = (tab: 'mine' | 'all') => {
    setActiveTab(tab)
  }

  const handleFollow = async (slug: string, currentlyFollowing: boolean) => {
    try {
      const method = currentlyFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/dashboards/${slug}/follow`, {
        method
      })

      if (response.ok) {
        // Refresh dashboards
        fetchDashboards(activeTab === 'mine')
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    }
  }

  const handleSetHome = async (dashboardId: string) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultDashboardId: dashboardId })
      })

      if (response.ok) {
        alert('Hem-dashboard uppdaterad!')
        // Could add a visual indicator here
      }
    } catch (error) {
      console.error('Failed to set home dashboard:', error)
    }
  }

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) return

    setCreatingDashboard(true)
    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDashboardName.trim(),
          description: newDashboardDescription.trim()
        })
      })

      const data = await response.json()
      if (data.success) {
        // Navigate to new dashboard
        router.push(`/dashboard/${data.dashboard.slug}`)
      }
    } catch (error) {
      console.error('Failed to create dashboard:', error)
    } finally {
      setCreatingDashboard(false)
    }
  }

  const handleLogout = () => {
    window.location.href = '/api/auth/signout'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Matches DashboardHeader design */}
      <div className="glass border-b border-border sticky top-0 z-50 hidden lg:block">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Zone 1 + 2: Tightly Grouped Left Side */}
            <div className="flex items-center gap-2">
              {/* Zone 1: Brand Anchor */}
              <Link href="/dashboards" className="shrink-0">
                <div className="w-12 h-12 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                  <Image
                    src="/newsdeck-icon.svg"
                    alt="Newsdeck logo"
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain"
                  />
                </div>
              </Link>

              {/* Zone 2: Page Context */}
              <div className="px-4 py-2">
                <h1 className="text-xl font-display font-semibold text-foreground">
                  Dashboards
                </h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{dashboards.length} dashboards</span>
                </div>
              </div>
            </div>

            {/* Zone 3: Ambient Weather Strip */}
            <div className="hidden xl:flex justify-center overflow-hidden max-w-lg flex-1">
              <WeatherStrip />
            </div>

            {/* Zone 4: User Controls */}
            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 smooth-transition font-medium text-sm"
              >
                + Ny dashboard
              </button>
              <time className="text-lg font-display font-semibold tabular-nums text-foreground">
                {currentTime.toLocaleTimeString('sv-SE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/Stockholm',
                })}
              </time>
              <UserMenu
                userName="User"
                dashboardId=""
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => handleTabChange('mine')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'mine'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Mina dashboards
            </button>
            <button
              onClick={() => handleTabChange('all')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Alla dashboards
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : dashboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 flex justify-center">
              <Image src="/newsdeck-icon.svg" alt="Newsdeck logo" width={64} height={64} className="w-16 h-16 object-contain opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {activeTab === 'mine' ? 'Du har inga dashboards än' : 'Inga dashboards hittades'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {activeTab === 'mine'
                ? 'Skapa din första dashboard eller utforska befintliga'
                : 'Det finns inga publika dashboards att visa'
              }
            </p>
            {activeTab === 'mine' && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
                >
                  Skapa min första dashboard
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted font-medium"
                >
                  Utforska publika dashboards →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <div key={dashboard.id} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-display font-semibold text-foreground mb-1">
                      {dashboard.name}
                    </h3>
                    {dashboard.description && (
                      <p className="text-sm text-muted-foreground mb-3">{dashboard.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{dashboard.columnCount || 0} kolumner</span>
                  <span>•</span>
                  <span>👥 {dashboard.followerCount || 0} följare</span>
                </div>

                <div className="text-xs text-muted-foreground mb-4">
                  Skapad av: {dashboard.createdByName}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/${dashboard.slug}`}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 text-center font-medium"
                  >
                    Öppna
                  </Link>
                  {activeTab === 'all' && (
                    <button
                      onClick={() => handleFollow(dashboard.slug, dashboard.isFollowing || false)}
                      className={`px-4 py-2 text-sm rounded-lg font-medium ${
                        dashboard.isFollowing
                          ? 'bg-muted text-foreground hover:bg-muted/80'
                          : 'border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {dashboard.isFollowing ? '✓ Följer' : '⭐ Följ'}
                    </button>
                  )}
                  {activeTab === 'mine' && (
                    <button
                      onClick={() => handleSetHome(dashboard.id)}
                      className="px-4 py-2 border border-border text-foreground text-sm rounded-lg hover:bg-muted font-medium"
                      title="Sätt som hem-dashboard"
                    >
                      🏠
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dashboard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full border border-border">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display font-semibold text-foreground">Skapa ny dashboard</h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewDashboardName('')
                    setNewDashboardDescription('')
                  }}
                  className="text-muted-foreground hover:text-foreground text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Dashboard namn *
                  </label>
                  <input
                    type="text"
                    value={newDashboardName}
                    onChange={(e) => setNewDashboardName(e.target.value)}
                    className="w-full p-3 border border-input rounded-lg font-body focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                    placeholder="t.ex. Breaking News"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Beskrivning (valfritt)
                  </label>
                  <textarea
                    value={newDashboardDescription}
                    onChange={(e) => setNewDashboardDescription(e.target.value)}
                    className="w-full p-3 border border-input rounded-lg font-body focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
                    placeholder="Beskriv vad denna dashboard ska innehålla..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t border-border">
                <button
                  onClick={handleCreateDashboard}
                  disabled={!newDashboardName.trim() || creatingDashboard}
                  className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 smooth-transition font-medium"
                >
                  {creatingDashboard ? 'Skapar...' : 'Skapa dashboard'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewDashboardName('')
                    setNewDashboardDescription('')
                  }}
                  className="px-6 py-3 border border-border text-foreground rounded-lg hover:bg-muted smooth-transition font-medium"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
