'use client'

import { useState, useEffect } from 'react'
import { Dashboard as DashboardType, NewsItem as NewsItemType } from '@/lib/types'
import NewsItem from './NewsItem'

interface DashboardProps {
  dashboard: DashboardType
}

interface ColumnData {
  [columnId: string]: NewsItemType[]
}

export default function Dashboard({ dashboard }: DashboardProps) {
  const [columnData, setColumnData] = useState<ColumnData>({})
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)

  const fetchColumnData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/dashboards/${dashboard.id}`)
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

  // Polling for real-time updates every 5 seconds
  useEffect(() => {
    // Initial fetch
    fetchColumnData()

    const interval = setInterval(() => {
      fetchColumnData()
    }, 5000)

    return () => clearInterval(interval)
  }, [dashboard.id])

  const getTotalNewsCount = () => {
    return Object.values(columnData).reduce((total, items) => total + items.length, 0)
  }

  // Safety check
  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-700 mb-2">Dashboard hittades inte</div>
          <a href="/" className="text-blue-500 hover:text-blue-700">← Tillbaka till start</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{dashboard.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <span>{dashboard.columns.length} kolumner</span>
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
                onClick={fetchColumnData}
                disabled={isLoading}
                className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
              >
                🔄 Uppdatera
              </button>
              <a
                href="/"
                className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
              >
                ← Tillbaka
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* TweetDeck-style Columns */}
      <div className="flex overflow-x-auto h-[calc(100vh-100px)]">
        {dashboard.columns
          .sort((a, b) => a.order - b.order)
          .map((column) => {
            const columnItems = columnData[column.id] || []
            
            return (
              <div 
                key={column.id} 
                className="flex-shrink-0 w-80 bg-white border-r border-gray-200 flex flex-col"
              >
                {/* Column Header */}
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {column.title}
                  </h3>
                  <div className="text-xs text-gray-600 mb-2">
                    {column.description}
                  </div>
                  <div className="text-xs text-gray-500">
                    {columnItems.length} händelser
                  </div>
                </div>

                {/* Column Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      <div className="mb-2">Inga händelser</div>
                      <div className="text-xs text-gray-400">
                        Data för {column.title}
                      </div>
                    </div>
                  ) : (
                    columnItems.map((item) => (
                      <div key={item.id} className="mb-2">
                        <NewsItem item={item} compact={true} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        
        {dashboard.columns.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-lg mb-2">Inga kolumner</div>
              <div className="text-sm">
                Gå tillbaka och lägg till kolumner till din dashboard
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 bg-white rounded-full shadow-lg px-3 py-2 text-xs text-gray-600 border">
        🔄 Auto-uppdatering var 5:e sekund
      </div>
    </div>
  )
}