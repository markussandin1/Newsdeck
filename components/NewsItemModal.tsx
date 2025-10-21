'use client'

import { NewsItem as NewsItemType } from '@/lib/types'
import { useEffect, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, ExternalLink, X, Paperclip, Settings, Map } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'

// Dynamically import LeafletMap to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-muted rounded-lg border border-border animate-pulse" />
})

interface NewsItemModalProps {
  item: NewsItemType | null
  onClose: () => void
}

export default function NewsItemModal({ item, onClose }: NewsItemModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

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

  useEffect(() => {
    if (!copiedField) return
    const timer = setTimeout(() => setCopiedField(null), 2000)
    return () => clearTimeout(timer)
  }, [copiedField])

  if (!item) {
    return <AnimatePresence>{null}</AnimatePresence>
  }

  const getNewsValueStyle = (newsValue: number) => {
    switch (newsValue) {
      case 5:
        return 'border-priority-critical bg-error/5'
      case 4:
        return 'border-priority-high bg-warning/5'
      case 3:
        return 'border-priority-medium bg-success/5'
      default:
        return 'border-priority-low bg-card'
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

  const resolvedSource = displaySource || 'Okänd källa'

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


  const getGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},16z`
  }

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
    } catch (error) {
      console.error('Failed to copy', error)
    }
  }

  const locationEntries = item.location ? [
    { label: 'Land', value: item.location.country },
    { label: 'Län', value: item.location.county },
    { label: 'Kommun', value: item.location.municipality },
    { label: 'Område', value: item.location.area },
    { label: 'Adress', value: item.location.street },
    { label: 'Platsnamn', value: item.location.name }
  ].filter(entry => entry.value) : []

  const coordinates = Array.isArray(item.location?.coordinates) && item.location?.coordinates.length >= 2
    ? [item.location.coordinates[0], item.location.coordinates[1]]
    : null

  const mapsUrl = coordinates ? getGoogleMapsUrl(coordinates[0], coordinates[1]) : null

  // Convert ISO 3166-1 alpha-2 country code(s) to flag emoji(s)
  const getCountryFlags = (countryCodes?: string) => {
    if (!countryCodes) return '🌍'

    // Split by comma if multiple codes
    const codes = countryCodes.includes(',')
      ? countryCodes.split(',').map(c => c.trim())
      : [countryCodes]

    const flags = codes
      .filter(code => code.length === 2 && /^[A-Z]{2}$/i.test(code))
      .map(code => {
        const upperCode = code.toUpperCase()
        const codePoints = Array.from(upperCode).map(char => 0x1F1E6 + char.charCodeAt(0) - 65)
        return String.fromCodePoint(...codePoints)
      })

    return flags.length > 0 ? flags.join(' ') : '🌍'
  }

  const renderExtraValue = (value: unknown): ReactNode => {
    if (value === null || value === undefined) {
      return ''
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2) ?? ''
    }

    const stringValue = String(value)

    // Check if the value is a URL
    if (isUrl(stringValue)) {
      return (
        <a
          href={stringValue}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          {stringValue}
          <ExternalLink className="h-3 w-3" />
        </a>
      )
    }

    return stringValue
  }

  const extraSection: ReactNode = item?.extra && Object.keys(item.extra).length > 0 ? (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Paperclip className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold text-foreground">Extra data</h3>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        {(Object.entries(item.extra) as Array<[string, unknown]>).map(([key, value]) => (
          <div key={key} className="text-sm text-muted-foreground">
            <span className="text-xs uppercase tracking-wide text-muted-foreground/60 mr-2">{key}</span>
            <span className="break-words">{renderExtraValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null


  return (
    <AnimatePresence>
      <motion.div
        key={item.dbId ?? item.id ?? item.title}
        className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <motion.div
          className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-l-8 ${getNewsValueStyle(item.newsValue)}`}
          onClick={(e) => e.stopPropagation()}
          initial={{ y: 24, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground leading-tight mb-3">
                {item.title}
              </h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline flex items-center gap-1"
              >
                {resolvedSource}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <span className="font-semibold text-primary">{resolvedSource}</span>
            )}
            <span>•</span>
            <span>{formatTime(item.createdInDb || item.timestamp)}</span>
          </div>
        </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="ml-4"
              title="Stäng"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-3">
            <Badge variant={getNewsValueBadgeVariant(item.newsValue)}>
              Nyhetsvärde: {item.newsValue}
            </Badge>
            {item.category && (
              <Badge variant="info">
                {item.category}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {item.description && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Beskrivning</h3>
              <p className="text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          {sourceUrl && (
            <div>
              <Button
                onClick={() => window.open(sourceUrl, '_blank')}
                className="gap-2"
              >
                Besök källa
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Location */}
          {item.location && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Plats</h3>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                {locationEntries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-sm">
                    {item.location.country && (
                      <span className="text-lg">
                        {getCountryFlags(item.location.country)}
                      </span>
                    )}
                    {item.location.county && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-foreground">{item.location.county}</span>
                      </>
                    )}
                    {item.location.municipality && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-foreground">{item.location.municipality}</span>
                      </>
                    )}
                    {item.location.area && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-foreground">{item.location.area}</span>
                      </>
                    )}
                    {item.location.street && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-foreground">{item.location.street}</span>
                      </>
                    )}
                    {item.location.name && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-foreground">{item.location.name}</span>
                      </>
                    )}
                  </div>
                )}

                {coordinates && mapsUrl && (
                  <div className="flex justify-end">
                    <Button
                      onClick={() => window.open(mapsUrl, '_blank')}
                      variant="outline"
                      className="h-5 px-2 gap-1 text-[11px] rounded"
                    >
                      <Map className="h-3 w-3" />
                      Kartor
                    </Button>
                  </div>
                )}

                {coordinates && (
                  <div className="mt-2">
                    <div className="relative group">
                      <LeafletMap
                        lat={coordinates[0]}
                        lng={coordinates[1]}
                        height={192}
                        zoom={16}
                        onClick={() => {
                          if (coordinates) {
                            window.open(getGoogleMapsUrl(coordinates[0], coordinates[1]), '_blank')
                          }
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-foreground opacity-0 group-hover:opacity-100 smooth-transition shadow-sm flex items-center gap-2">
                        <Map className="h-4 w-4" />
                        Öppna i Google Maps
                      </div>
                      <div className="absolute bottom-3 left-3 bg-black/70 text-white rounded px-2 py-1 text-xs">
                        Klicka för att öppna i Google Maps
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Extra information */}
          {extraSection}
          
          {/* Raw data */}
          {item.raw != null ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground">Rådata</h3>
              </div>
              <div className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(item.raw, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}

          {/* Technical details */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">Teknisk information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-muted-foreground">ID:</span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="font-mono text-foreground bg-muted px-2 py-1 rounded flex-1 break-all">
                    {item.id}
                  </div>
                  <Button
                    onClick={() => handleCopy(item.id, 'id')}
                    variant="ghost"
                    size="sm"
                  >
                    {copiedField === 'id' ? 'Kopierad' : 'Kopiera'}
                  </Button>
                </div>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Workflow ID:</span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="font-mono text-foreground bg-muted px-2 py-1 rounded flex-1 break-all">
                    {item.workflowId}
                  </div>
                  <Button
                    onClick={() => handleCopy(item.workflowId, 'workflowId')}
                    variant="ghost"
                    size="sm"
                  >
                    {copiedField === 'workflowId' ? 'Kopierad' : 'Kopiera'}
                  </Button>
                </div>
              </div>
              {item.flowId && (
                <div>
                  <span className="font-medium text-muted-foreground">Flow ID:</span>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="font-mono text-foreground bg-muted px-2 py-1 rounded flex-1 break-all">
                      {item.flowId}
                    </div>
                    <Button
                      onClick={() => handleCopy(item.flowId as string, 'flowId')}
                      variant="ghost"
                      size="sm"
                    >
                      {copiedField === 'flowId' ? 'Kopierad' : 'Kopiera'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
