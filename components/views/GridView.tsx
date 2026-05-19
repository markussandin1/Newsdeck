'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { NewsItem as NewsItemType, DashboardColumn } from '@/lib/types'
import { getPriority, getColumnColor, timeAgo, PRIORITY_COLORS } from '@/lib/design-system'
import { groupItemsForGrid, type ItemWithColumn } from '@/lib/grid-score'
import { MapPin } from 'lucide-react'

const StaticMapThumb = dynamic(() => import('@/components/StaticMapThumb'), { ssr: false })

interface GridViewProps {
  columns: DashboardColumn[]
  columnData: Record<string, NewsItemType[]>
  onSelectItem: (item: NewsItemType) => void
}

function getCoordinates(item: NewsItemType): { lat: number; lng: number } | null {
  const c = item.location?.coordinates as unknown
  if (Array.isArray(c) && c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
    return { lat: c[0], lng: c[1] }
  }
  if (c && typeof c === 'object' && !Array.isArray(c)) {
    const obj = c as Record<string, unknown>
    const lat = typeof obj.latitude === 'number' ? obj.latitude : typeof obj.lat === 'number' ? obj.lat : undefined
    const lng = typeof obj.longitude === 'number' ? obj.longitude : typeof obj.lng === 'number' ? obj.lng : undefined
    if (lat !== undefined && lng !== undefined) return { lat, lng }
  }
  return null
}

