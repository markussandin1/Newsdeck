import { NextRequest, NextResponse } from 'next/server'
import { NewsItem } from '@/lib/types'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // DEBUG: Log what we actually receive
    console.log('🔍 DEBUG - Received body:', JSON.stringify(body, null, 2))
    console.log('🔍 DEBUG - Body type:', typeof body)
    console.log('🔍 DEBUG - Is array:', Array.isArray(body))
    
    // Handle both single item and array of items
    let items = Array.isArray(body) ? body : [body]
    
    // WORKAROUND: Handle object with numeric keys (from postToNewsdeck function)
    if (typeof body === 'object' && !Array.isArray(body) && body !== null) {
      const keys = Object.keys(body)
      if (keys.every(key => /^\d+$/.test(key))) {
        items = Object.values(body)
        console.log('🔧 WORKAROUND: Converted object with numeric keys to array')
      }
    }
    const validatedItems: NewsItem[] = []
    
    for (const item of items) {
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
        workflowId: id, // Use column ID as workflow ID
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
    
    // Store items in column-specific storage
    await db.setColumnData(id, validatedItems)
    
    // Also add to general news storage for admin/debugging
    await db.addNewsItems(validatedItems)
    
    return NextResponse.json({
      success: true,
      message: `Added ${validatedItems.length} items to column ${id}`,
      columnId: id,
      itemsAdded: validatedItems.length
    })
    
  } catch (error) {
    console.error('Error adding items to column:', error)
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { title, description } = await request.json()
    
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }
    
    // In a real app, you'd update the column in a database
    // For now, we'll just return success since columns are managed in the dashboard
    
    return NextResponse.json({
      success: true,
      message: `Column ${id} updated successfully`,
      columnId: id,
      title: title.trim(),
      description: description?.trim() || undefined
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