import { NewsItem as NewsItemType } from '@/lib/types'
import { useState, useEffect, memo } from 'react'
import { MapPin, ExternalLink, Camera, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCompactTime, isUrl, getHostname } from '@/lib/time-utils'
import { getPriority } from '@/lib/design-system'

interface NewsItemProps {
  item: NewsItemType
  compact?: boolean
  onClick?: () => void
}

function NewsItem({ item, compact = false, onClick }: NewsItemProps) {
  const [isNew, setIsNew] = useState(item.isNew || false)
  // Prefer currentUrl (GCS) over photoUrl (Trafikverket) for backward compatibility
  const [cameraUrl, setCameraUrl] = useState<string | null>(
    item.trafficCamera?.currentUrl || item.trafficCamera?.photoUrl || null
  )
  const [isRefreshingCamera, setIsRefreshingCamera] = useState(false)

  useEffect(() => {
    if (item.trafficCamera) {
      // Use currentUrl if available (from GCS), otherwise fallback to photoUrl
      const url = item.trafficCamera.currentUrl || item.trafficCamera.photoUrl
      setCameraUrl(url)
    }
  }, [item.trafficCamera])

  const handleRefreshCamera = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!item.trafficCamera) return
    setIsRefreshingCamera(true)
    // Use currentUrl or photoUrl for cache-busting (simple client-side refresh)
    const baseUrl = (item.trafficCamera.currentUrl || item.trafficCamera.photoUrl).split('?')[0]
    setCameraUrl(`${baseUrl}?t=${Date.now()}`)
  }

  useEffect(() => {
    if (item.isNew) {
      // Clear "new" indicator after 60 seconds to stop the pulsing animation
      // (The isNew flag is set based on createdInDb timestamp - items < 1 minute old)
      // Use item.dbId as dependency so this only runs once per unique item
      const timer = setTimeout(() => setIsNew(false), 60000)
      return () => clearTimeout(timer)
    }
  }, [item.dbId, item.isNew])
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
    const p = getPriority(item.newsValue)
    const isEmph = item.newsValue >= 4
    return (
      <article
        className={`nd-card nd-compact ${isNew ? 'nd-is-new' : ''} ${isEmph ? 'nd-emph' : ''}`}
        style={{ '--nd-pc': p.color, '--nd-ps': p.soft } as React.CSSProperties}
        onClick={onClick}
      >
        <span className="nd-ribbon" aria-hidden />
        <header className="nd-meta">
          <span className="nd-src">{displaySource}</span>
          <span className="nd-dot" aria-hidden>·</span>
          <time className="nd-tm">{formatCompactTime(item.createdInDb || item.timestamp)}</time>
          {isNew && <span className="nd-new">NY</span>}
          <span className="nd-pip-wrap">
            <span className="nd-pip" style={{ background: p.color }}>{item.newsValue}</span>
          </span>
        </header>
        <h3 className="nd-title">{item.title}</h3>
        {item.description && <p className="nd-desc">{item.description}</p>}
        <footer className="nd-foot">
          {item.category && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
              borderRadius: 99, background: 'var(--nd-surface-2)', color: 'var(--nd-ink-dim)',
              fontSize: 10.5, fontFamily: 'var(--nd-font-mono)', fontWeight: 500,
              border: '1px solid var(--nd-line-soft)'
            }}>
              {item.category}
            </span>
          )}
          {locationSummary && (
            <span className="nd-loc">
              <MapPin size={10} />
              {locationSummary}
            </span>
          )}
        </footer>
      </article>
    )
  }

  return (
    <div className={`rounded-lg p-4 shadow-sm ${getNewsValueStyle(item.newsValue)}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-display font-bold text-foreground text-lg leading-tight mb-1">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 text-sm font-body text-muted-foreground mb-2">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body font-medium text-primary hover:underline flex items-center gap-1"
              >
                {displaySource}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <span className="font-body font-medium">{displaySource}</span>
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
        <p className="font-body text-muted-foreground mb-3 text-sm leading-relaxed">
          {item.description}
        </p>
      )}

      {item.trafficCamera && cameraUrl && (
        <div className="mb-4 bg-muted/30 rounded-lg overflow-hidden border border-border/50">
          <div className="p-2 border-b border-border/50 bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Camera className="w-3.5 h-3.5" />
              <span>{item.trafficCamera.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {item.trafficCamera.distance} km bort
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={handleRefreshCamera}
                disabled={isRefreshingCamera}
                title="Uppdatera bild"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshingCamera ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <div className="relative aspect-video bg-black/5">
            <img 
              src={cameraUrl} 
              alt={item.trafficCamera.name}
              className={`object-cover w-full h-full transition-opacity duration-300 ${isRefreshingCamera ? 'opacity-50' : 'opacity-100'}`}
              onLoad={() => setIsRefreshingCamera(false)}
            />
          </div>
        </div>
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
