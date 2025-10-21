'use client'

import { NewsItem } from '@/lib/types'
import { X, ExternalLink } from 'lucide-react'
import { getCategoryIcon } from '@/lib/categories'
import { formatCompactTime, isUrl, getHostname } from '@/lib/time-utils'

interface MapInfoCardProps {
  item: NewsItem
  onClose: () => void
}

export default function MapInfoCard({ item, onClose }: MapInfoCardProps) {

  const getNewsValueColor = (newsValue: number) => {
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
  const categoryIcon = getCategoryIcon(item.category)

  return (
    <div
      className="absolute left-1/4 top-1/2 -translate-y-1/2 w-80 bg-white rounded-lg shadow-2xl border border-border z-[500] animate-in fade-in slide-in-from-left-5 duration-300"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      {/* Header with close button */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-full ${getNewsValueColor(item.newsValue)} flex items-center justify-center text-lg flex-shrink-0`}>
            {categoryIcon}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary uppercase tracking-wide hover:underline flex items-center gap-1 truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {displaySource}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            ) : (
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                {displaySource}
              </span>
            )}
            <time className="text-xs text-muted-foreground">
              {formatCompactTime(item.createdInDb || item.timestamp)}
            </time>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-accent rounded-md transition-colors ml-2"
          aria-label="Stäng"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Title */}
        <h3 className="font-semibold text-foreground mb-2 leading-tight">
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}

        {/* Location summary if available */}
        {item.location && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {[
                item.location.area || item.location.street || item.location.name,
                item.location.municipality,
                item.location.county
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
