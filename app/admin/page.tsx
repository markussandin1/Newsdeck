'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, ArrowLeft, Upload, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useAdminData } from './useAdminData'

function AdminPageContent() {
  const {
    dashboards,
    selectedDashboard,
    setSelectedDashboard,
    columns,
    selectedColumn,
    setSelectedColumn,
    recentItems,
    isLoading,
    itemsLoading,
    isAuthenticated,
    fetchRecentItems,
  } = useAdminData()

  const [jsonInput, setJsonInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)

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
        console.error('Delete failed:', response.status, result)
        setFeedback({
          type: 'error',
          message: result.error || result.message || `Fel ${response.status}: Kunde inte ta bort händelsen`
        })
      }
    } catch (error) {
      console.error('Failed to delete news item:', error)
      setFeedback({ type: 'error', message: 'Kunde inte ta bort händelsen' })
    }
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
    if (!confirm('Är du säker på att du vill radera all data från denna kolumn?')) {
      return
    }

    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (response.ok) {
        setFeedback({ type: 'success', message: result.message })
        fetchRecentItems(selectedDashboard) // Refresh the list
      } else {
        console.error('Clear column failed:', response.status, result)
        setFeedback({
          type: 'error',
          message: result.error || result.message || `Fel ${response.status}: Kunde inte rensa kolumndata`
        })
      }
    } catch (error) {
      console.error('Failed to clear column data:', error)
      setFeedback({ type: 'error', message: 'Kunde inte rensa kolumndata' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
          <p className="text-muted-foreground">Laddar admin...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6 border border-border">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Admin - Kolumn Management</h1>
              <p className="text-muted-foreground">Hantera data för dina Newsdeck-kolumner</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Auth status indicator */}
              {isAuthenticated !== null && (
                <Badge variant={isAuthenticated ? 'success' : 'error'} className="gap-1.5">
                  {isAuthenticated ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Inloggad
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Ej inloggad
                    </>
                  )}
                </Badge>
              )}
              <Button asChild>
                <Link href="/admin/api-logs" className="gap-2">
                  <FileText className="h-4 w-4" />
                  API Logs
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Tillbaka till Newsdeck
                </Link>
              </Button>
            </div>
          </div>
          {isAuthenticated === false && (
            <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground font-medium mb-1">Du är inte inloggad</p>
                  <p className="text-muted-foreground text-sm">
                    Vissa funktioner som att radera data kräver att du är inloggad.
                    <Link href="/api/auth/signin" className="underline ml-1 font-medium text-primary hover:text-primary/80">
                      Logga in här
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Selector */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6 border border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">Välj Dashboard</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-foreground min-w-max">
              Aktuell dashboard:
            </label>
            <select
              value={selectedDashboard}
              onChange={(e) => setSelectedDashboard(e.target.value)}
              className="flex-1 p-2 border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
            <div className="mt-3 text-sm text-muted-foreground">
              Dashboard-ID: <code className="bg-muted px-2 py-1 rounded font-mono text-foreground">{selectedDashboard}</code>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Side - Columns Overview */}
          <div className="bg-card rounded-lg shadow-md p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Aktiva Kolumner
              {selectedDashboard && dashboards.find(d => d.id === selectedDashboard) &&
                ` - ${dashboards.find(d => d.id === selectedDashboard)?.name}`
              }
            </h2>

            {!selectedDashboard ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-2">Välj en dashboard först</div>
                <div className="text-sm">Använd dropdown-menyn ovan för att välja vilken dashboard du vill hantera</div>
              </div>
            ) : columns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-2">Inga kolumner i denna dashboard</div>
                <div className="text-sm">Gå till dashboarden för att skapa kolumner</div>
              </div>
            ) : (
              <div className="space-y-4">
                {columns.filter(col => !col.isArchived).map((column) => (
                  <div key={column.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{column.title}</h3>
                        {column.description && (
                          <p className="text-sm text-muted-foreground mt-1">{column.description}</p>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          Skapad: {new Date(column.createdAt).toLocaleDateString('sv-SE')}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs font-mono">
                      <div className="text-muted-foreground mb-1">API Endpoint:</div>
                      <div className="text-primary break-all">
                        POST /api/columns/{column.id}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => setSelectedColumn(column.id)}
                        variant={selectedColumn === column.id ? 'default' : 'outline'}
                        size="sm"
                        className="gap-2"
                      >
                        <Upload className="h-3 w-3" />
                        Välj för upload
                      </Button>
                      <Button
                        onClick={() => clearColumnData(column.id)}
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                      >
                        <Trash2 className="h-3 w-3" />
                        Rensa data
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Data Upload */}
          <div className="bg-card rounded-lg shadow-md p-6 border border-border">
            <h2 className="text-xl font-bold text-foreground mb-4">Ladda upp JSON-data</h2>

            {!selectedDashboard ? (
              <div className="text-center py-8 text-muted-foreground">
                Välj en dashboard först för att ladda upp data
              </div>
            ) : columns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Skapa kolumner först för att ladda upp data
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Målkolumn:
                  </label>
                  <select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Välj kolumn...</option>
                    {columns.filter(col => !col.isArchived).map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4 flex gap-2">
                  <Button
                    onClick={loadExample}
                    variant="secondary"
                    size="sm"
                  >
                    Ladda exempeldata
                  </Button>
                  <Button
                    onClick={runMigration}
                    variant="outline"
                    size="sm"
                  >
                    Migrera befintlig data
                  </Button>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    JSON Data (NewsItem eller array av NewsItems)
                  </label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="w-full h-64 p-3 border border-border rounded-lg font-mono text-xs bg-background text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder="Klistra in JSON-data här..."
                  />
                </div>

                <Button
                  onClick={submitData}
                  disabled={!jsonInput.trim() || !selectedColumn}
                  className="w-full"
                  size="lg"
                >
                  Skicka data till kolumn
                </Button>
              </>
            )}

            {feedback && (
              <div className={`mt-4 p-4 rounded border ${
                feedback.type === 'success'
                  ? 'bg-success/10 text-success border-success/30'
                  : 'bg-error/10 text-error border-error/30'
              }`}>
                {feedback.message}
              </div>
            )}
          </div>
        </div>

        {/* Recent News Items */}
        <div className="mt-6 bg-card rounded-lg shadow-md p-6 border border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">
              Senaste händelser
              {selectedDashboard && dashboards.find(d => d.id === selectedDashboard) &&
                ` - ${dashboards.find(d => d.id === selectedDashboard)?.name}`
              }
            </h2>
            <Button
              onClick={() => fetchRecentItems(selectedDashboard)}
              disabled={itemsLoading}
              variant="secondary"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${itemsLoading ? 'animate-spin' : ''}`} />
              {itemsLoading ? 'Laddar...' : 'Uppdatera'}
            </Button>
          </div>

          {!selectedDashboard ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-2">Välj en dashboard först</div>
              <div className="text-sm">Händelser visas för den valda dashboarden</div>
            </div>
          ) : itemsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Laddar händelser...
            </div>
          ) : recentItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
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
                <div key={item.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <Badge variant={
                          item.newsValue === 5 ? 'error' :
                          item.newsValue === 4 ? 'warning' :
                          item.newsValue === 3 ? 'info' :
                          'secondary'
                        }>
                          Värde {item.newsValue}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
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
                    <Button
                      onClick={() => deleteItem(item.dbId, item.id)}
                      variant="destructive"
                      size="sm"
                      className="ml-4 gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      Ta bort
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="mt-6 bg-card rounded-lg shadow-md p-6 border border-border">
          <h2 className="text-xl font-bold text-foreground mb-4">Så fungerar det</h2>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-foreground mb-2">För Workflows-applikationen:</h3>
              <div className="space-y-2 text-muted-foreground">
                <div>• Skicka POST-requests till <code className="bg-muted px-1 rounded font-mono text-foreground">/api/columns/{'{uuid}'}</code></div>
                <div>• Använd JSON-format enligt NewsItem-schemat</div>
                <div>• Kan skicka enstaka objekt eller array av objekt</div>
                <div>• Data ersätter tidigare data för den kolumnen</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">För manuell testning:</h3>
              <div className="space-y-2 text-muted-foreground">
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

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
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
          <p className="text-muted-foreground">Laddar admin...</p>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  )
}
