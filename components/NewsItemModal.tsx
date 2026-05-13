'use client'

import { useEffect, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'

import { NewsItem as NewsItemType, DashboardColumn } from '@/lib/types'
import { getPriority, timeExact } from '@/lib/design-system'
import { getCategory } from '@/lib/categories'
import { formatFullTime, isUrl, getHostname } from '@/lib/time-utils'

// Dynamically import LeafletMap to avoid SSR issues
const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="w-full h-48 bg-[var(--nd-bg-soft)] animate-pulse" />,
})

interface NewsItemModalProps {
  item: NewsItemType | null
  columns?: DashboardColumn[]
  onClose: () => void
}

export default function NewsItemModal({ item, columns, onClose }: NewsItemModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [cameraUrl, setCameraUrl] = useState<string | null>(null)
  const [isRefreshingCamera, setIsRefreshingCamera] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<'pending' | 'ready' | 'failed'>('ready')
  const [refreshCooldown, setRefreshCooldown] = useState(0)
  const [showTech, setShowTech] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    if (item) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'

      if (item.trafficCamera) {
        const url = item.trafficCamera.currentUrl || item.trafficCamera.photoUrl
        setCameraUrl(url)
        setCameraStatus(item.trafficCamera.status || 'ready')
      } else {
        setCameraUrl(null)
        setCameraStatus('ready')
      }
      setShowTech(false)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [item, onClose])

  useEffect(() => {
    if (!copiedField) return
    const t = setTimeout(() => setCopiedField(null), 2000)
    return () => clearTimeout(t)
  }, [copiedField])

  useEffect(() => {
    if (refreshCooldown > 0) {
      const t = setInterval(() => setRefreshCooldown(p => Math.max(0, p - 1)), 1000)
      return () => clearInterval(t)
    }
  }, [refreshCooldown])

  if (!item) return <AnimatePresence>{null}</AnimatePresence>

  const priority = getPriority(item.newsValue)
  const column = columns?.find(c => c.id === item.workflowId || c.flowId === item.workflowId)

  const rawSource = item.source?.trim()
  const rawUrl = item.url?.trim()
  const fallbackUrl = rawSource && isUrl(rawSource) ? rawSource : undefined
  const sourceUrl = rawUrl || fallbackUrl
  let displaySource = rawSource
  if (!displaySource && sourceUrl) displaySource = getHostname(sourceUrl)
  if (displaySource && isUrl(displaySource) && sourceUrl) displaySource = getHostname(sourceUrl)
  const resolvedSource = displaySource || 'Okänd källa'

  const locationParts = item.location
    ? [
        item.location.street,
        item.location.area,
        item.location.name,
        item.location.municipality,
        item.location.county,
        item.location.country,
      ].filter(Boolean).join(', ')
    : ''

  const coordinates = Array.isArray(item.location?.coordinates) && item.location?.coordinates.length >= 2
    ? [item.location.coordinates[0], item.location.coordinates[1]]
    : null

  const getGoogleMapsUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},16z`
  const mapsUrl = coordinates ? getGoogleMapsUrl(coordinates[0], coordinates[1]) : null

  const categoryDef = item.category ? getCategory(item.category) : undefined

  const handleCopy = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  const handleRefreshCamera = async () => {
    if (!item?.trafficCamera || !item.dbId) return
    setIsRefreshingCamera(true)
    try {
      const response = await fetch('/api/traffic-cameras/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsItemId: item.dbId }),
      })
      const data = await response.json()
      if (response.status === 429) {
        setRefreshCooldown(data.retryAfter || 60)
        return
      }
      if (!response.ok) {
        console.error('Failed to refresh camera:', data.error)
        return
      }
      setCameraStatus('pending')
    } catch (err) {
      console.error('Failed to refresh camera:', err)
    } finally {
      setIsRefreshingCamera(false)
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${item.dbId || item.id || ''}`
    handleCopy(url, 'link')
  }

  const renderExtraValue = (value: unknown): ReactNode => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    const s = String(value)
    if (isUrl(s)) {
      return (
        <a href={s} target="_blank" rel="noopener noreferrer">
          {s}
          <ExternalLink className="h-3 w-3" />
        </a>
      )
    }
    return s
  }

  return (
    <AnimatePresence>
      <motion.div
        key={item.dbId ?? item.id ?? item.title}
        className="nd-modal-wrap"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className="nd-modal"
          style={{ ['--nd-pc' as string]: priority.color }}
          onClick={(e) => e.stopPropagation()}
          initial={{ y: 16, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 8, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <header>
            <div className="nd-mh-l">
              {column?.title && <span className="nd-mh-col">{column.title}</span>}
              {column?.title && <span className="nd-mh-sep">·</span>}
              <span className="nd-mh-src">{resolvedSource}</span>
              <span className="nd-mh-sep">·</span>
              <time>{timeExact(item.createdInDb || item.timestamp)}</time>
            </div>
            <div className="nd-mh-r">
              <span className="nd-mh-prio" style={{ background: priority.color }}>
                Nyhetsvärde {item.newsValue}
              </span>
              <button onClick={onClose} aria-label="Stäng" className="nd-mh-x">✕</button>
            </div>
          </header>

          <div className="nd-mbody">
            <h2>{item.title}</h2>
            {item.description && <p className="nd-mdesc">{item.description}</p>}

            <div className="nd-mgrid">
              {locationParts && (
                <div className="nd-mcell">
                  <div className="nd-mk">Plats</div>
                  <div className="nd-mv">{locationParts}</div>
                </div>
              )}
              {categoryDef && (
                <div className="nd-mcell">
                  <div className="nd-mk">Kategori</div>
                  <div className="nd-mv">
                    <span aria-hidden style={{ marginRight: 6 }}>{categoryDef.icon}</span>
                    {categoryDef.label}
                  </div>
                </div>
              )}
              <div className="nd-mcell">
                <div className="nd-mk">Källa</div>
                <div className="nd-mv">
                  {sourceUrl ? (
                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                      {resolvedSource}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    resolvedSource
                  )}
                </div>
              </div>
              <div className="nd-mcell">
                <div className="nd-mk">Nyhetsvärde</div>
                <div className="nd-mv">{item.newsValue}/5 — {priority.name}</div>
              </div>
              <div className="nd-mcell" style={{ gridColumn: '1 / -1' }}>
                <div className="nd-mk">Mottagen</div>
                <div className="nd-mv">{formatFullTime(item.createdInDb || item.timestamp)}</div>
              </div>
            </div>

            {coordinates && (
              <div className="nd-mmap">
                <LeafletMap
                  lat={coordinates[0]}
                  lng={coordinates[1]}
                  height={200}
                  zoom={15}
                  onClick={() => mapsUrl && window.open(mapsUrl, '_blank')}
                />
              </div>
            )}

            {item.trafficCamera && (
              <div className="nd-msection">
                <h3>
                  Trafikkamera
                  <button
                    onClick={handleRefreshCamera}
                    disabled={isRefreshingCamera || refreshCooldown > 0}
                    className="nd-mtech-toggle"
                    style={{ marginLeft: 'auto' }}
                    title={refreshCooldown > 0 ? `Vänta ${refreshCooldown}s` : 'Uppdatera bild'}
                  >
                    {refreshCooldown > 0 ? `${refreshCooldown}s` : (
                      <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingCamera ? 'animate-spin' : ''}`} />
                    )}
                    {refreshCooldown === 0 && 'Uppdatera'}
                  </button>
                </h3>
                <div className="nd-msection-body" style={{ padding: 0, overflow: 'hidden' }}>
                  {cameraStatus === 'pending' && (
                    <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--nd-ink-dim)' }}>
                      Hämtar ny bild...
                    </div>
                  )}
                  {cameraStatus === 'failed' && (
                    <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--nd-p5)' }}>
                      Kunde inte hämta bild. {item.trafficCamera.error || 'Försök igen senare.'}
                    </div>
                  )}
                  {cameraUrl && cameraStatus === 'ready' && (
                    <>
                      <div style={{
                        padding: '8px 14px',
                        fontSize: 11,
                        fontFamily: 'var(--nd-font-mono)',
                        color: 'var(--nd-ink-mute)',
                        borderBottom: '1px solid var(--nd-line-soft)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span>{item.trafficCamera.name}</span>
                        <span>{item.trafficCamera.distance} km bort</span>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cameraUrl}
                        alt={item.trafficCamera.name}
                        style={{ display: 'block', width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
                        onError={() => setCameraStatus('failed')}
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowTech(s => !s)}
              className="nd-mtech-toggle"
            >
              {showTech ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Teknisk information
            </button>

            {showTech && (
              <div className="nd-msection" style={{ marginTop: 8 }}>
                <div className="nd-msection-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <TechRow label="db_id" value={item.dbId} field="dbId" copiedField={copiedField} onCopy={handleCopy} />
                  {item.id && (
                    <TechRow label="source_id" value={item.id} field="id" copiedField={copiedField} onCopy={handleCopy} />
                  )}
                  <TechRow label="workflow_id" value={item.workflowId} field="workflowId" copiedField={copiedField} onCopy={handleCopy} />
                  {item.flowId && (
                    <TechRow label="flow_id" value={item.flowId} field="flowId" copiedField={copiedField} onCopy={handleCopy} />
                  )}
                </div>

                {item.extra && Object.keys(item.extra).length > 0 && (
                  <>
                    <h3 style={{ marginTop: 14 }}>Extra</h3>
                    <div className="nd-msection-body">
                      {(Object.entries(item.extra) as Array<[string, unknown]>).map(([key, value]) => (
                        <div key={key} style={{ fontSize: 12, color: 'var(--nd-ink-dim)', marginBottom: 4 }}>
                          <span style={{
                            fontFamily: 'var(--nd-font-mono)', fontSize: 10,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            color: 'var(--nd-ink-mute)', marginRight: 8,
                          }}>{key}</span>
                          <span style={{ wordBreak: 'break-word' }}>{renderExtraValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {item.raw != null && (
                  <>
                    <h3 style={{ marginTop: 14 }}>Rådata</h3>
                    <div className="nd-mraw">
                      <pre>{JSON.stringify(item.raw, null, 2)}</pre>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <footer className="nd-mfoot">
            <button onClick={handleCopyLink} className="nd-btn nd-btn-ghost">
              {copiedField === 'link' ? 'Kopierad!' : 'Kopiera länk'}
            </button>
            {sourceUrl && (
              <button onClick={() => window.open(sourceUrl, '_blank')} className="nd-btn nd-btn-primary">
                Öppna källa
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface TechRowProps {
  label: string
  value: string
  field: string
  copiedField: string | null
  onCopy: (value: string, field: string) => void
}

function TechRow({ label, value, field, copiedField, onCopy }: TechRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        fontFamily: 'var(--nd-font-mono)', fontSize: 10,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        color: 'var(--nd-ink-mute)', minWidth: 96,
      }}>{label}</span>
      <code style={{
        flex: 1, fontFamily: 'var(--nd-font-mono)', fontSize: 11.5,
        color: 'var(--nd-ink)', background: 'var(--nd-surface)',
        padding: '4px 8px', borderRadius: 4,
        border: '1px solid var(--nd-line-soft)',
        wordBreak: 'break-all',
      }}>{value}</code>
      <button
        onClick={() => onCopy(value, field)}
        className="nd-btn nd-btn-ghost"
        style={{ padding: '4px 10px', fontSize: 11 }}
      >
        {copiedField === field ? 'Kopierad' : 'Kopiera'}
      </button>
    </div>
  )
}
