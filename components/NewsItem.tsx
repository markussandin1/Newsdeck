import { NewsItem as NewsItemType } from '@/lib/types'
import { memo, useState, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { getPriority, timeAgo } from '@/lib/design-system'
import { getCategory } from '@/lib/categories'
import { isUrl, getHostname, isNewsItemNew, NEW_WINDOW_MS } from '@/lib/time-utils'

interface NewsItemProps {
  item: NewsItemType
  /** @deprecated kept for backwards compatibility — card is always compact now */
  compact?: boolean
  /**
   * Skickar `item` direkt så att kallaren kan reusa en stabil callback
   * (`useCallback`-baserad) och inte tvingas skapa nya pilfunktioner per
   * item. Det gör att React.memo nedan faktiskt biter och varje
   * NewsItem-kort inte re-renderas vid varje state-change i parent.
   */
  onSelect?: (item: NewsItemType) => void
}

function NewsItem({ item, onSelect }: NewsItemProps) {
  const onClick = onSelect ? () => onSelect(item) : undefined
  // Initialt värde beräknas direkt; sedan rensar en timer badgen när fönstret
  // löper ut. Memo + stabil objektidentitet gör annars att kortet aldrig
  // re-renderas och "NY"-badgen fastnar i evighet på tysta kolumner.
  const [isNew, setIsNew] = useState(() => isNewsItemNew(item.createdInDb))

  useEffect(() => {
    if (!isNew) return
    // Rendera om när nyhets-fönstret löper ut — memo + stabil objektidentitet
    // gör att kortet annars aldrig re-renderas och badgen fastnar.
    const created = Date.parse(item.createdInDb ?? item.timestamp)
    const remaining = Math.max(0, created + NEW_WINDOW_MS - Date.now())
    const timer = setTimeout(() => setIsNew(false), remaining)
    return () => clearTimeout(timer)
  }, [isNew, item.createdInDb, item.timestamp])

  const priority = getPriority(item.newsValue)
  const isEmph = item.newsValue >= 4

  // Source label: prefer provided source string; fall back to URL hostname
  const rawSource = item.source?.trim()
  const rawUrl = item.url?.trim()
  const fallbackUrl = rawSource && isUrl(rawSource) ? rawSource : undefined
  const sourceUrl = rawUrl || fallbackUrl
  let displaySource = rawSource
  if (!displaySource && sourceUrl) displaySource = getHostname(sourceUrl)
  if (displaySource && isUrl(displaySource) && sourceUrl) displaySource = getHostname(sourceUrl)
  const resolvedSource = displaySource || 'Okänd källa'

  const location = item.location
  const locationParts = location
    ? [
        location.area || location.street || location.name,
        location.municipality,
      ].filter(Boolean)
    : []

  const categoryDef = item.category ? getCategory(item.category) : undefined

  return (
    <article
      className={`nd-card nd-compact ${isNew ? 'nd-is-new' : ''} ${isEmph ? 'nd-emph' : ''}`}
      style={{ ['--nd-pc' as string]: priority.color, ['--nd-ps' as string]: priority.soft } as React.CSSProperties}
      onClick={onClick}
    >
      <span className="nd-ribbon" aria-hidden />
      <header className="nd-meta">
        <span className="nd-src">{resolvedSource}</span>
        <span className="nd-dot" aria-hidden>·</span>
        <time className="nd-tm">{timeAgo(item.createdInDb || item.timestamp)}</time>
        {isNew && <span className="nd-new">NY</span>}
        <span className="nd-pip-wrap">
          <span className="nd-pip" style={{ background: priority.color }}>{item.newsValue}</span>
        </span>
      </header>
      <h3 className="nd-title">{item.title}</h3>
      {item.description && <p className="nd-desc">{item.description}</p>}
      <footer className="nd-foot">
        {categoryDef && (
          <span className="nd-cat">
            <span className="nd-cat-ico" aria-hidden>{categoryDef.icon}</span>
            <span>{categoryDef.label}</span>
          </span>
        )}
        {locationParts.length > 0 && (
          <span className="nd-loc">
            <MapPin size={10} />
            {locationParts.join(' · ')}
          </span>
        )}
      </footer>
    </article>
  )
}

export default memo(NewsItem)
