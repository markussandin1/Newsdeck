'use client'

import { useMemo } from 'react'
import { NewsItem as NewsItemType } from '@/lib/types'
import { DashboardColumn } from '@/lib/types'
import { getPriority, getColumnColor, timeAgo, PRIORITY_COLORS } from '@/lib/design-system'
import { getCategory } from '@/lib/categories'
import { MapPin } from 'lucide-react'

interface GridViewProps {
  columns: DashboardColumn[]
  columnData: Record<string, NewsItemType[]>
  onSelectItem: (item: NewsItemType) => void
}

export function GridView({ columns, columnData, onSelectItem }: GridViewProps) {
  const allItems = useMemo(() => {
    const items: (NewsItemType & { columnId: string })[] = []
    Object.entries(columnData).forEach(([columnId, colItems]) => {
      colItems.forEach(item => items.push({ ...item, columnId }))
    })
    return items.sort((a, b) => {
      if (b.newsValue !== a.newsValue) return b.newsValue - a.newsValue
      return new Date(b.createdInDb || b.timestamp).getTime() - new Date(a.createdInDb || a.timestamp).getTime()
    })
  }, [columnData])

  const criticalCount = allItems.filter(i => i.newsValue === 5).length
  const highCount = allItems.filter(i => i.newsValue === 4).length
  const mediumCount = allItems.filter(i => i.newsValue === 3).length

  return (
    <div className="nd-grid-wrap">
      <div className="nd-grid-bar">
        <span className="nd-gb-label">Översikt</span>
        <div className="nd-gb-stats">
          <GridStat label="Totalt" value={allItems.length} />
          <GridStat label={PRIORITY_COLORS[5].name} value={criticalCount} dotColor={PRIORITY_COLORS[5].color} />
          <GridStat label={PRIORITY_COLORS[4].name} value={highCount} dotColor={PRIORITY_COLORS[4].color} />
          <GridStat label={PRIORITY_COLORS[3].name} value={mediumCount} dotColor={PRIORITY_COLORS[3].color} />
          <GridStat label="Kolumner" value={columns.length} />
        </div>
      </div>
      <div className="nd-tiles">
        {allItems.map(item => {
          const p = getPriority(item.newsValue)
          const col = columns.find(c => c.id === item.columnId)
          const colColor = getColumnColor(item.columnId)
          const isBig = item.newsValue >= 5
          const isMid = item.newsValue === 4
          const tileClass = `nd-tile${isBig ? ' nd-tile-big' : isMid ? ' nd-tile-mid' : ''}`

          return (
            <article
              key={item.dbId}
              className={tileClass}
              style={{ ['--nd-pc' as string]: p.color, ['--nd-col-color' as string]: colColor }}
              onClick={() => onSelectItem(item)}
            >
              <div className="nd-tile-top">
                <span className="nd-tile-col">
                  <span className="nd-sw" />
                  {col?.title || '—'}
                </span>
                <span className="nd-tile-prio" style={{ background: p.color }}>
                  {item.newsValue}
                </span>
              </div>
              <h3>{item.title}</h3>
              {isBig && item.description && <p>{item.description}</p>}
              <div className="nd-tile-foot">
                <span className="nd-tile-src">{item.source}</span>
                <span className="nd-sep">·</span>
                <time>{timeAgo(item.createdInDb || item.timestamp)}</time>
                {item.location && getLocationSummary(item) && (
                  <>
                    <span className="nd-sep">·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={10} />
                      {getLocationSummary(item)}
                    </span>
                  </>
                )}
                <span className="nd-grow" />
                {item.category && (() => {
                  const cat = getCategory(item.category)
                  return cat ? (
                    <span className="nd-cat">
                      <span className="nd-cat-ico" aria-hidden>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  ) : null
                })()}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function GridStat({ label, value, dotColor }: { label: string; value: number; dotColor?: string }) {
  return (
    <span className="nd-stat">
      {dotColor && <span className="nd-stat-dot" style={{ background: dotColor }} />}
      <span className="nd-stat-l">{label}</span>
      <span className="nd-stat-v">{value}</span>
    </span>
  )
}

function getLocationSummary(item: NewsItemType): string | null {
  if (!item.location) return null
  const parts = [
    item.location.area || item.location.street || item.location.name,
    item.location.municipality
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
