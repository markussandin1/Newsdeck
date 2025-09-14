'use client'

import { NewsItem as NewsItemType } from '@/lib/types'
import { useEffect } from 'react'

interface NewsItemModalProps {
  item: NewsItemType | null
  onClose: () => void
}

export default function NewsItemModal({ item, onClose }: NewsItemModalProps) {
  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (item) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [item, onClose])

  if (!item) return null

  const getNewsValueStyle = (newsValue: number) => {
    switch (newsValue) {
      case 5:
        return 'border-red-500 bg-red-50'
      case 4:
        return 'border-orange-500 bg-orange-50'
      case 3:
        return 'border-yellow-500 bg-yellow-50'
      default:
        return 'border-gray-300 bg-white'
    }
  }

  const getSeverityBadge = (severity?: "critical" | "high" | "medium" | "low" | null) => {
    if (!severity) return null
    
    const styles = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${styles[severity as keyof typeof styles] || styles.low}`}>
        {severity.toUpperCase()}
      </span>
    )
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Stockholm'
    })
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-l-8 ${getNewsValueStyle(item.newsValue)}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 leading-tight mb-3">
                {item.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span className="font-semibold text-blue-600">{item.source}</span>
                <span>•</span>
                <span>{formatTime(item.createdInDb || item.timestamp)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-600 text-2xl font-bold p-1"
              title="Stäng"
            >
              ×
            </button>
          </div>
          
          {/* Badges */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              item.newsValue >= 4 ? 'bg-red-600 text-white' :
              item.newsValue === 3 ? 'bg-yellow-600 text-white' :
              'bg-gray-600 text-white'
            }`}>
              Nyhetsvärde: {item.newsValue}
            </span>
            {getSeverityBadge(item.severity)}
            {item.category && (
              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 border border-blue-200">
                {item.category}
              </span>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {item.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Beskrivning</h3>
              <p className="text-gray-700 leading-relaxed">
                {item.description}
              </p>
            </div>
          )}
          
          {/* Location */}
          {item.location && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">📍 Plats</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {item.location.name && (
                  <div className="mb-1">
                    <span className="font-medium">Platsnamn:</span> {item.location.name}
                  </div>
                )}
                {item.location.municipality && (
                  <div className="mb-1">
                    <span className="font-medium">kommun:</span> {item.location.municipality}
                  </div>
                )}
                {item.location.county && (
                  <div className="mb-1">
                    <span className="font-medium">Län:</span> {item.location.county}
                  </div>
                )}
                {item.location.coordinates && (
                  <div>
                    <span className="font-medium">Koordinater:</span> {item.location.coordinates[0]}, {item.location.coordinates[1]}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Extra information */}
          {item.extra && Object.keys(item.extra).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🔍 Extra information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {Object.entries(item.extra).map(([key, value]) => (
                  <div key={key} className="mb-1">
                    <span className="font-medium capitalize">{key}:</span> {String(value)}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Raw data */}
          {item.raw && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🔧 Rådata</h3>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(item.raw, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {/* Technical details */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">⚙️ Teknisk information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">ID:</span>
                <div className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded mt-1">
                  {item.id}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Workflow ID:</span>
                <div className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded mt-1">
                  {item.workflowId}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}