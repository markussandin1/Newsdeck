import { NewsItem as NewsItemType } from '@/lib/types'
import { useState, useEffect, memo } from 'react'
import { MapPin, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCompactTime, isUrl, getHostname } from '@/lib/time-utils'

interface NewsItemProps {
  item: NewsItemType
  compact?: boolean
  onClick?: () => void
}

function NewsItem({ item, compact = false, onClick }: NewsItemProps) {
  const [isNew, setIsNew] = useState(item.isNew || false)

  useEffect(() => {
    if (item.isNew) {
      // Clear "new" indicator after 60 seconds to stop the pulsing animation
      // (The isNew flag is set based on createdInDb timestamp - items < 1 minute old)
      // Use item.dbId as dependency so this only runs once per unique item
      const timer = setTimeout(() => setIsNew(false), 60000)
      return () => clearTimeout(timer)
    }
  }, [item.dbId, item.isNew])
  const getNewsValueAccentColor = (newsValue: number) => {
    switch (newsValue) {
      case 5:
        return 'bg-priority-critical'
      case 4:
        return 'bg-priority-high'
      case 3:
        return 'bg-priority-medium'
      default:
        return 'bg-priority-low'
    }
  }

  const getNewsValueBadgeVariant = (newsValue: number): 'error' | 'warning' | 'info' | 'secondary' => {
    switch (newsValue) {
      case 5:
        return 'error'
      case 4:
        return 'warning'
      case 3:
        return 'info'
      default:
        return 'secondary'
    }
  }

  // Legacy function for non-compact view
  const getNewsValueStyle = (newsValue: number) => {
    switch (newsValue) {
      case 5:
        return 'border-priority-critical border-2 bg-error/5'
      case 4:
        return 'border-priority-high border-2 bg-warning/5'
      case 3:
        return 'border-priority-medium border-2 bg-success/5'
      default:
        return 'border-priority-low border bg-card'
    }
  }


  const getLocationSummary = () => {
    if (!item.location) return null

    const primary = item.location.area || item.location.street || item.location.name
    const secondary = item.location.municipality
    const tertiary = item.location.county

    return [primary, secondary, tertiary].filter(Boolean).join(' · ')
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
        className={`relative bg-card rounded-lg border border-border p-4 cursor-pointer group smooth-transition hover:shadow-soft-lg hover:border-border/80 ${isNew ? 'new-message' : ''
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
                  className="text-xs font-medium text-primary uppercase tracking-wide hover:underline flex items-center gap-1"
                >
                  {displaySource}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {displaySource}
                </span>
              )}
              {isNew && (
                <span className="new-badge">NY</span>
              )}
            </div>
            <time className="text-xs text-muted-foreground">
              {formatCompactTime(item.createdInDb || item.timestamp)}
            </time>
          </div>

          {/* Category badge (if present) */}
          {item.category && (
            <div className="mb-1">
              <Badge variant="info" className="text-[8px] uppercase">
                {item.category}
              </Badge>
            </div>
          )}

          {/* Title */}
          <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary smooth-transition text-sm leading-tight">
            {item.title}
          </h3>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {item.description}
            </p>
          )}


          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={getNewsValueBadgeVariant(item.newsValue)}>
                {item.newsValue}
              </Badge>
            </div>
            {locationSummary && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 text-right">
                <MapPin className="w-3 h-3" />
                {locationSummary}
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
          <h3 className="font-bold text-foreground text-lg leading-tight mb-1">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline flex items-center gap-1"
              >
                {displaySource}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="font-medium">{displaySource}</span>
            )}
            <span>•</span>
            <span>{formatTime(item.createdInDb || item.timestamp)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 ml-3">
          <Badge variant={getNewsValueBadgeVariant(item.newsValue)}>
            {item.newsValue}
          </Badge>
        </div>
      </div>

      {item.description && (
        <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
          {item.description}
        </p>
      )}

      <div className="space-y-4">
        {item.location && (
          <div>
            <div className="text-sm font-semibold text-foreground mb-1">Platsdetaljer</div>
            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
              {item.location.country && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/60">Land</span>
                  <span>{item.location.country}</span>
                </div>
              )}
              {item.location.county && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/60">Län</span>
                  <span>{item.location.county}</span>
                </div>
              )}
              {item.location.municipality && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/60">Kommun</span>
                  <span>{item.location.municipality}</span>
                </div>
              )}
              {item.location.area && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/60">Område</span>
                  <span>{item.location.area}</span>
                </div>
              )}
              {item.location.street && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/60">Adress</span>
                  <span>{item.location.street}</span>
                </div>
              )}
              {item.location.name && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/60">Platsnamn</span>
                  <span>{item.location.name}</span>
                </div>
              )}
              {Array.isArray(item.location.coordinates) && item.location.coordinates.length === 2 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground/60">Koordinater</span>
                  <span>{item.location.coordinates.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {item.extra && Object.keys(item.extra).length > 0 && (
          <div>
            <div className="text-sm font-semibold text-foreground mb-1">Extra data</div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {Object.entries(item.extra).map(([key, value]) => {
                let displayValue
                if (typeof value === 'object') {
                  displayValue = JSON.stringify(value)
                } else {
                  const stringValue = String(value)
                  if (isUrl(stringValue)) {
                    displayValue = (
                      <a
                        href={stringValue}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {stringValue}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    )
                  } else {
                    displayValue = stringValue
                  }
                }
                return (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground/60 whitespace-nowrap">{key}</span>
                    <span className="break-words">{displayValue}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t border-border flex flex-col gap-1">
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
