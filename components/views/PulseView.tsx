'use client'

import { useState, useMemo } from 'react'
import { NewsItem as NewsItemType } from '@/lib/types'
import { DashboardColumn } from '@/lib/types'
import { getPriority, getColumnColor, timeAgo, timeExact, timeBucket } from '@/lib/design-system'
import { getCategory } from '@/lib/categories'
import { MapPin } from 'lucide-react'

interface PulseViewProps {
  columns: DashboardColumn[]
  columnData: Record<string, NewsItemType[]>
  onSelectItem: (item: NewsItemType) => void
}

export function PulseView({ columns, columnData, onSelectItem }: PulseViewProps) {
  const [filterCols, setFilterCols] = useState<Set<string>>(new Set())
  const [minPrio, setMinPrio] = useState(1)

  // Flatten all items from all columns
  const allItems = useMemo(() => {
    const items: (NewsItemType & { columnId: string })[] = []
    Object.entries(columnData).forEach(([columnId, colItems]) => {
      colItems.forEach(item => items.push({ ...item, columnId }))
    })
    return items
  }, [columnData])

  const totalCount = allItems.length

  const visible = useMemo(() => {
    return allItems
      .filter(item => {
        if (filterCols.size > 0) {
          const col = columns.find(c => c.id === item.columnId)
          if (!col) return false
          if (!filterCols.has(col.id)) return false
        }
        return item.newsValue >= minPrio
      })
      .sort((a, b) => {
        const ta = new Date(a.createdInDb || a.timestamp).getTime()
        const tb = new Date(b.createdInDb || b.timestamp).getTime()
        return tb - ta
      })
  }, [allItems, filterCols, minPrio, columns])

  // Group into time buckets
  const grouped = useMemo(() => {
    const buckets: Record<string, typeof visible> = {}
    visible.forEach(item => {
      const bucket = timeBucket(item.createdInDb || item.timestamp)
      if (!buckets[bucket]) buckets[bucket] = []
      buckets[bucket].push(item)
    })
    return buckets
  }, [visible])

  const bucketOrder = ['Senaste 15 min', 'Senaste timmen', 'Senaste 3 timmarna', 'Tidigare idag']

  const toggleCol = (colId: string) => {
    setFilterCols(prev => {
      const next = new Set(prev)
      if (next.has(colId)) next.delete(colId)
      else next.add(colId)
      return next
    })
  }

  return (
    <div className="nd-pulse h-full">
      {/* Filter rail */}
      <aside className="nd-pulse-rail">
        <div className="nd-rail-label">Kolumner</div>
        <button
          className={`nd-rail-chip nd-all ${filterCols.size === 0 ? 'nd-on' : ''}`}
          onClick={() => setFilterCols(new Set())}
        >
          <span className="nd-name">Alla</span>
          <span className="nd-count">{totalCount}</span>
        </button>
        {columns.map(col => {
          const count = columnData[col.id]?.length || 0
          const active = filterCols.has(col.id)
          return (
            <button
              key={col.id}
              className={`nd-rail-chip ${active ? 'nd-on' : ''}`}
              onClick={() => toggleCol(col.id)}
            >
              <span className="nd-swatch" style={{ background: getColumnColor(col.id) }} />
              <span className="nd-name">{col.title}</span>
              <span className="nd-count">{count}</span>
            </button>
          )
        })}

        <div style={{ marginTop: 20 }}>
          <div className="nd-rail-label">Nyhetsvärde ≥ {minPrio}</div>
          <input
            type="range" min="1" max="5" value={minPrio}
            onChange={e => setMinPrio(Number(e.target.value))}
            className="nd-rail-slider"
          />
          <div className="nd-rail-scale">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
          </div>
        </div>
      </aside>

      {/* Main timeline */}
      <main className="nd-pulse-main" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="nd-pulse-axis" />
        {Object.keys(grouped).length === 0 && (
          <div className="nd-pulse-empty">
            <div className="nd-pulse-empty-ic">🔍</div>
            <div className="nd-pulse-empty-t">
              {allItems.length === 0 ? 'Inga händelser ännu' : 'Inga träffar'}
            </div>
            <div className="nd-pulse-empty-d">
              {allItems.length === 0
                ? 'När händelser kommer in i någon av dina kolumner visas de här som ett kronologiskt flöde.'
                : (filterCols.size > 0 || minPrio > 1)
                  ? <>Inga händelser matchar nuvarande filter. Prova att <button type="button" className="nd-pulse-empty-reset" onClick={() => { setFilterCols(new Set()); setMinPrio(1) }}>återställa filtret</button>.</>
                  : 'Inga händelser i tidsfönstret än.'}
            </div>
          </div>
        )}
        {bucketOrder.filter(b => grouped[b]?.length).map(bucket => (
          <section key={bucket} className="nd-pulse-bucket">
            <header className="nd-pulse-bhead">
              <h3>{bucket}</h3>
              <span className="nd-cnt">{grouped[bucket].length}</span>
            </header>
            <div>
              {grouped[bucket].map(item => {
                const p = getPriority(item.newsValue)
                const col = columns.find(c => c.id === item.columnId)
                const colColor = getColumnColor(item.columnId)
                const rowClass = item.newsValue >= 5 ? 'nd-row-p5' : item.newsValue >= 4 ? 'nd-row-p4' : item.newsValue >= 3 ? 'nd-row-p3' : ''
                const ts = item.createdInDb || item.timestamp
                return (
                  <article
                    key={item.dbId}
                    className={`nd-pulse-row ${rowClass}`}
                    onClick={() => onSelectItem(item)}
                  >
                    <div className="nd-prail" style={{ background: p.color }} />
                    <div className="nd-pmeta">
                      <time>{timeExact(ts)}</time>
                      <span className="nd-ago">{timeAgo(ts)}</span>
                    </div>
                    <div className="nd-pbody">
                      <div className="nd-ptop">
                        <span className="nd-pcol" style={{ ['--nd-col-color' as string]: colColor }}>
                          <span className="nd-sw" />
                          {col?.title || '—'}
                        </span>
                        <span className="nd-psrc">{item.source}</span>
                        {item.category && (() => {
                          const cat = getCategory(item.category)
                          return cat ? (
                            <span className="nd-cat">
                              <span className="nd-cat-ico" aria-hidden>{cat.icon}</span>
                              <span>{cat.label}</span>
                            </span>
                          ) : null
                        })()}
                        {item.location && getLocationSummary(item) && (
                          <span className="nd-loc">
                            <MapPin size={10} />
                            {getLocationSummary(item)}
                          </span>
                        )}
                      </div>
                      <h4>{item.title}</h4>
                      {item.description && (
                        <p>{item.description}</p>
                      )}
                    </div>
                    <div className="nd-pside">
                      <span className="nd-pip" style={{ background: p.color }}>{item.newsValue}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
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
