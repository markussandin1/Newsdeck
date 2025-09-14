'use client'

import { useState, useEffect } from 'react'
import { Dashboard as DashboardType, NewsItem as NewsItemType, DashboardColumn } from '@/lib/types'
import NewsItem from './NewsItem'
import NewsItemModal from './NewsItemModal'

interface MainDashboardProps {
  dashboard: DashboardType
  onDashboardUpdate: (dashboard: DashboardType) => void
}

interface ColumnData {
  [columnId: string]: NewsItemType[]
}

export default function MainDashboard({ dashboard, onDashboardUpdate }: MainDashboardProps) {
  const [columnData, setColumnData] = useState<ColumnData>({})
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [showAddColumnModal, setShowAddColumnModal] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnDescription, setNewColumnDescription] = useState('')
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [archivedColumns, setArchivedColumns] = useState<DashboardColumn[]>([])
  const [showArchivedColumns, setShowArchivedColumns] = useState(false)
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItemType | null>(null)

  const fetchColumnData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/dashboards/main-dashboard`)
      const data = await response.json()
      
      if (data.success) {
        setColumnData(data.columnData || {})
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch column data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Load archived columns
  const loadArchivedColumns = async () => {
    try {
      const response = await fetch(`/api/columns/archived`)
      const data = await response.json()
      if (data.success) {
        setArchivedColumns(data.columns)
      }
    } catch (error) {
      console.error('Failed to load archived columns:', error)
    }
  }

  // Polling for real-time updates every 5 seconds
  useEffect(() => {
    fetchColumnData()
    loadArchivedColumns()
    const interval = setInterval(fetchColumnData, 5000)
    return () => clearInterval(interval)
  }, [])

  const getTotalNewsCount = () => {
    return Object.values(columnData).reduce((total, items) => total + items.length, 0)
  }

  const addColumn = async (title: string, description?: string) => {
    try {
      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: title.trim(),
          description: description?.trim(),
          order: dashboard?.columns?.length || 0
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Update the main dashboard with new column
        const updatedColumns = [...(dashboard?.columns || []), data.column]
        
        const dashboardResponse = await fetch('/api/dashboard/main', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columns: updatedColumns })
        })
        
        const dashboardData = await dashboardResponse.json()
        if (dashboardData.success) {
          onDashboardUpdate(dashboardData.dashboard)
          setShowAddColumnModal(false)
          setNewColumnTitle('')
          setNewColumnDescription('')
        }
      }
    } catch (error) {
      console.error('Failed to add column:', error)
    }
  }

  const restoreColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}/restore`, {
        method: 'PUT'
      })
      
      const data = await response.json()
      if (data.success) {
        onDashboardUpdate(data.dashboard)
        loadArchivedColumns() // Reload archived columns
        setShowAddColumnModal(false)
      }
    } catch (error) {
      console.error('Failed to restore column:', error)
    }
  }

  const removeColumn = async (columnId: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}/archive`, {
        method: 'PUT'
      })
      
      const data = await response.json()
      if (data.success) {
        onDashboardUpdate(data.dashboard)
        loadArchivedColumns() // Reload archived columns
      }
    } catch (error) {
      console.error('Failed to archive column:', error)
    }
  }

  const updateColumn = async (columnId: string, title: string, description?: string) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description?.trim() })
      })
      
      const data = await response.json()
      if (data.success) {
        // Update the main dashboard with updated column
        const updatedColumns = (dashboard?.columns || []).map(col => 
          col.id === columnId 
            ? { ...col, title: title.trim(), description: description?.trim() }
            : col
        )
        
        const dashboardResponse = await fetch('/api/dashboard/main', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columns: updatedColumns })
        })
        
        const dashboardData = await dashboardResponse.json()
        if (dashboardData.success) {
          onDashboardUpdate(dashboardData.dashboard)
          setEditingColumn(null)
        }
      }
    } catch (error) {
      console.error('Failed to update column:', error)
    }
  }

  const copyToClipboard = async (text: string, columnId: string, columnTitle: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(columnId)
      setToastMessage(`Kolumn ID: ${text} för kolumnen "${columnTitle}" är kopierat`)
      setTimeout(() => {
        setCopiedId(null)
        setToastMessage(null)
      }, 3000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const startEditing = (column: DashboardColumn) => {
    setEditingColumn(column.id)
    setEditTitle(column.title)
    setEditDescription(column.description || '')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{dashboard.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span>{dashboard?.columns?.length || 0} kolumner</span>
                <span>•</span>
                <span>{getTotalNewsCount()} händelser</span>
                <span>•</span>
                <span>Uppdaterad: {lastUpdate.toLocaleTimeString('sv-SE')}</span>
                {isLoading && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 animate-pulse">Uppdaterar...</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddColumnModal(true)}
                className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 text-sm"
              >
                + Lägg till kolumn
              </button>
              <button
                onClick={fetchColumnData}
                disabled={isLoading}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
              >
                🔄 Uppdatera
              </button>
              <a
                href="/admin"
                className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                Admin
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TweetDeck-style Columns */}
      <div className="flex overflow-x-auto h-[calc(100vh-100px)]">
        {(dashboard?.columns || [])
          .filter(col => !col.isArchived)
          .sort((a, b) => a.order - b.order)
          .map((column) => {
            const columnItems = (columnData[column.id] || [])
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            
            return (
              <div 
                key={column.id} 
                className="flex-shrink-0 w-80 bg-white border-r border-gray-200 flex flex-col"
              >
                {/* Column Header */}
                <div className="p-4 border-b bg-gray-50">
                  {editingColumn === column.id ? (
                    // Edit Mode
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      updateColumn(column.id, editTitle, editDescription)
                    }} className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-2 py-1 text-sm border rounded"
                        placeholder="Kolumnnamn"
                        required
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded resize-none"
                        placeholder="Beskrivning (valfritt)"
                        rows={2}
                      />
                      <div className="flex gap-1">
                        <button
                          type="submit"
                          className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingColumn(null)}
                          className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    </form>
                  ) : (
                    // View Mode
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-1">
                        <button
                          onClick={() => copyToClipboard(column.id, column.id, column.title)}
                          className="text-blue-500 hover:text-blue-700 p-1"
                          title="Kopiera kolumn-ID"
                        >
                          {copiedId === column.id ? '✓' : '📋'}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-800">
                              {column.title}
                            </h3>
                            <button
                              onClick={() => startEditing(column)}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                              title="Redigera kolumn"
                            >
                              ✏️
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {columnItems.length} händelser
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeColumn(column.id)}
                        className="ml-2 text-red-500 hover:text-red-700 text-sm p-1"
                        title="Ta bort kolumn"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Column Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      <div className="mb-4">📰</div>
                      <div className="mb-2">Väntar på händelser...</div>
                      <div className="text-xs text-gray-400">
                        Konfigurationen finns i kolumnhuvudet ↑
                      </div>
                    </div>
                  ) : (
                    columnItems.map((item) => (
                      <div key={item.id} className="mb-2">
                        <NewsItem 
                          item={item} 
                          compact={true} 
                          onClick={() => setSelectedNewsItem(item)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

        {/* Add Column Button */}
        <div className="flex-shrink-0 w-80 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
          <button
            onClick={() => setShowAddColumnModal(true)}
            className="flex flex-col items-center text-gray-600 hover:text-gray-800 p-8"
          >
            <div className="w-12 h-12 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-2xl mb-2">
              +
            </div>
            <span className="text-sm">Lägg till kolumn</span>
          </button>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Skapa ny kolumn</h3>
                <button
                  onClick={() => {
                    setShowAddColumnModal(false)
                    setNewColumnTitle('')
                    setNewColumnDescription('')
                  }}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>
              
              {/* Tab buttons */}
              <div className="flex mb-4 border-b">
                <button
                  onClick={() => setShowArchivedColumns(false)}
                  className={`px-4 py-2 font-medium text-sm ${
                    !showArchivedColumns 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Skapa ny
                </button>
                <button
                  onClick={() => setShowArchivedColumns(true)}
                  className={`px-4 py-2 font-medium text-sm ${
                    showArchivedColumns 
                      ? 'border-b-2 border-blue-500 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Återställ ({archivedColumns.length})
                </button>
              </div>

              {!showArchivedColumns ? (
                // Create new column form
                <form onSubmit={(e) => {
                  e.preventDefault()
                  if (newColumnTitle.trim()) {
                    addColumn(newColumnTitle, newColumnDescription)
                  }
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kolumnnamn *
                      </label>
                      <input
                        type="text"
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="t.ex. Breaking News Stockholm"
                        required
                        autoFocus
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Beskrivning (valfritt)
                      </label>
                      <textarea
                        value={newColumnDescription}
                        onChange={(e) => setNewColumnDescription(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Beskriv vad denna kolumn ska innehålla..."
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4 mt-6 border-t">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      disabled={!newColumnTitle.trim()}
                    >
                      Skapa kolumn
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddColumnModal(false)
                        setNewColumnTitle('')
                        setNewColumnDescription('')
                        setShowArchivedColumns(false)
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Avbryt
                    </button>
                  </div>
                </form>
              ) : (
                // Restore archived columns
                <div className="space-y-3">
                  {archivedColumns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="mb-2">📦</div>
                      <div>Inga arkiverade kolumner</div>
                    </div>
                  ) : (
                    archivedColumns.map((column) => (
                      <div key={column.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{column.title}</div>
                          {column.description && (
                            <div className="text-sm text-gray-600 mt-1">{column.description}</div>
                          )}
                          <div className="text-xs text-gray-500 mt-1">
                            Arkiverad: {new Date(column.archivedAt || '').toLocaleDateString('sv-SE')}
                          </div>
                        </div>
                        <button
                          onClick={() => restoreColumn(column.id)}
                          className="ml-3 px-3 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          Återställ
                        </button>
                      </div>
                    ))
                  )}
                  
                  <div className="flex justify-end pt-4 mt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddColumnModal(false)
                        setShowArchivedColumns(false)
                      }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Stäng
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">💡 Tips:</div>
                  <div>Efter att kolumnen skapas får den ett unikt ID som du kan använda för att skicka data från Workflows-applikationen.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          {toastMessage}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-3 py-2 text-xs text-gray-600 border">
        🔄 Auto-uppdatering var 5:e sekund
      </div>

      {/* News Item Modal */}
      <NewsItemModal 
        item={selectedNewsItem}
        onClose={() => setSelectedNewsItem(null)}
      />
    </div>
  )
}