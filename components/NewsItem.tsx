import { NewsItem as NewsItemType } from '@/lib/types'
import { useState, useEffect, memo } from 'react'

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


  const getSeverityPresentation = (severity?: string | null) => {
    if (!severity) return null

    const normalized = severity.trim().toLowerCase()
    const map: Record<string, { label: string; badgeClass: string; bannerClass: string }> = {
      critical: {
        label: 'Kritisk',
        badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
        bannerClass: 'bg-rose-600 text-white'
      },
      kritisk: {
        label: 'Kritisk',
        badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
        bannerClass: 'bg-rose-600 text-white'
      },
      high: {
        label: 'Hög',
        badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
        bannerClass: 'bg-amber-500 text-white'
      },
      hög: {
        label: 'Hög',
        badgeClass: 'bg-amber-100 text-amber-700 border border-amber-200',
        bannerClass: 'bg-amber-500 text-white'
      },
      medium: {
        label: 'Medel',
        badgeClass: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
        bannerClass: 'bg-yellow-500 text-white'
      },
      medel: {
        label: 'Medel',
        badgeClass: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
        bannerClass: 'bg-yellow-500 text-white'
      },
      low: {
        label: 'Låg',
        badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
        bannerClass: 'bg-slate-500 text-white'
      },
      låg: {
        label: 'Låg',
        badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
        bannerClass: 'bg-slate-500 text-white'
      }
    }

    const presentation = map[normalized]

    return presentation || {
      label: severity,
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
      bannerClass: 'bg-slate-500 text-white'
    }
  }

  const getLocationSummary = () => {
    if (!item.location) return null

    const primary = item.location.area || item.location.street || item.location.name
    const secondary = item.location.municipality
    const tertiary = item.location.county

    return [primary, secondary, tertiary].filter(Boolean).join(' · ')
  }

  const isUrl = (value?: string | null) => {
    if (!value) return false
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }

  const getHostname = (value: string) => {
    try {
      const hostname = new URL(value).hostname
      return hostname.replace(/^www\./, '')
    } catch {
      return value
    }
  }

  const getSourceInfo = () => {
    const rawSource = item.source?.trim()
    const rawUrl = item.url?.trim()
    const fallbackUrl = isUrl(rawSource) ? rawSource : undefined
    const sourceUrl = rawUrl || fallbackUrl

    let displaySource = rawSource

    if (!displaySource && sourceUrl) {
      displaySource = getHostname(sourceUrl)
    }

    if (displaySource && isUrl(displaySource) && sourceUrl) {
      displaySource = getHostname(sourceUrl)
    }

    return {
      displaySource: displaySource || 'Okänd källa',
      sourceUrl
    }
  }

  const { displaySource, sourceUrl } = getSourceInfo()
  const severityPresentation = getSeverityPresentation(item.severity)
  const locationSummary = getLocationSummary()


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
              {sourceUrl ? (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-indigo-600 uppercase tracking-wide hover:underline flex items-center gap-1"
                >
                  {displaySource}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 16" />
                  </svg>
                </a>
              ) : (
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {displaySource}
                </span>
              )}
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
              {severityPresentation && (
                <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${severityPresentation.badgeClass}`}>
                  {severityPresentation.label}
                </span>
              )}
            </div>
            {locationSummary && (
              <span className="text-xs text-slate-500 flex items-center gap-1 text-right">
                📍 {locationSummary}
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
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
              >
                {displaySource}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 16" />
                </svg>
              </a>
            ) : (
              <span className="font-medium">{displaySource}</span>
            )}
            <span>•</span>
            <span>{formatTime(item.createdInDb || item.timestamp)}</span>
          </div>
          {severityPresentation && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${severityPresentation.bannerClass}`}>
              {severityPresentation.label}
              {item.category && (
                <span className="text-white/80 font-normal">{item.category}</span>
              )}
            </div>
          )}
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
      
      <div className="space-y-4">
        {item.location && (
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-1">Platsdetaljer</div>
            <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
              {item.location.country && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Land</span>
                  <span>{item.location.country}</span>
                </div>
              )}
              {item.location.county && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Län</span>
                  <span>{item.location.county}</span>
                </div>
              )}
              {item.location.municipality && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Kommun</span>
                  <span>{item.location.municipality}</span>
                </div>
              )}
              {item.location.area && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Område</span>
                  <span>{item.location.area}</span>
                </div>
              )}
              {item.location.street && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Adress</span>
                  <span>{item.location.street}</span>
                </div>
              )}
              {item.location.name && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Platsnamn</span>
                  <span>{item.location.name}</span>
                </div>
              )}
              {Array.isArray(item.location.coordinates) && item.location.coordinates.length === 2 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Koordinater</span>
                  <span>{item.location.coordinates.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {item.extra && Object.keys(item.extra).length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-1">Extra data</div>
            <div className="space-y-1 text-sm text-gray-600">
              {Object.entries(item.extra).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-xs uppercase tracking-wide text-gray-400 whitespace-nowrap">{key}</span>
                  <span className="break-words">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t border-gray-200 flex flex-col gap-1">
          <span><span className="font-medium">Workflow ID:</span> {item.workflowId}</span>
          {item.flowId && (
            <span><span className="font-medium">Flow ID:</span> {item.flowId}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(NewsItem)
