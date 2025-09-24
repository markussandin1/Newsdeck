import { NextRequest, NextResponse } from 'next/server'
import { NewsItem } from '@/lib/types'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // DEBUG: Log what we receive
    console.log('🔍 DEBUG - Workflow API received:', JSON.stringify(body, null, 2))

    // Support both old and new schema
    let columnId, workflowId, rawItems, extraData

    if (body.events && Array.isArray(body.items)) {
      // New schema with events wrapper
      const eventColumnId = typeof body.events.columnId === 'string'
        ? body.events.columnId.trim()
        : body.events.columnId
      const eventWorkflowId = typeof body.events.workflowId === 'string'
        ? body.events.workflowId.trim()
        : body.events.workflowId

      columnId = eventColumnId || undefined
      workflowId = eventWorkflowId || undefined
      rawItems = body.items
      extraData = body.extra || {}
    } else {
      // Legacy schema
      columnId = typeof body.columnId === 'string'
        ? body.columnId.trim() || undefined
        : body.columnId
      workflowId = typeof body.workflowId === 'string'
        ? body.workflowId.trim() || undefined
        : undefined
      if (!workflowId && typeof body.flowId === 'string') {
        workflowId = body.flowId.trim() || undefined
      } else if (!workflowId) {
        workflowId = body.flowId
      }
      rawItems = body.items
      extraData = body.extra || {}
    }

    // Validate that we have either columnId or workflowId
    if (!columnId && !workflowId) {
      return NextResponse.json(
        { error: 'Either columnId or workflowId is required in events object' },
        { status: 400 }
      )
    }

    if (!rawItems || !Array.isArray(rawItems)) {
      return NextResponse.json(
        { error: 'items array is required in request body' },
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

      // Create NewsItem with appropriate workflowId and flowId
      const newsItem: NewsItem = {
        id: item.id,
        dbId: uuidv4(), // Generate unique UUID for this database entry
        workflowId: columnId || workflowId, // Use columnId if provided, otherwise workflowId
        flowId: workflowId, // Store the workflow UUID if provided
        source: item.source || 'workflows',
        timestamp: item.timestamp || new Date().toISOString(),
        title: item.title,
        description: item.description,
        newsValue: item.newsValue ?? 3,
        category: item.category,
        severity: item.severity,
        location: item.location,
        extra: {
          ...(item.extra || {}),
          ...(extraData || {}) // Merge top-level extra data
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

    // Find columns that are configured to listen to this workflowId
    const dashboards = await db.getDashboards()
    const matchingColumns: string[] = []

    // If columnId is provided directly, use it
    if (columnId) {
      matchingColumns.push(columnId)
      console.log(`🎯 WORKFLOW: Direct column targeting - columnId ${columnId}`)
    } else if (workflowId) {
      // Find columns that are configured to listen to this workflowId
      for (const dashboard of dashboards) {
        for (const column of dashboard.columns || []) {
          if (column.flowId === workflowId) {
            matchingColumns.push(column.id)
          }
        }
      }
      console.log(`🔗 WORKFLOW: Found ${matchingColumns.length} columns listening to workflowId ${workflowId}`)
    }

    // Store items in matching column-specific storage
    let totalColumnsUpdated = 0
    for (const columnId of matchingColumns) {
      const existingItems = await db.getColumnData(columnId) || []
      console.log(`🔍 DEBUG - Existing items in column ${columnId}:`, existingItems.length)

      const allItems = [...existingItems, ...itemsWithTimestamp]
      console.log(`🔍 DEBUG - Total items after adding new:`, allItems.length)

      await db.setColumnData(columnId, allItems)
      console.log(`🔍 DEBUG - Successfully stored ${allItems.length} items to column ${columnId}`)
      totalColumnsUpdated++
    }

    // Also add to general news storage for admin/debugging
    await db.addNewsItems(itemsWithTimestamp)

    return NextResponse.json({
      success: true,
      message: `Added ${validatedItems.length} items for ${columnId ? `columnId ${columnId}` : `workflowId ${workflowId}`}. Updated ${totalColumnsUpdated} columns.`,
      columnId,
      workflowId,
      itemsAdded: validatedItems.length,
      columnsUpdated: totalColumnsUpdated,
      matchingColumns
    })

  } catch (error) {
    console.error('Error processing workflow items:', error)
    return NextResponse.json(
      { error: 'Invalid JSON format' },
      { status: 400 }
    )
  }
}
