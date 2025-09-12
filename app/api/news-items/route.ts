import { NextRequest, NextResponse } from 'next/server'
import { NewsItem } from '@/lib/types'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate if it's a single item or array
    const items: NewsItem[] = Array.isArray(body) ? body : [body]
    
    // Basic validation
    for (const item of items) {
      if (!item.id || !item.workflowId || !item.source || !item.timestamp || !item.title) {
        return NextResponse.json(
          { error: 'Missing required fields: id, workflowId, source, timestamp, title' },
          { status: 400 }
        )
      }
      
      if (!item.newsValue || item.newsValue < 1 || item.newsValue > 5) {
        return NextResponse.json(
          { error: 'newsValue must be between 1 and 5' },
          { status: 400 }
        )
      }
      
      // Validate timestamp format
      if (isNaN(new Date(item.timestamp).getTime())) {
        return NextResponse.json(
          { error: 'Invalid timestamp format. Use ISO 8601 format.' },
          { status: 400 }
        )
      }
    }
    
    // Save to database
    db.addNewsItems(items)
    
    return NextResponse.json({
      success: true,
      message: `${items.length} news item(s) added successfully`,
      items
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
    const items = db.getNewsItems()
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