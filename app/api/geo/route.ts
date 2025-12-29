/**
 * Geographic Metadata API
 *
 * Provides access to countries, regions (counties), and municipalities
 * for use in geographic filtering UI components.
 *
 * Endpoints:
 * - GET /api/geo?type=countries - Get all countries
 * - GET /api/geo?type=regions&countryCode=SE - Get regions for a country
 * - GET /api/geo?type=municipalities&countryCode=SE&regionCode=01 - Get municipalities for a region
 * - GET /api/geo?type=municipalities&countryCode=SE - Get all municipalities for a country
 *
 * Features:
 * - Rate limiting (100 requests per minute per IP)
 * - HTTP caching (24 hours public, 1 hour CDN)
 * - Returns 200 OK with data array or 400/500 on error
 */

import { NextRequest, NextResponse } from 'next/server'
import { persistentDb } from '@/lib/db-postgresql'

// Simple in-memory rate limiting cache
const rateLimitCache = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitCache.entries())
  for (const [key, value] of entries) {
    if (value.resetAt < now) {
      rateLimitCache.delete(key)
    }
  }
}, 5 * 60 * 1000)

function rateLimit(request: NextRequest, maxRequests: number = 100): boolean {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const key = `${ip}:${new URL(request.url).pathname}`
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute

  const entry = rateLimitCache.get(key)

  if (!entry || entry.resetAt < now) {
    // Create new entry
    rateLimitCache.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false // Rate limit exceeded
  }

  entry.count += 1
  return true
}

export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per minute per IP
  if (!rateLimit(request, 100)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const countryCode = searchParams.get('countryCode')
    const regionCode = searchParams.get('regionCode')

    let data

    if (!type) {
      // GET /api/geo - Return all geographic data
      const [countries, regions, municipalities] = await Promise.all([
        persistentDb.getCountries(),
        persistentDb.getRegionsByCountry('SE'), // Currently Sweden only
        persistentDb.getMunicipalitiesByCountry('SE')
      ])
      data = { countries, regions, municipalities }
    } else if (type === 'countries') {
      // GET /api/geo?type=countries
      data = await persistentDb.getCountries()
    } else if (type === 'regions' && countryCode) {
      // GET /api/geo?type=regions&countryCode=SE
      data = await persistentDb.getRegionsByCountry(countryCode)
    } else if (type === 'municipalities' && countryCode && regionCode) {
      // GET /api/geo?type=municipalities&countryCode=SE&regionCode=01
      data = await persistentDb.getMunicipalitiesByRegion(countryCode, regionCode)
    } else if (type === 'municipalities' && countryCode) {
      // GET /api/geo?type=municipalities&countryCode=SE
      data = await persistentDb.getMunicipalitiesByCountry(countryCode)
    } else {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          usage: {
            all: '/api/geo',
            countries: '/api/geo?type=countries',
            regions: '/api/geo?type=regions&countryCode=SE',
            municipalities: '/api/geo?type=municipalities&countryCode=SE&regionCode=01',
            allMunicipalities: '/api/geo?type=municipalities&countryCode=SE'
          }
        },
        { status: 400 }
      )
    }

    return NextResponse.json(data, {
      headers: {
        'Content-Type': 'application/json',
        // Cache for 5 minutes (public), must-revalidate to prevent stale data
        'Cache-Control': 'public, max-age=300, must-revalidate',
        // CDN-level caching (5 minutes)
        'CDN-Cache-Control': 'public, max-age=300'
      }
    })
  } catch (error) {
    console.error('[API /api/geo] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
