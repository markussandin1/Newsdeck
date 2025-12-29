/**
 * Location Mappings Admin API
 *
 * GET /api/admin/location-mappings - Get unmatched locations for review
 * POST /api/admin/location-mappings - Create a new location name mapping
 *
 * Used by the admin UI to manage location name variations and
 * improve data quality.
 *
 * TODO: Add authentication check for admin users
 */

import { NextRequest, NextResponse } from 'next/server'
import { persistentDb } from '@/lib/db-postgresql'
import { locationCache } from '@/lib/services/location-cache'

// GET - Fetch unmatched locations for admin review
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    const unmatchedLocations = await persistentDb.getUnmatchedLocations(limit)

    return NextResponse.json({
      success: true,
      data: unmatchedLocations,
      count: unmatchedLocations.length
    })
  } catch (error) {
    console.error('[Admin API] Failed to get unmatched locations:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch unmatched locations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Create a new location name mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.variant || typeof body.variant !== 'string') {
      return NextResponse.json(
        { success: false, error: 'variant is required and must be a string' },
        { status: 400 }
      )
    }

    if (!body.matchType || !['exact', 'fuzzy'].includes(body.matchType)) {
      return NextResponse.json(
        { success: false, error: 'matchType must be "exact" or "fuzzy"' },
        { status: 400 }
      )
    }

    // At least one target must be specified
    if (!body.countryCode && !body.regionCode && !body.municipalityCode) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one of countryCode, regionCode, or municipalityCode must be specified'
        },
        { status: 400 }
      )
    }

    // Determine priority based on specificity
    let matchPriority = body.matchPriority
    if (!matchPriority) {
      if (body.municipalityCode) {
        matchPriority = body.matchType === 'exact' ? 10 : 15
      } else if (body.regionCode) {
        matchPriority = body.matchType === 'exact' ? 20 : 25
      } else {
        matchPriority = body.matchType === 'exact' ? 30 : 35
      }
    }

    // Create mapping
    await persistentDb.createLocationMapping({
      variant: body.variant,
      countryCode: body.countryCode,
      regionCountryCode: body.regionCountryCode || body.countryCode,
      regionCode: body.regionCode,
      municipalityCountryCode: body.municipalityCountryCode || body.countryCode,
      municipalityRegionCode: body.municipalityRegionCode || body.regionCode,
      municipalityCode: body.municipalityCode,
      matchPriority,
      matchType: body.matchType
    })

    // Automatically refresh cache after creating mapping
    console.log('[Admin API] Refreshing location cache after creating mapping...')
    await locationCache.refresh()

    return NextResponse.json({
      success: true,
      message: 'Location mapping created successfully and cache refreshed',
      mapping: {
        variant: body.variant,
        matchType: body.matchType,
        matchPriority
      }
    })
  } catch (error) {
    console.error('[Admin API] Failed to create location mapping:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create location mapping',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
