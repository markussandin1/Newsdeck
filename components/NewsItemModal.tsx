'use client'

import { NewsItem as NewsItemType } from '@/lib/types'
import { useEffect, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import LeafletMap to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 animate-pulse" />
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

  const getSeverityPresentation = (severity?: string | null) => {
    if (!severity) return null

    const normalized = severity.trim().toLowerCase()
    const map: Record<string, { label: string; badgeClass: string; bannerClass: string }> = {
      critical: {
        label: 'Kritisk',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        bannerClass: 'bg-red-600 text-white'
      },
      kritisk: {
        label: 'Kritisk',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        bannerClass: 'bg-red-600 text-white'
      },
      high: {
        label: 'Hög',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        bannerClass: 'bg-orange-500 text-white'
      },
      hög: {
        label: 'Hög',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        bannerClass: 'bg-orange-500 text-white'
      },
      medium: {
        label: 'Medel',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        bannerClass: 'bg-yellow-500 text-white'
      },
      medel: {
        label: 'Medel',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        bannerClass: 'bg-yellow-500 text-white'
      },
      low: {
        label: 'Låg',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
        bannerClass: 'bg-gray-600 text-white'
      },
      låg: {
        label: 'Låg',
        badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
        bannerClass: 'bg-gray-600 text-white'
      }
    }

    const presentation = map[normalized]

    return presentation || {
      label: severity,
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
      bannerClass: 'bg-gray-600 text-white'
    }
  }

  const getSeverityBadge = (severity?: string | null) => {
    const presentation = getSeverityPresentation(severity)
    if (!presentation) return null

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${presentation.badgeClass}`}>
        {presentation.label}
      </span>
    )
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

  const severityPresentation = getSeverityPresentation(item.severity)

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

  const renderExtraValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return ''
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2) ?? ''
    }
    return String(value)
  }

  const extraSection: ReactNode = item?.extra && Object.keys(item.extra).length > 0 ? (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">📎 Extra data</h3>
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        {(Object.entries(item.extra) as Array<[string, unknown]>).map(([key, value]) => (
          <div key={key} className="text-sm text-gray-600">
            <span className="text-xs uppercase tracking-wide text-gray-400 mr-2">{key}</span>
            <span className="break-words">{renderExtraValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null


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
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                {resolvedSource}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 16" />
                </svg>
              </a>
            ) : (
              <span className="font-semibold text-blue-600">{resolvedSource}</span>
            )}
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

          {sourceUrl && (
            <div>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700"
              >
                Besök källa
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 16" />
                </svg>
              </a>
            </div>
          )}
          
          {/* Location */}
          {item.location && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">📍 Plats</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {locationEntries.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {locationEntries.map(({ label, value }) => (
                      <div key={label} className="text-sm text-gray-600">
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-0.5">{label}</div>
                        <div>{value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {coordinates && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Koordinater</div>
                      <div>{coordinates[0]}, {coordinates[1]}</div>
                    </div>
                    {mapsUrl && (
                      <button
                        onClick={() => window.open(mapsUrl, '_blank')}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                      >
                        Öppna i kartor
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h6m0 0v6m0-6L10 16" />
                        </svg>
                      </button>
                    )}
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
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-700 opacity-0 group-hover:opacity-100 smooth-transition shadow-sm">
                        🗺️ Öppna i Google Maps
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
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🔧 Rådata</h3>
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  {JSON.stringify(item.raw, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
          
          {/* Technical details */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">⚙️ Teknisk information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">ID:</span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1 break-all">
                    {item.id}
                  </div>
                  <button
                    onClick={() => handleCopy(item.id, 'id')}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {copiedField === 'id' ? 'Kopierad' : 'Kopiera'}
                  </button>
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-600">Workflow ID:</span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1 break-all">
                    {item.workflowId}
                  </div>
                  <button
                    onClick={() => handleCopy(item.workflowId, 'workflowId')}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {copiedField === 'workflowId' ? 'Kopierad' : 'Kopiera'}
                  </button>
                </div>
              </div>
              {item.flowId && (
                <div>
                  <span className="font-medium text-gray-600">Flow ID:</span>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <div className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded flex-1 break-all">
                      {item.flowId}
                    </div>
                    <button
                      onClick={() => handleCopy(item.flowId as string, 'flowId')}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {copiedField === 'flowId' ? 'Kopierad' : 'Kopiera'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
