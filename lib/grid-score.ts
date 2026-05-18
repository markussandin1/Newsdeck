import type { NewsItem } from './types'

export type ItemWithColumn = NewsItem & { columnId: string }

function ageMinutes(item: NewsItem): number {
  const ts = item.createdInDb || item.timestamp
  if (!ts) return Infinity
  const diffMs = Date.now() - new Date(ts).getTime()
  return diffMs / 60_000
}

export function scoreItem(item: NewsItem): number {
  const age = ageMinutes(item)
  return item.newsValue * Math.exp(-age / 60)
}

export interface GridGrouping {
  hero: ItemWithColumn | null
  secondary: ItemWithColumn[]
  bands: {
    last15: ItemWithColumn[]
    lastHour: ItemWithColumn[]
    earlierToday: ItemWithColumn[]
  }
}

export function groupItemsForGrid(items: ItemWithColumn[]): GridGrouping {
  const withScore = items
    .map(item => {
      const age = ageMinutes(item)
      return { item, age, score: item.newsValue * Math.exp(-age / 60) }
    })
    .filter(x => x.age < 24 * 60)
    .sort((a, b) => b.score - a.score)

  const hero = withScore[0]?.item ?? null
  const secondary = withScore.slice(1, 3).map(x => x.item)
  const topIds = new Set(withScore.slice(0, 3).map(x => x.item.dbId))

  const last15: ItemWithColumn[] = []
  const lastHour: ItemWithColumn[] = []
  const earlierToday: ItemWithColumn[] = []

  for (const { item, age } of withScore) {
    if (topIds.has(item.dbId)) continue
    if (age < 15) last15.push(item)
    else if (age < 60) lastHour.push(item)
    else earlierToday.push(item)
  }

  return { hero, secondary, bands: { last15, lastHour, earlierToday } }
}
