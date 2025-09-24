import { NextRequest, NextResponse } from 'next/server'
import { NewsItem } from '@/lib/types'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // DEBUG: Log what we receive
    console.log('🔍 DEBUG - News items API received:', JSON.stringify(body, null, 2))
    
    // Support both legacy payloads and the new events schema
    let columnId: string | undefined = typeof body.columnId === 'string'
      ? body.columnId.trim() || undefined
      : body.columnId
    let workflowId: string | undefined = typeof body.workflowId === 'string'
      ? body.workflowId.trim() || undefined
      : undefined
    let rawItems = body.items
    let extraData = body.extra || {}

    if (body.events && Array.isArray(body.items)) {
      const eventColumnId = typeof body.events.columnId === 'string'
        ? body.events.columnId.trim()
        : body.events.columnId
      const eventWorkflowId = typeof body.events.workflowId === 'string'
        ? body.events.workflowId.trim()
        : body.events.workflowId

      columnId = eventColumnId || columnId
      workflowId = eventWorkflowId || workflowId
      rawItems = body.items
      extraData = body.extra || {}
    } else if (!workflowId && typeof body.flowId === 'string') {
      workflowId = body.flowId.trim() || undefined
    }

    if (!columnId && !workflowId) {
      return NextResponse.json(
        { error: 'Either columnId or workflowId is required in request body' },
        { status: 400 }
      )
    }

    if (!rawItems || !Array.isArray(rawItems)) {
      return NextResponse.json(
        { error: 'items array is required in request body' },
        { status: 400 }
      )
    }

    const resolvedWorkflowId = columnId || workflowId
    if (!resolvedWorkflowId) {
      return NextResponse.json(
        { error: 'Unable to resolve workflow or column identifier from payload' },
        { status: 400 }
      )
    }

    const validatedItems: NewsItem[] = []

    for (const item of rawItems) {
      // Basic validation
      if (!item.id || !item.title) {
        return NextResponse.json(
          { error: 'Each item must have id and title' },
          { status: 400 }
        )
      }

      // Create NewsItem with workflow/column identifiers resolved from payload
      const newsItem: NewsItem = {
        id: item.id,
        dbId: uuidv4(), // Generate unique UUID for this database entry
        workflowId: resolvedWorkflowId,
        flowId: item.flowId || workflowId, // UUID från workflow-applikationen (om tillgänglig)
        source: item.source || 'workflows',
        url: item.URL || item.url || (typeof item.source === 'string' && item.source.startsWith('http') ? item.source : undefined),
        timestamp: item.timestamp || new Date().toISOString(),
        title: item.title,
        description: item.description,
        newsValue: item.newsValue ?? 3,
        category: item.category,
        severity: item.severity,
        location: item.location,
        extra: {
          ...(item.extra || {}),
          ...(extraData || {})
        },
        raw: item
      }

      validatedItems.push(newsItem)
    }

    // Add createdInDb timestamp to items before storing
    const currentTime = new Date().toISOString()
    const itemsWithTimestamp = validatedItems.map(item => ({
      ...item,
      createdInDb: currentTime
    }))

    const matchingColumns = new Set<string>()

    if (columnId) {
      matchingColumns.add(columnId)
      console.log(`🎯 NEWS ITEMS: Direct column targeting - columnId ${columnId}`)
    } else if (workflowId) {
      const dashboards = await db.getDashboards()
      for (const dashboard of dashboards) {
        for (const column of dashboard.columns || []) {
          if (column.flowId === workflowId) {
            matchingColumns.add(column.id)
          }
        }
      }
      console.log(`🔗 NEWS ITEMS: Found ${matchingColumns.size} columns listening to workflowId ${workflowId}`)
    }

    let totalColumnsUpdated = 0
    const columnResults: Record<string, number> = {}

    for (const targetColumnId of Array.from(matchingColumns)) {
      const existingItems = await db.getColumnData(targetColumnId) || []
      console.log(`🔍 DEBUG - Existing items in column ${targetColumnId}:`, existingItems.length)

      const allItems = [...existingItems, ...itemsWithTimestamp]
      console.log(`🔍 DEBUG - Total items after adding new:`, allItems.length)

      await db.setColumnData(targetColumnId, allItems)
      columnResults[targetColumnId] = allItems.length
      console.log(`🔍 DEBUG - Successfully stored ${allItems.length} items to column ${targetColumnId}`)
      totalColumnsUpdated++
    }

    // Also add to general news storage for admin/debugging (items already have createdInDb)
    await db.addNewsItems(itemsWithTimestamp)

    return NextResponse.json({
      success: true,
      message: `Added ${validatedItems.length} items for ${columnId ? `columnId ${columnId}` : `workflowId ${workflowId}`}. Updated ${totalColumnsUpdated} columns.`,
      columnId,
      workflowId,
      itemsAdded: validatedItems.length,
      columnsUpdated: totalColumnsUpdated,
      matchingColumns: Array.from(matchingColumns),
      columnTotals: columnResults
    })
    
  } catch (error) {
    console.error('Error processing news items:', error)
    return NextResponse.json(
      { error: 'Invalid JSON format' },
      { status: 400 }
    )
  }
}

export async function GET() {
  try {
    const items = await db.getNewsItems()
    return NextResponse.json({
      success: true,
      count: items.length,
      items
    })
  } catch (error) {
    console.error('Error fetching news items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { dbId } = body

    if (!dbId) {
      return NextResponse.json(
        { error: 'Item dbId is required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ DELETE - Attempting to delete news item with dbId: ${dbId}`)
    console.log(`🗑️ DELETE - db.deleteNewsItem function exists: ${typeof db.deleteNewsItem}`)

    // Remove from general news storage using dbId
    const deleted = await db.deleteNewsItem(dbId)
    console.log(`🗑️ DELETE - db.deleteNewsItem returned: ${deleted}`)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    console.log(`🗑️ DELETE - Successfully deleted news item: ${dbId}`)

    return NextResponse.json({
      success: true,
      message: `Deleted item ${dbId}`,
      dbId
    })

  } catch (error) {
    console.error('Error deleting news item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
