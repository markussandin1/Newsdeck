import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import testData from '@/testdata.json'

export async function POST() {
  try {
    // Load test data into the general storage first
    const newsItems = testData.items.map(item => ({
      ...item,
      timestamp: item.timestamp
    }))
    
    db.addNewsItems(newsItems as any)
    
    // Create some sample column data for testing
    const sampleColumns = [
      { id: 'col-emergency', workflowId: 'workflow-emergency' },
      { id: 'col-police', workflowId: 'workflow-police' },
      { id: 'col-weather', workflowId: 'workflow-weather' }
    ]
    
    // Populate column data based on workflow
    for (const column of sampleColumns) {
      const columnItems = newsItems.filter(item => item.workflowId === column.workflowId)
      db.setColumnData(column.id, columnItems as any)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test column data loaded successfully',
      itemsLoaded: newsItems.length,
      columnsPopulated: sampleColumns.length
    })
    
  } catch (error) {
    console.error('Error loading test column data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}