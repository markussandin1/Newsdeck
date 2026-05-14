import { useMemo, useState } from 'react'
import type { NewsItem as NewsItemType } from '@/lib/types'
import type { ColumnData } from '@/lib/dashboard/types'

interface UseColumnSearchProps {
  columnData: ColumnData
}

interface UseColumnSearchReturn {
  searchQuery: string
  setSearchQuery: (q: string) => void
  /** Sorterad kopia av columnData (newest first), oavsett söktermen */
  sortedColumnData: ColumnData
  /** Sorterad + filtrerad efter söktermen */
  filteredColumnData: ColumnData
  hasActiveSearch: boolean
  showSearchNoResults: boolean
}

/**
 * Lokal söklogik för dashboarden. Tar emot rådata, returnerar sorterad
 * kopia plus filtrerad variant baserad på `searchQuery`.
 *
 * Söker case-insensitive i title, description, source, category, severity
 * och alla location-fält (country, county, municipality, area, street, name).
 *
 * Extraherat ur DashboardView (P1-3 fortsättning).
 */
export function useColumnSearch({ columnData }: UseColumnSearchProps): UseColumnSearchReturn {
  const [searchQuery, setSearchQuery] = useState('')

  // Sortera varje kolumn på createdInDb || timestamp DESC.
  const sortedColumnData = useMemo<ColumnData>(() => {
    const result: ColumnData = {}
    Object.entries(columnData).forEach(([columnId, items]) => {
      result[columnId] = [...items].sort((a, b) => {
        const ta = a.createdInDb ? new Date(a.createdInDb).getTime() : new Date(a.timestamp).getTime()
        const tb = b.createdInDb ? new Date(b.createdInDb).getTime() : new Date(b.timestamp).getTime()
        return tb - ta
      })
    })
    return result
  }, [columnData])

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredColumnData = useMemo<ColumnData>(() => {
    if (!normalizedSearchQuery) return sortedColumnData

    const matchesQuery = (item: NewsItemType) => {
      const locationText = item.location
        ? [
            item.location.country,
            item.location.county,
            item.location.municipality,
            item.location.area,
            item.location.street,
            item.location.name,
          ].filter(Boolean).join(' ').toLowerCase()
        : ''
      const searchableText = [item.title, item.description, item.source, item.category, item.severity]
        .filter(Boolean).join(' ').toLowerCase()
      const combined = `${searchableText} ${locationText}`.trim()
      return combined ? combined.includes(normalizedSearchQuery) : false
    }

    const filtered: ColumnData = {}
    Object.entries(sortedColumnData).forEach(([columnId, items]) => {
      filtered[columnId] = items.filter(matchesQuery)
    })
    return filtered
  }, [sortedColumnData, normalizedSearchQuery])

  const hasActiveSearch = normalizedSearchQuery.length > 0
  const showSearchNoResults =
    hasActiveSearch && Object.values(filteredColumnData).every(items => items.length === 0)

  return {
    searchQuery,
    setSearchQuery,
    sortedColumnData,
    filteredColumnData,
    hasActiveSearch,
    showSearchNoResults,
  }
}
