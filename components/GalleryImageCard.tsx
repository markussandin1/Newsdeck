'use client'

import { useState } from 'react'
import { NewsItem } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { MapPin, Camera } from 'lucide-react'

interface GalleryImageCardProps {
  item: NewsItem
  onClick: () => void
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

const formatCompactTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) {
    return `${diffMins}m`
  } else if (diffHours < 24) {
    return `${diffHours}h`
  } else if (diffDays < 7) {
    return `${diffDays}d`
  } else {
    return date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })
  }
}

const formatDistance = (distance?: number | null): string | null => {
  if (distance == null || isNaN(distance)) return null
  const value = distance >= 10 ? distance.toFixed(0) : distance.toFixed(1)
  return `${value} km bort`
}

export function GalleryImageCard({ item, onClick }: GalleryImageCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const imageUrl = item.trafficCamera?.currentUrl || item.trafficCamera?.photoUrl

  const locationText = [
    item.location?.municipality,
    item.location?.county
  ].filter(Boolean).join(', ')

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg overflow-hidden bg-card border border-border hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
    >
      {/* Image */}
      <div className="relative aspect-video bg-black/5 overflow-hidden">
        {imageError || !imageUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Camera className="h-12 w-12 text-muted-foreground/30" />
          </div>
        ) : (
          <>
            {/* Skeleton loader */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" />
            )}

            <img
              src={imageUrl}
              alt={item.trafficCamera?.name || item.title}
              className={`
                w-full h-full object-cover
                transition-all duration-300
                group-hover:scale-105
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true)
                console.error('Failed to load image:', imageUrl)
              }}
              loading="lazy"
            />

            {/* Camera icon overlay */}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full p-1.5">
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-display font-semibold text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {item.title}
        </h3>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Badge variant={getNewsValueBadgeVariant(item.newsValue)} className="text-[10px]">
              {item.newsValue}
            </Badge>
            <span className="text-muted-foreground">
              {formatCompactTime(item.timestamp)}
            </span>
          </div>

          {locationText && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{locationText}</span>
            </div>
          )}
        </div>

        {/* Camera name */}
        {(item.trafficCamera?.name || item.trafficCamera?.distance != null) && (
          <div className="mt-2 text-xs text-muted-foreground/80 truncate flex items-center gap-2">
            {item.trafficCamera?.name && (
              <span className="truncate">{item.trafficCamera.name}</span>
            )}
            {formatDistance(item.trafficCamera?.distance) && (
              <>
                {item.trafficCamera?.name && <span className="text-muted-foreground/50">•</span>}
                <span className="whitespace-nowrap">
                  {formatDistance(item.trafficCamera?.distance)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
