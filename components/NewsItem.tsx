import { NewsItem as NewsItemType } from '@/lib/types'
import { useState, useEffect, memo } from 'react'
import { MapPin } from 'lucide-react'
import { getPriority, timeAgo } from '@/lib/design-system'
import { getCategory } from '@/lib/categories'
import { isUrl, getHostname } from '@/lib/time-utils'

interface NewsItemProps {
  item: NewsItemType
  /** @deprecated kept for backwards compatibility — card is always compact now */
  compact?: boolean
  onClick?: () => void
}

function NewsItem({ item, onClick }: NewsItemProps) {
  const [isNew, setIsNew] = useState(item.isNew || false)

  useEffect(() => {
    if (item.isNew) {
      const timer = setTimeout(() => setIsNew(false), 60_000)
      return () => clearTimeout(timer)
    }
  }, [item.dbId, item.isNew])

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
