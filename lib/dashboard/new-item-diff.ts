/**
 * Diffar kolumn-state mot mängden redan sedda dbId:n och returnerar vad som
 * ska notifieras. Muterar seen (lägger till allt den ser) — det gör anropet
 * idempotent: samma state två gånger ger aldrig dubbla notiser, oavsett
 * StrictMode/dubbla effects.
 *
 * Åldersfönstret gör att en refetch efter reconnect notifierar missade
 * färska events, medan en lång backfill (natt-gammal data) är tyst.
 */
import type { NewsItem } from '../types'
import type { ColumnStoreState } from './column-store'

export const MAX_NOTIFY_AGE_MS = 2 * 60 * 1000

export function diffNewItems(
  state: ColumnStoreState,
  seen: Set<string>,
  now: number,
  isFirstRun: boolean,
): Record<string, NewsItem[]> {
  const fresh: Record<string, NewsItem[]> = {}

  for (const [columnId, items] of Object.entries(state)) {
    for (const item of items) {
      if (!item.dbId || seen.has(item.dbId)) continue
      seen.add(item.dbId)
      if (isFirstRun) continue

      const created = Date.parse(item.createdInDb ?? item.timestamp)
      if (Number.isNaN(created) || now - created > MAX_NOTIFY_AGE_MS) continue

      ;(fresh[columnId] ??= []).push(item)
    }
  }

  return fresh
}
