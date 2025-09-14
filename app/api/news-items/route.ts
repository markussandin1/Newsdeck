import { NextRequest, NextResponse } from 'next/server'
import { NewsItem } from '@/lib/types'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // DEBUG: Log what we receive
    console.log('🔍 DEBUG - News items API received:', JSON.stringify(body, null, 2))
    
    // Extract columnId and items from payload
    const { columnId, items: rawItems } = body
    
    if (!columnId) {
      return NextResponse.json(
        { error: 'columnId is required in request body' },
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
      
      // Create NewsItem with column ID as workflowId for backward compatibility
      const newsItem: NewsItem = {
        id: item.id,
        workflowId: columnId, // Use column ID as workflow ID
        source: item.source || 'workflows',
        timestamp: item.timestamp || new Date().toISOString(),
        title: item.title,
        description: item.description,
        newsValue: item.newsValue ?? 3,
        category: item.category,
        severity: item.severity,
        location: item.location,
        extra: item.extra,
        raw: item.raw
      }
      
      validatedItems.push(newsItem)
    }
    
    // Store items in column-specific storage - append to existing items
    const existingItems = await db.getColumnData(columnId) || []
    console.log(`🔍 DEBUG - Existing items in column ${columnId}:`, existingItems.length)
    
    const allItems = [...existingItems, ...validatedItems]
    console.log(`🔍 DEBUG - Total items after adding new:`, allItems.length)
    
    await db.setColumnData(columnId, allItems)
    console.log(`🔍 DEBUG - Successfully stored ${allItems.length} items to column ${columnId}`)
    
    // Also add to general news storage for admin/debugging
    await db.addNewsItems(validatedItems)
    
    return NextResponse.json({
      success: true,
      message: `Added ${validatedItems.length} items to column ${columnId}. Total items in column: ${allItems.length}`,
      columnId,
      itemsAdded: validatedItems.length,
      totalItems: allItems.length
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