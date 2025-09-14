import { NewsItem as NewsItemType } from '@/lib/types'

interface NewsItemProps {
  item: NewsItemType
  compact?: boolean
  onClick?: () => void
}

export default function NewsItem({ item, compact = false, onClick }: NewsItemProps) {
  const getNewsValueStyle = (newsValue: number) => {
    switch (newsValue) {
      case 5:
        return 'border-red-500 border-2 bg-red-50 animate-pulse'
      case 4:
        return 'border-orange-500 border-2 bg-orange-50'
      case 3:
        return 'border-yellow-500 border-2 bg-yellow-50'
      default:
        return 'border-gray-300 border bg-white'
    }
  }

  const getSeverityBadge = (severity?: "critical" | "high" | "medium" | "low" | null) => {
    if (!severity) return null
    
    const styles = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${styles[severity as keyof typeof styles] || styles.low}`}>
        {severity.toUpperCase()}
      </span>
    )
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (compact) {
    return (
      <div 
        className={`rounded-lg p-3 shadow-sm cursor-pointer transition-transform hover:scale-105 ${getNewsValueStyle(item.newsValue)}`}
        onClick={onClick}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-medium">{item.source}</span>
              <span>•</span>
              <span>{new Date(item.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
              item.newsValue >= 4 ? 'bg-red-600 text-white' :
              item.newsValue === 3 ? 'bg-yellow-600 text-white' :
              'bg-gray-600 text-white'
            }`}>
              {item.newsValue}
            </span>
            {item.severity && (
              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                item.severity === 'critical' ? 'bg-red-100 text-red-700' :
                item.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                item.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.severity.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        
        {item.description && (
          <p className="text-gray-700 text-xs leading-relaxed line-clamp-2 mb-2">
            {item.description}
          </p>
        )}
        
        {item.location && (
          <div className="text-xs text-gray-600">
            📍 {[item.location.name, item.location.municipality].filter(Boolean).join(', ')}
          </div>
        )}
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
            <span>{formatTime(item.timestamp)}</span>
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
          {getSeverityBadge(item.severity)}
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