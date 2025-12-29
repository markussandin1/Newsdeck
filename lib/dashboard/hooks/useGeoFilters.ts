import { useState, useEffect, useCallback, useMemo } from 'react'
import type { NewsItem, GeoFilters, Country, Region, Municipality } from '@/lib/types'

interface GeographicMetadata {
  countries: Country[]
  regions: Region[]
  municipalities: Municipality[]
}

interface UseGeoFiltersProps {
  dashboardId: string
}

export interface UseGeoFiltersReturn {
  // Filter state
  filters: GeoFilters
  isLoaded: boolean

  // Geographic metadata
  metadata: GeographicMetadata
  isMetadataLoading: boolean
  metadataError: string | null

  // Filter actions
  setRegionCodes: (codes: string[]) => void
  setMunicipalityCodes: (codes: string[]) => void
  setShowItemsWithoutLocation: (show: boolean) => void
  toggleRegion: (code: string) => void
  toggleMunicipality: (code: string) => void
  clearFilters: () => void

  // Filtering
  applyFilters: (items: NewsItem[]) => NewsItem[]
  isActive: boolean
}

const DEFAULT_FILTERS: GeoFilters = {
  regionCodes: [],
  municipalityCodes: [],
  showItemsWithoutLocation: true,
}

const STORAGE_KEY_PREFIX = 'geoFilters_'

/**
 * Hook for managing geographic filters with localStorage persistence
 */
export function useGeoFilters({
  dashboardId,
}: UseGeoFiltersProps): UseGeoFiltersReturn {
  const [filters, setFilters] = useState<GeoFilters>(DEFAULT_FILTERS)
  const [isLoaded, setIsLoaded] = useState(false)

  const [metadata, setMetadata] = useState<GeographicMetadata>({
    countries: [],
    regions: [],
    municipalities: [],
  })
  const [isMetadataLoading, setIsMetadataLoading] = useState(true)
  const [metadataError, setMetadataError] = useState<string | null>(null)

  const storageKey = `${STORAGE_KEY_PREFIX}${dashboardId}`

  // Load geographic metadata from API
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setIsMetadataLoading(true)
        setMetadataError(null)

        const response = await fetch('/api/geo')
        if (!response.ok) {
          throw new Error(`Failed to load geographic metadata: ${response.statusText}`)
        }

        const data = await response.json()
        setMetadata(data)
      } catch (error) {
        console.error('Failed to load geographic metadata:', error)
        setMetadataError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsMetadataLoading(false)
      }
    }

    loadMetadata()
  }, [])

  // Load filters from localStorage on mount
  useEffect(() => {
    const loadFilters = () => {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as GeoFilters
          setFilters(parsed)
          console.log('Loaded geographic filters from localStorage')
        } catch (e) {
          console.error('Failed to parse geographic filters:', e)
        }
      }
      setIsLoaded(true)
    }

    loadFilters()
  }, [storageKey])

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(storageKey, JSON.stringify(filters))
    }
  }, [filters, storageKey, isLoaded])

  // Check if any filters are active
  const isActive = useMemo(() => {
    return (
      filters.regionCodes.length > 0 ||
      filters.municipalityCodes.length > 0 ||
      !filters.showItemsWithoutLocation
    )
  }, [filters])

  // Filter actions
  const setRegionCodes = useCallback((codes: string[]) => {
    setFilters(prev => ({ ...prev, regionCodes: codes }))
  }, [])

  const setMunicipalityCodes = useCallback((codes: string[]) => {
    setFilters(prev => ({ ...prev, municipalityCodes: codes }))
  }, [])

  const setShowItemsWithoutLocation = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showItemsWithoutLocation: show }))
  }, [])

  const toggleRegion = useCallback((code: string) => {
    setFilters(prev => {
      const isSelected = prev.regionCodes.includes(code)
      return {
        ...prev,
        regionCodes: isSelected
          ? prev.regionCodes.filter(c => c !== code)
          : [...prev.regionCodes, code]
      }
    })
  }, [])

  const toggleMunicipality = useCallback((code: string) => {
    setFilters(prev => {
      const isSelected = prev.municipalityCodes.includes(code)
      return {
        ...prev,
        municipalityCodes: isSelected
          ? prev.municipalityCodes.filter(c => c !== code)
          : [...prev.municipalityCodes, code]
      }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // Apply filters to news items
  const applyFilters = useCallback((items: NewsItem[]): NewsItem[] => {
    // If no filters are active, return all items
    if (!isActive) {
      return items
    }

    return items.filter(item => {
      // Check if item has location data
      const hasLocation = !!(
        item.countryCode ||
        item.regionCode ||
        item.municipalityCode
      )

      // If item has no location and we're hiding items without location
      if (!hasLocation && !filters.showItemsWithoutLocation) {
        return false
      }

      // If item has no location and we're showing items without location
      if (!hasLocation && filters.showItemsWithoutLocation) {
        return true
      }

      // If municipality filters are active, check municipality match
      if (filters.municipalityCodes.length > 0) {
        if (
          item.municipalityCode &&
          filters.municipalityCodes.includes(item.municipalityCode)
        ) {
          return true
        }
      }

      // If region filters are active (and no municipality match), check region match
      if (filters.regionCodes.length > 0) {
        if (
          item.regionCode &&
          filters.regionCodes.includes(item.regionCode)
        ) {
          return true
        }
      }

      // If we have filters active but no match, exclude the item
      if (filters.regionCodes.length > 0 || filters.municipalityCodes.length > 0) {
        return false
      }

      // Default: include the item
      return true
    })
  }, [filters, isActive])

  return {
    filters,
    isLoaded,
    metadata,
    isMetadataLoading,
    metadataError,
    setRegionCodes,
    setMunicipalityCodes,
    setShowItemsWithoutLocation,
    toggleRegion,
    toggleMunicipality,
    clearFilters,
    applyFilters,
    isActive,
  }
}
