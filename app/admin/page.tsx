'use client'

import { useState, useEffect } from 'react'
import { DashboardColumn, NewsItem } from '@/lib/types'

export default function AdminPage() {
  const [columns, setColumns] = useState<DashboardColumn[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [jsonInput, setJsonInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchColumns = async () => {
    try {
      const response = await fetch('/api/columns')
      const result = await response.json()
      if (result.success) {
        setColumns(result.columns)
        if (result.columns.length > 0 && !selectedColumn) {
          setSelectedColumn(result.columns[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch columns:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchColumns()
  }, [])

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
      setFeedback({ type: 'error', message: 'Invalid JSON format' })
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
      setFeedback({ type: 'error', message: 'Failed to clear column data' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
            <a
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← Tillbaka till Newsdeck
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Side - Columns Overview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Aktiva Kolumner</h2>
            
            {columns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-2">Inga kolumner skapade ännu</div>
                <div className="text-sm">Gå tillbaka till Newsdeck för att skapa din första kolumn</div>
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
            
            {columns.length === 0 ? (
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

                <div className="mb-4">
                  <button
                    onClick={loadExample}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                  >
                    Ladda exempeldata
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
                <div>• Klicka "Skicka data till kolumn"</div>
                <div>• Data visas direkt i Newsdeck</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}