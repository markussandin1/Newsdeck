'use client'

import { useCallback, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Dashboard, DashboardColumn, NewsItem } from '@/lib/types'

export default function AdminPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([])
  const [selectedDashboard, setSelectedDashboard] = useState<string>('')
  const [columns, setColumns] = useState<DashboardColumn[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [jsonInput, setJsonInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [recentItems, setRecentItems] = useState<NewsItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)

  const fetchDashboards = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboards')
      const result = await response.json() as {
        success: boolean
        dashboards?: (Dashboard & { columnCount?: number })[]
      }
      if (result.success && Array.isArray(result.dashboards)) {
        console.log(`🔍 Admin: Found ${result.dashboards.length} dashboards`)
        const normalizedDashboards = result.dashboards.map(dashboardItem => {
          const { columnCount, ...dashboardWithoutCount } = dashboardItem
          void columnCount
          return dashboardWithoutCount
        })
        setDashboards(normalizedDashboards)
        // Auto-select main dashboard if available
        const mainDash = normalizedDashboards.find(d => d.id === 'main-dashboard')
        if (mainDash && !selectedDashboard) {
          console.log(`🎯 Admin: Auto-selecting main dashboard`)
          setSelectedDashboard(mainDash.id)
        } else if (normalizedDashboards.length > 0 && !selectedDashboard) {
          console.log(`🎯 Admin: Auto-selecting first dashboard: ${normalizedDashboards[0].name}`)
          setSelectedDashboard(normalizedDashboards[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboards:', error)
    }
  }, [selectedDashboard])

  const fetchColumns = useCallback(async (dashboardId: string) => {
    if (!dashboardId) return

    try {
      let endpoint

      if (dashboardId === 'main-dashboard') {
        endpoint = '/api/dashboards/main-dashboard'
      } else {
        // Find the dashboard object to get its slug
        const dashboard = dashboards.find(d => d.id === dashboardId)
        if (dashboard && dashboard.slug) {
          endpoint = `/api/dashboards/${dashboard.slug}`
        } else {
          // Fallback: try using the ID directly
          endpoint = `/api/dashboards/${dashboardId}`
        }
      }

      console.log(`🔍 Admin: Fetching columns for dashboard ${dashboardId} from ${endpoint}`)

      const response = await fetch(endpoint)
      const result = await response.json() as {
        success: boolean
        dashboard?: Dashboard
        error?: string
      }
      if (result.success && result.dashboard) {
        const dashboard = result.dashboard
        console.log(`✅ Admin: Found ${(dashboard.columns || []).length} columns for dashboard ${dashboardId}`)
        setColumns(dashboard.columns || [])
        if (dashboard.columns && dashboard.columns.length > 0) {
          setSelectedColumn(dashboard.columns[0].id)
        } else {
          setSelectedColumn('')
        }
      } else {
        console.error('Failed to fetch dashboard:', result.error)
        setColumns([])
        setSelectedColumn('')
      }
    } catch (error) {
      console.error('Failed to fetch columns:', error)
      setColumns([])
      setSelectedColumn('')
    } finally {
      setIsLoading(false)
    }
  }, [dashboards])

  const fetchRecentItems = useCallback(async (dashboardId?: string) => {
    setItemsLoading(true)
    try {
      const targetDashboard = dashboardId || selectedDashboard
      console.log(`🔍 Admin: Fetching recent items for dashboard ${targetDashboard}`)

      if (!targetDashboard) {
        // No dashboard selected, show all items
        const response = await fetch('/api/news-items')
        const result = await response.json() as { success: boolean; items: NewsItem[] }
        if (result.success) {
          console.log(`✅ Admin: Found ${result.items.length} total items (no dashboard filter)`)
          setRecentItems(result.items.slice(0, 20))
        }
        return
      }

      // Get dashboard columns to filter items
      const dashboard = dashboards.find(d => d.id === targetDashboard)
      if (!dashboard || !dashboard.columns) {
        console.log(`⚠️ Admin: Dashboard ${targetDashboard} has no columns`)
        setRecentItems([])
        return
      }

      // Get all items and filter by column IDs (workflowId)
      const response = await fetch('/api/news-items')
      const result = await response.json() as { success: boolean; items: NewsItem[] }
      if (result.success) {
        const columnIds = dashboard.columns.map((col: DashboardColumn) => col.id)
        const filteredItems = result.items.filter((item: NewsItem) =>
          columnIds.includes(item.workflowId)
        )
        console.log(`✅ Admin: Found ${filteredItems.length} items for dashboard ${targetDashboard} (${columnIds.length} columns)`)
        setRecentItems(filteredItems.slice(0, 20))
      }
    } catch (error) {
      console.error('Failed to fetch recent items:', error)
      setRecentItems([])
    } finally {
      setItemsLoading(false)
    }
  }, [dashboards, selectedDashboard])

  const deleteItem = async (dbId: string, originalId: string) => {
    console.log(`🗑️ ADMIN: Delete button clicked for item dbId: ${dbId}, originalId: ${originalId}`)

    if (!confirm(`Är du säker på att du vill ta bort händelsen "${originalId}"?`)) {
      return
    }

    console.log(`🗑️ ADMIN: User confirmed deletion of item dbId: ${dbId}`)

    try {
      const response = await fetch('/api/news-items', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dbId }),
      })

      const result = await response.json()

      if (response.ok) {
        setFeedback({ type: 'success', message: result.message })
        fetchRecentItems(selectedDashboard) // Refresh the list for current dashboard
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    } catch (error) {
      console.error('Failed to delete news item:', error)
      setFeedback({ type: 'error', message: 'Kunde inte ta bort händelsen' })
    }
  }

  // Initial fetch on mount only
  useEffect(() => {
    fetchDashboards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch columns and items when dashboard changes
  useEffect(() => {
    if (selectedDashboard && dashboards.length > 0) {
      console.log(`🔄 Admin: Dashboard changed to ${selectedDashboard}, fetching columns and recent items...`)
      setSelectedColumn('') // Reset column selection when dashboard changes
      fetchColumns(selectedDashboard)
      fetchRecentItems(selectedDashboard)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDashboard])

  const handleDashboardChange = (dashboardId: string) => {
    setSelectedDashboard(dashboardId)
  }

  const exampleData = [
    {
      "id": "news-001",
      "title": "Breaking News: Stor brand i Stockholm centrum",
      "description": "Räddningstjänst på plats med flera enheter. Byggnaden evakuerad.",
      "source": "workflows",
      "timestamp": new Date().toISOString(),
      "newsValue": 5,
      "category": "emergency",
      "severity": "critical",
      "location": {
        "municipality": "Stockholm",
        "county": "Stockholm",
        "name": "Drottninggatan 50"
      }
    },
    {
      "id": "news-002", 
      "title": "Trafikstörningar på E4",
      "description": "Bilkö på flera kilometer efter trafikolycka",
      "source": "workflows",
      "timestamp": new Date().toISOString(),
      "newsValue": 3,
      "category": "traffic",
      "severity": "medium",
      "location": {
        "municipality": "Sollentuna",
        "county": "Stockholm"
      }
    }
  ]

  const loadExample = () => {
    setJsonInput(JSON.stringify(exampleData, null, 2))
  }

  const submitData = async () => {
    if (!selectedColumn) {
      setFeedback({ type: 'error', message: 'Välj en kolumn först' })
      return
    }

    try {
      setFeedback(null)
      const data = JSON.parse(jsonInput)

      const response = await fetch(`/api/columns/${selectedColumn}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        setFeedback({ type: 'success', message: result.message })
        setJsonInput('')
      } else {
        setFeedback({ type: 'error', message: result.error })
      }
    } catch (error) {
      console.error('Failed to parse JSON payload:', error)
      setFeedback({ type: 'error', message: 'Invalid JSON format' })
    }
  }

  const runMigration = async () => {
    try {
      setFeedback(null)

      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: `Migration slutförd! ${result.updated} events uppdaterades med createdInDb timestamp.`
        })
      } else {
        setFeedback({ type: 'error', message: result.error || 'Migration misslyckades' })
      }
    } catch (error) {
      console.error('Failed to run migration:', error)
      setFeedback({ type: 'error', message: 'Kunde inte köra migration' })
    }
  }

  const clearColumnData = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      if (response.ok) {
        setFeedback({ type: 'success', message: result.message })
      }
    } catch (error) {
      console.error('Failed to clear column data:', error)
      setFeedback({ type: 'error', message: 'Failed to clear column data' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
          <p className="text-gray-500">Laddar admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin - Kolumn Management</h1>
              <p className="text-gray-600">Hantera data för dina Newsdeck-kolumner</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← Tillbaka till Newsdeck
            </Link>
          </div>
        </div>

        {/* Dashboard Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Välj Dashboard</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-max">
              Aktuell dashboard:
            </label>
            <select
              value={selectedDashboard}
              onChange={(e) => handleDashboardChange(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Välj dashboard...</option>
              {dashboards.map((dashboard) => (
                <option key={dashboard.id} value={dashboard.id}>
                  {dashboard.name} {dashboard.id === 'main-dashboard' ? '(Huvuddashboard)' : ''}
                </option>
              ))}
            </select>
          </div>
          {selectedDashboard && (
            <div className="mt-3 text-sm text-gray-600">
              Dashboard-ID: <code className="bg-gray-100 px-2 py-1 rounded">{selectedDashboard}</code>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Side - Columns Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Aktiva Kolumner
              {selectedDashboard && dashboards.find(d => d.id === selectedDashboard) &&
                ` - ${dashboards.find(d => d.id === selectedDashboard)?.name}`
              }
            </h2>
            
            {!selectedDashboard ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">Välj en dashboard först</div>
                <div className="text-sm">Använd dropdown-menyn ovan för att välja vilken dashboard du vill hantera</div>
              </div>
            ) : columns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">Inga kolumner i denna dashboard</div>
                <div className="text-sm">Gå till dashboarden för att skapa kolumner</div>
              </div>
            ) : (
              <div className="space-y-4">
                {columns.map((column) => (
                  <div key={column.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{column.title}</h3>
                        {column.description && (
                          <p className="text-sm text-gray-600 mt-1">{column.description}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          Skapad: {new Date(column.createdAt).toLocaleDateString('sv-SE')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono">
                      <div className="text-gray-600 mb-1">API Endpoint:</div>
                      <div className="text-blue-600 break-all">
                        POST /api/columns/{column.id}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setSelectedColumn(column.id)}
                        className={`px-3 py-1 text-xs rounded ${
                          selectedColumn === column.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Välj för upload
                      </button>
                      <button
                        onClick={() => clearColumnData(column.id)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Rensa data
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Data Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Ladda upp JSON-data</h2>

            {!selectedDashboard ? (
              <div className="text-center py-8 text-gray-500">
                Välj en dashboard först för att ladda upp data
              </div>
            ) : columns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Skapa kolumner först för att ladda upp data
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Målkolumn:
                  </label>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Välj kolumn...</option>
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4 space-y-2">
                  <button
                    onClick={loadExample}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm mr-2"
                  >
                    Ladda exempeldata
                  </button>
                  <button
                    onClick={runMigration}
                    className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm"
                  >
                    Migrera befintlig data
                  </button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    JSON Data (NewsItem eller array av NewsItems)
                  </label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-xs"
                    placeholder="Klistra in JSON-data här..."
                  />
                </div>

                <button
                  onClick={submitData}
                  disabled={!jsonInput.trim() || !selectedColumn}
                  className="w-full bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Skicka data till kolumn
                </button>
              </>
            )}

            {feedback && (
              <div className={`mt-4 p-4 rounded ${
                feedback.type === 'success' 
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {feedback.message}
              </div>
            )}
          </div>
        </div>

        {/* Recent News Items */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Senaste händelser
              {selectedDashboard && dashboards.find(d => d.id === selectedDashboard) &&
                ` - ${dashboards.find(d => d.id === selectedDashboard)?.name}`
              }
            </h2>
            <button
              onClick={() => fetchRecentItems(selectedDashboard)}
              disabled={itemsLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {itemsLoading ? 'Laddar...' : 'Uppdatera'}
            </button>
          </div>

          {!selectedDashboard ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-2">Välj en dashboard först</div>
              <div className="text-sm">Händelser visas för den valda dashboarden</div>
            </div>
          ) : itemsLoading ? (
            <div className="text-center py-8 text-gray-500">
              Laddar händelser...
            </div>
          ) : recentItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-2">Inga händelser hittades</div>
              <div className="text-sm">
                {dashboards.find(d => d.id === selectedDashboard)?.columns?.length === 0
                  ? 'Denna dashboard har inga kolumner'
                  : 'Inga händelser för denna dashboard än'
                }
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800">{item.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${
                          item.newsValue === 5 ? 'bg-red-100 text-red-700' :
                          item.newsValue === 4 ? 'bg-orange-100 text-orange-700' :
                          item.newsValue === 3 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          Värde {item.newsValue}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>Källa: {item.source}</span>
                        <span>ID: {item.id}</span>
                        <span>
                          Skapad: {new Date(item.createdInDb || item.timestamp).toLocaleString('sv-SE')}
                        </span>
                        {item.location?.municipality && (
                          <span>Plats: {item.location.municipality}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteItem(item.dbId || item.id, item.id)}
                      className="ml-4 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                    >
                      Ta bort
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Så fungerar det</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">För Workflows-applikationen:</h3>
              <div className="space-y-2 text-gray-600">
                <div>• Skicka POST-requests till <code className="bg-gray-100 px-1 rounded">/api/columns/{'{uuid}'}</code></div>
                <div>• Använd JSON-format enligt NewsItem-schemat</div>
                <div>• Kan skicka enstaka objekt eller array av objekt</div>
                <div>• Data ersätter tidigare data för den kolumnen</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">För manuell testning:</h3>
              <div className="space-y-2 text-gray-600">
                <div>• Välj kolumn från dropdown</div>
                <div>• Klistra in JSON-data</div>
                <div>• Klicka &quot;Skicka data till kolumn&quot;</div>
                <div>• Data visas direkt i Newsdeck</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
