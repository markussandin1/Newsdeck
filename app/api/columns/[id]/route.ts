import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyApiKey, unauthorizedResponse, verifySession, sessionUnauthorizedResponse } from '@/lib/api-auth'

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check API key authentication (skip in development)
  if (process.env.NODE_ENV !== 'development' && !verifyApiKey(request)) {
    return unauthorizedResponse()
  }
  try {
    const { id } = await params

    // Validate UUID format to prevent injection attacks
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid column ID format' },
        { status: 400 }
      )
    }

    const columnData = await db.getColumnData(id)

    return NextResponse.json({
      success: true,
      columnId: id,
      items: columnData,
      count: columnData.length
    })
  } catch (error) {
    console.error('Error fetching column data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint removed - use /api/workflows instead
// This endpoint is deprecated in favor of the workflow-based ingestion system

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check session authentication (for internal UI operations)
  const isAuthenticated = await verifySession()
  if (!isAuthenticated) {
    return sessionUnauthorizedResponse()
  }

  try {
    const { id } = await params
    const { title, description, flowId } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Update the column in the dashboard
    const dashboards = await db.getDashboards()
    let columnUpdated = false

    for (const dashboard of dashboards) {
      for (const column of dashboard.columns || []) {
        if (column.id === id) {
          column.title = title.trim()
          column.description = description?.trim() || undefined
          if (flowId !== undefined) {
            column.flowId = flowId?.trim() || undefined
          }
          columnUpdated = true
          break
        }
      }
      if (columnUpdated) {
        await db.updateDashboard(dashboard.id, dashboard)
        break
      }
    }

    if (!columnUpdated) {
      return NextResponse.json(
        { error: 'Column not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Column ${id} updated successfully`,
      columnId: id,
      title: title.trim(),
      description: description?.trim() || undefined,
      flowId: flowId?.trim() || undefined
    })

  } catch (error) {
    console.error('Error updating column:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check session authentication (for internal UI operations)
  const isAuthenticated = await verifySession()
  if (!isAuthenticated) {
    return sessionUnauthorizedResponse()
  }

  try {
    const { id } = await params

    // Clear column data
    await db.setColumnData(id, [])

    return NextResponse.json({
      success: true,
      message: `Cleared all data from column ${id}`,
      columnId: id
    })

  } catch (error) {
    console.error('Error clearing column data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
