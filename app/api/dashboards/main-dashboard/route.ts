import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { NewsItem, GeoFilters } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    // Parse geographic filter parameters from query string
    const { searchParams } = new URL(request.url)
    const geoFilters: GeoFilters | undefined = (() => {
      const regionCodes = searchParams.getAll('regionCode')
      const municipalityCodes = searchParams.getAll('municipalityCode')
      const showItemsWithoutLocation = searchParams.get('showItemsWithoutLocation') === 'true'

      // Only create filter object if filters are active
      if (regionCodes.length > 0 || municipalityCodes.length > 0) {
        return { regionCodes, municipalityCodes, showItemsWithoutLocation }
      }
      return undefined
    })()

    const dashboard = await db.getMainDashboard()

    // Fetch column data for all columns in the dashboard
    // Limit to 500 most recent items per column for performance
    const COLUMN_ITEM_LIMIT = 500
    const columnData: Record<string, NewsItem[]> = {}

    if (dashboard.columns) {
      for (const column of dashboard.columns) {
        try {
          const items = await db.getColumnData(column.id, COLUMN_ITEM_LIMIT, geoFilters) || []
          columnData[column.id] = items
        } catch (error) {
          console.error(`Error fetching data for column ${column.id}:`, error)
          columnData[column.id] = []
        }
      }
    }

    return NextResponse.json({
      success: true,
      dashboard,
      columnData
    })
  } catch (error) {
    console.error('Error fetching main dashboard with column data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const result = await db.updateDashboard('main-dashboard', body)

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to update dashboard' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      dashboard: result
    })
  } catch (error) {
    console.error('Error updating main dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