function getLocationSummary(item: NewsItemType): string | null {
  if (!item.location) return null
  const parts = [
    item.location.area || item.location.street || item.location.name,
    item.location.municipality,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function ageLabel(item: NewsItemType): string {
  return timeAgo(item.createdInDb || item.timestamp)
}

function isFresh(item: NewsItemType): boolean {
  const ts = item.createdInDb || item.timestamp
  if (!ts) return false
  return (Date.now() - new Date(ts).getTime()) / 60_000 < 30
}

export function GridView({ columns, columnData, onSelectItem }: GridViewProps) {
  const allItems = useMemo<ItemWithColumn[]>(() => {
    const items: ItemWithColumn[] = []
    Object.entries(columnData).forEach(([columnId, colItems]) => {
      colItems.forEach(item => items.push({ ...item, columnId }))
    })
    return items
  }, [columnData])

  const grouping = useMemo(() => groupItemsForGrid(allItems), [allItems])

  const criticalCount = allItems.filter(i => i.newsValue === 5).length
  const highCount = allItems.filter(i => i.newsValue === 4).length
  const mediumCount = allItems.filter(i => i.newsValue === 3).length

  if (!grouping.hero) {
    return (
      <div className="nd-gv-wrap">
        <div className="nd-gv-empty">Inga händelser senaste 24 timmarna.</div>
      </div>
    )
  }

  const heroRowClass =
    grouping.secondary.length >= 2 ? '' :
    grouping.secondary.length === 1 ? 'cols-2' :
    'cols-1'

  return (
    <div className="nd-gv-wrap">
      <div className="nd-gv-bar">
        <span className="nd-gv-bar-label">Översikt · Sverige senaste timmen</span>
        <div className="nd-gv-stats">
          <Stat label="Totalt" value={allItems.length} />
          <Stat label={PRIORITY_COLORS[5].name} value={criticalCount} dotColor={PRIORITY_COLORS[5].color} />
          <Stat label={PRIORITY_COLORS[4].name} value={highCount} dotColor={PRIORITY_COLORS[4].color} />
          <Stat label={PRIORITY_COLORS[3].name} value={mediumCount} dotColor={PRIORITY_COLORS[3].color} />
          <Stat label="Kolumner" value={columns.length} />
        </div>
      </div>

      <div className={`nd-gv-hero-row ${heroRowClass}`}>
        <HeroCard item={grouping.hero} columns={columns} onSelect={onSelectItem} />
        {grouping.secondary.map(item => (
          <SecondaryCard key={item.dbId} item={item} columns={columns} onSelect={onSelectItem} />
        ))}
      </div>

      <Band title="Senaste 15 minuter" items={grouping.bands.last15} columns={columns} onSelect={onSelectItem} />
      <Band title="Senaste timmen" items={grouping.bands.lastHour} columns={columns} onSelect={onSelectItem} />
      <Band title="Tidigare idag" items={grouping.bands.earlierToday} columns={columns} onSelect={onSelectItem} older />
    </div>
  )
}

function Stat({ label, value, dotColor }: { label: string; value: number; dotColor?: string }) {
  return (
    <span className="nd-gv-stat">
      {dotColor && <span className="nd-gv-stat-dot" style={{ background: dotColor }} />}
      <span>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  )
}

function HeroCard({
  item,
  columns,
  onSelect,
}: {
  item: ItemWithColumn
  columns: DashboardColumn[]
  onSelect: (i: NewsItemType) => void
}) {
  const p = getPriority(item.newsValue)
  const coords = getCoordinates(item)
  const place = getLocationSummary(item)
  const col = columns.find(c => c.id === item.columnId)
  const fresh = isFresh(item)

  return (
    <article
      className={`nd-gv-hero ${coords ? 'has-map' : ''}`}
      style={{ ['--nd-pc' as string]: p.color }}
      onClick={() => onSelect(item)}
    >
      <div className="nd-gv-hero-body">
        <span className="nd-gv-hero-label">
          {fresh && <span className="nd-gv-hero-pulse" aria-hidden />}
          Topphändelse · {p.name}
        </span>
        <h2>{item.title}</h2>
        {item.description && <p>{item.description}</p>}
        <div className="nd-gv-hero-meta">
          <span>{item.source.toUpperCase()}</span>
          {place && <><span>·</span><span>{place.toUpperCase()}</span></>}
          {col && <><span>·</span><span>{col.title.toUpperCase()}</span></>}
          <span>·</span>
          <span>{ageLabel(item).toUpperCase()}</span>
          <span>·</span>
          <span className="accent">NEWSVALUE {item.newsValue}</span>
        </div>
      </div>
      {coords && (
        <StaticMapThumb
          lat={coords.lat}
          lng={coords.lng}
          markerColor={p.color}
          placeLabel={place || `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E`}
        />
      )}
    </article>
  )
}

function SecondaryCard({
  item,
  columns,
  onSelect,
}: {
  item: ItemWithColumn
  columns: DashboardColumn[]
  onSelect: (i: NewsItemType) => void
}) {
  const p = getPriority(item.newsValue)
  const col = columns.find(c => c.id === item.columnId)
  const place = getLocationSummary(item)
  const critical = item.newsValue === 5

  return (
    <article
      className={`nd-gv-sec ${critical ? 'is-critical' : ''}`}
      style={{ ['--nd-pc' as string]: p.color }}
      onClick={() => onSelect(item)}
    >
      <span className={`nd-gv-sec-label ${critical ? 'is-critical' : ''}`}>
        {p.name} · {ageLabel(item)}
      </span>
      <h3>{item.title}</h3>
      {item.description && <p>{item.description}</p>}
      <div className="nd-gv-sec-meta">
        {item.source.toUpperCase()}
        {place && <> · {place.toUpperCase()}</>}
        {col && <> · {col.title.toUpperCase()}</>}
        {' · '}NEWSVALUE {item.newsValue}
      </div>
    </article>
  )
}

function Band({
  title,
  items,
  columns,
  onSelect,
  older = false,
}: {
  title: string
  items: ItemWithColumn[]
  columns: DashboardColumn[]
  onSelect: (i: NewsItemType) => void
  older?: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className={`nd-gv-band ${older ? 'is-older' : ''}`}>
      <div className="nd-gv-band-head">
        <span>{title}</span>
        <span className="count">{items.length} händelser</span>
      </div>
      <div className="nd-gv-tiles">
        {items.map(item => (
          <Tile key={item.dbId} item={item} columns={columns} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function Tile({
  item,
  columns,
  onSelect,
}: {
  item: ItemWithColumn
  columns: DashboardColumn[]
  onSelect: (i: NewsItemType) => void
}) {
  const p = getPriority(item.newsValue)
  const col = columns.find(c => c.id === item.columnId)
  const place = getLocationSummary(item)

  return (
    <article
      className="nd-gv-tile"
      style={{ ['--nd-pc' as string]: item.newsValue >= 3 ? p.color : 'var(--nd-line)' }}
      onClick={() => onSelect(item)}
    >
      <h4>{item.title}</h4>
      <div className="nd-gv-tile-meta">
        <span className="nd-gv-prio">{item.newsValue}</span>
        <span>{ageLabel(item).toUpperCase()}</span>
        <span>·</span>
        <span>{item.source.toUpperCase()}</span>
        {place && (
          <>
            <span>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={10} />
              {place}
            </span>
          </>
        )}
        {col && (
          <>
            <span>·</span>
            <span style={{ color: getColumnColor(item.columnId) }}>{col.title.toUpperCase()}</span>
          </>
        )}
      </div>
    </article>
  )
}
