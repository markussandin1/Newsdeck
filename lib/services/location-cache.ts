/**
 * In-Memory Location Lookup Cache
 *
 * Provides zero-latency location normalization during ingestion by caching
 * all location name mappings in memory. This eliminates database queries
 * during high-volume ingestion periods.
 *
 * Usage:
 * - Load cache on server startup: await locationCache.load()
 * - Lookup locations: locationCache.lookup('Stockholm')
 * - Refresh cache: await locationCache.refresh()
 */

import { getPool } from '@/lib/db-postgresql'

interface CachedLocation {
  countryCode?: string
  regionCountryCode?: string
  regionCode?: string
  municipalityCountryCode?: string
  municipalityRegionCode?: string
  municipalityCode?: string
  matchPriority: number
  matchType: 'exact' | 'fuzzy'
}

export class LocationLookupCache {
  private cache: Map<string, CachedLocation>
  private loaded: boolean
  private loading: Promise<void> | null
  private loadedAt: Date | null
  private version: string | null

  constructor() {
    this.cache = new Map()
    this.loaded = false
    this.loading = null
    this.loadedAt = null
    this.version = null
  }

  /**
   * Load all location name mappings into memory
   * Should be called on server startup
   */
  async load(): Promise<void> {
    // Prevent concurrent loads
    if (this.loading) {
      return this.loading
    }

    this.loading = (async () => {
      try {
        console.log('[LocationCache] Loading location mappings into memory...')

        const pool = getPool()
        const result = await pool.query(`
          SELECT
            variant,
            country_code,
            region_country_code,
            region_code,
            municipality_country_code,
            municipality_region_code,
            municipality_code,
            match_priority,
            match_type
          FROM location_name_mappings
          ORDER BY match_priority ASC
        `)

        this.cache.clear()

        for (const row of result.rows) {
          const normalized = this.normalize(row.variant)

          // Only store the highest priority match for each variant
          const existing = this.cache.get(normalized)
          if (!existing || row.match_priority < existing.matchPriority) {
            this.cache.set(normalized, {
              countryCode: row.country_code,
              regionCountryCode: row.region_country_code,
              regionCode: row.region_code,
              municipalityCountryCode: row.municipality_country_code,
              municipalityRegionCode: row.municipality_region_code,
              municipalityCode: row.municipality_code,
              matchPriority: row.match_priority,
              matchType: row.match_type
            })
          }
        }

        this.loaded = true
        this.loadedAt = new Date()
        this.version = this.loadedAt.toISOString()
        console.log(`[LocationCache] Loaded ${this.cache.size} location mappings (version: ${this.version})`)
      } catch (error) {
        console.error('[LocationCache] Failed to load location mappings:', error)
        throw error
      } finally {
        this.loading = null
      }
    })()

    return this.loading
  }

  /**
   * Normalize a location string for matching
   *
   * Normalization rules:
   * - Convert to lowercase
   * - Trim whitespace
   * - Collapse multiple spaces
   * - Remove common suffixes ("län", "s län", "s")
   * - Remove special characters (keep Swedish letters åäöÅÄÖ)
   */
  normalize(str: string): string {
    if (!str) return ''

    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')           // Collapse multiple spaces
      .replace(/\s*län\s*$/i, '')     // Remove "län" suffix
      .replace(/s\s+län$/i, '')       // Remove "s län" suffix
      .replace(/s$/i, '')             // Remove trailing "s"
      .replace(/[^\w\såäöÅÄÖ]/g, '')  // Remove special chars (keep Swedish letters)
      .trim()
  }

  /**
   * Look up a location variant in the cache
   *
   * @param variant - Location string to look up (e.g., "Stockholm", "Stockholms län")
   * @returns Normalized location codes or null if not found
   */
  lookup(variant: string): Omit<CachedLocation, 'matchPriority' | 'matchType'> | null {
    if (!this.loaded) {
      console.warn('[LocationCache] Lookup called before cache loaded, returning null')
      return null
    }

    const normalized = this.normalize(variant)
    const result = this.cache.get(normalized)

    if (!result) {
      return null
    }

    // Return without internal metadata
    return {
      countryCode: result.countryCode,
      regionCountryCode: result.regionCountryCode,
      regionCode: result.regionCode,
      municipalityCountryCode: result.municipalityCountryCode,
      municipalityRegionCode: result.municipalityRegionCode,
      municipalityCode: result.municipalityCode
    }
  }

  /**
   * Refresh the cache by reloading from database
   * Useful after admin adds new location mappings
   */
  async refresh(): Promise<void> {
    this.loaded = false
    await this.load()
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    return {
      loaded: this.loaded,
      count: this.cache.size,
      size: this.cache.size, // Keep for backwards compatibility
      loadedAt: this.loadedAt?.toISOString() || null,
      version: this.version,
      variants: Array.from(this.cache.keys()).slice(0, 10) // Sample of variants
    }
  }

  /**
   * Check if cache is ready for use
   */
  isReady(): boolean {
    return this.loaded
  }
}

// Singleton instance - shared across the application
export const locationCache = new LocationLookupCache()
