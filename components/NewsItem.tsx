import { NewsItem as NewsItemType } from '@/lib/types'
import { useState, useEffect, memo, useRef } from 'react'

interface NewsItemProps {
  item: NewsItemType
  compact?: boolean
  onClick?: () => void
}

function NewsItem({ item, compact = false, onClick }: NewsItemProps) {
  const [isNew, setIsNew] = useState(item.isNew || false)

  useEffect(() => {
    if (item.isNew) {
      // Clear "new" indicator after 30 seconds
      const timer = setTimeout(() => setIsNew(false), 30000)
      return () => clearTimeout(timer)
    }
  }, [item.isNew])
  const getNewsValueAccentColor = (newsValue: number) => {
    switch (newsValue) {
      case 5:
        return 'bg-rose-500'
      case 4:
        return 'bg-amber-500'
      case 3:
        return 'bg-yellow-500'
      default:
        return 'bg-slate-400'
    }
  }

  const getNewsValueBadgeStyle = (newsValue: number) => {
    switch (newsValue) {
      case 5:
        return 'bg-rose-100 text-rose-700'
      case 4:
        return 'bg-amber-100 text-amber-700'
      case 3:
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  // Legacy function for non-compact view
  const getNewsValueStyle = (newsValue: number) => {
    switch (newsValue) {
      case 5:
        return 'border-rose-500 border-2 bg-rose-50'
      case 4:
        return 'border-amber-500 border-2 bg-amber-50'
      case 3:
        return 'border-yellow-500 border-2 bg-yellow-50'
      default:
        return 'border-slate-300 border bg-white'
    }
  }


  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Stockholm'
    })
  }




  if (compact) {
    return (
      <div 
        className={`relative bg-white rounded-lg border border-slate-200 p-4 cursor-pointer group smooth-transition hover:shadow-soft-lg hover:border-slate-300 ${
          isNew ? 'new-message' : ''
        }`}
        onClick={onClick}
      >
        {/* New message indicator */}
        {isNew && (
          <div className="absolute -top-1 -right-1 flex items-center justify-center">
            <div className="new-indicator-dot"></div>
            <div className="new-indicator-ping"></div>
          </div>
        )}

        {/* Accent stripe */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${getNewsValueAccentColor(item.newsValue)}`}></div>
        
        <div className="pl-3">
          {/* Metadata header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {item.source}
              </span>
              {isNew && (
                <span className="new-badge">NY</span>
              )}
            </div>
            <time className="text-xs text-slate-400">
              {new Date(item.createdInDb || item.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })}
            </time>
          </div>
          
          {/* Title */}
          <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-700 smooth-transition text-sm leading-tight">
            {item.title}
          </h3>
          
          {/* Description */}
          {item.description && (
            <p className="text-sm text-slate-600 line-clamp-2 mb-3 leading-relaxed">
              {item.description}
            </p>
          )}


          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getNewsValueBadgeStyle(item.newsValue)}`}>
                {item.newsValue}
              </span>
            </div>
            {item.location && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                📍 {[item.location.name, item.location.municipality].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg p-4 shadow-sm ${getNewsValueStyle(item.newsValue)}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span className="font-medium">{item.source}</span>
            <span>•</span>
            <span>{formatTime(item.createdInDb || item.timestamp)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-3">
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            item.newsValue >= 4 ? 'bg-red-600 text-white' :
            item.newsValue === 3 ? 'bg-yellow-600 text-white' :
            'bg-gray-600 text-white'
          }`}>
            {item.newsValue}
          </span>
        </div>
      </div>
      
      {item.description && (
        <p className="text-gray-700 mb-3 text-sm leading-relaxed">
          {item.description}
        </p>
      )}
      
      <div className="space-y-2">
        {item.location && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">📍 Plats:</span>{' '}
            {[
              item.location.name,
              item.location.municipality,
              item.location.county
            ].filter(Boolean).join(', ')}
          </div>
        )}
        
        {item.category && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">🏷️ Kategori:</span> {item.category}
          </div>
        )}
        
        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
          <span className="font-medium">Workflow:</span> {item.workflowId}
        </div>
      </div>
    </div>
  )
}

export default memo(NewsItem)