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
  showItemsWithoutLocation: false, // Don't show un-normalized items by default when filtering
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

          // Migration: Force showItemsWithoutLocation to false for better UX
          // Previously it defaulted to true, which caused items without normalized location codes
          // to show even when filtering by specific municipality/region
          // This migration ensures existing users get the corrected behavior
          const migratedFilters = {
            ...parsed,
            showItemsWithoutLocation: false
          }

          setFilters(migratedFilters)
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

  // Check if any geographic filters are active
  const isActive = useMemo(() => {
    return (
      filters.regionCodes.length > 0 ||
      filters.municipalityCodes.length > 0
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

      // Get all municipalities in this region
      const municipalitiesInRegion = metadata.municipalities
        .filter(m => m.regionCode === code)
        .map(m => m.code)

      if (isSelected) {
        // Deselecting region: remove region AND all its municipalities
        return {
          ...prev,
          regionCodes: prev.regionCodes.filter(c => c !== code),
          municipalityCodes: prev.municipalityCodes.filter(
            c => !municipalitiesInRegion.includes(c)
          )
        }
      } else {
        // Selecting region: add region AND all its municipalities
        return {
          ...prev,
          regionCodes: [...prev.regionCodes, code],
          municipalityCodes: [
            ...prev.municipalityCodes,
            ...municipalitiesInRegion.filter(
              m => !prev.municipalityCodes.includes(m)
            )
          ]
        }
      }
    })
  }, [metadata.municipalities])

  const toggleMunicipality = useCallback((code: string) => {
    setFilters(prev => {
      const isSelected = prev.municipalityCodes.includes(code)

      // Find which region this municipality belongs to
      const municipality = metadata.municipalities.find(m => m.code === code)
      const regionCode = municipality?.regionCode

      if (isSelected) {
        // Deselecting municipality: remove it from list
        // Also remove region if it was selected (user is customizing selection)
        return {
          ...prev,
          municipalityCodes: prev.municipalityCodes.filter(c => c !== code),
          regionCodes: regionCode
            ? prev.regionCodes.filter(c => c !== regionCode)
            : prev.regionCodes
        }
      } else {
        // Selecting municipality: add it to list
        const newMunicipalityCodes = [...prev.municipalityCodes, code]

        // Check if ALL municipalities in this region are now selected
        if (regionCode) {
          const allMunicipalitiesInRegion = metadata.municipalities
            .filter(m => m.regionCode === regionCode)
            .map(m => m.code)

          const allSelected = allMunicipalitiesInRegion.every(m =>
            newMunicipalityCodes.includes(m)
          )

          // If all municipalities selected, also select the region
          return {
            ...prev,
            municipalityCodes: newMunicipalityCodes,
            regionCodes: allSelected && !prev.regionCodes.includes(regionCode)
              ? [...prev.regionCodes, regionCode]
              : prev.regionCodes
          }
        }

        return {
          ...prev,
          municipalityCodes: newMunicipalityCodes
        }
      }
    })
  }, [metadata.municipalities])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // Apply filters to news items
  const applyFilters = useCallback((items: NewsItem[]): NewsItem[] => {
    // If no geographic filters are active, return all items
    const hasGeoFilters = filters.municipalityCodes.length > 0

    if (!hasGeoFilters) {
      return items
    }

    // Get region codes for selected municipalities (for fallback matching)
    const selectedRegionCodes = new Set<string>()
    filters.municipalityCodes.forEach(muniCode => {
      const municipality = metadata.municipalities.find(m => m.code === muniCode)
      if (municipality?.regionCode) {
        selectedRegionCodes.add(municipality.regionCode)
      }
    })

    return items.filter(item => {
      // Check if item has normalized location codes
      const hasLocation = !!(
        item.countryCode ||
        item.regionCode ||
        item.municipalityCode
      )

      // If item has no normalized location codes
      if (!hasLocation) {
        return filters.showItemsWithoutLocation
      }

      // Match items by municipality code (exact match)
      if (item.municipalityCode && filters.municipalityCodes.includes(item.municipalityCode)) {
        return true
      }

      // Fallback: Match items by region code if they don't have municipality code
      // This handles source data that only has county-level tagging
      if (!item.municipalityCode && item.regionCode && selectedRegionCodes.has(item.regionCode)) {
        return true
      }

      return false
    })
  }, [filters, metadata.municipalities])

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
