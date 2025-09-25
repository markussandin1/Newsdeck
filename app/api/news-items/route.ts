import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ingestNewsItems, IngestionError } from '@/lib/services/ingestion'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch (error) {
    logger.warn('api.news-items.invalidJson', { error })
    return NextResponse.json(
      { success: false, error: 'Request body must be valid JSON' },
      { status: 400 }
    )
  }

  try {
    const result = await ingestNewsItems(body, db)
    const descriptor = result.columnId
      ? `column ${result.columnId}`
      : `workflow ${result.workflowId}`

    logger.info('api.news-items.success', {
      columnId: result.columnId,
      workflowId: result.workflowId,
      itemsAdded: result.itemsAdded,
      columnsUpdated: result.columnsUpdated,
      matchingColumns: result.matchingColumns,
      columnTotals: result.columnTotals
    })
    return NextResponse.json({
      success: true,
      message: `Added ${result.itemsAdded} items for ${descriptor}. Updated ${result.columnsUpdated} columns.`,
      ...result
    })
  } catch (error) {
    if (error instanceof IngestionError) {
      logger.warn('api.news-items.validationError', { error: error.message })
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    logger.error('api.news-items.unexpectedError', { error })
    return NextResponse.json(
      { success: false, error: 'Unexpected server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const items = await db.getNewsItems()
    logger.debug('api.news-items.getSuccess', { count: items.length })
    return NextResponse.json({
      success: true,
      count: items.length,
      items
    })
  } catch (error) {
    logger.error('api.news-items.getError', { error })
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
    const deleted = await db.deleteNewsItem(dbId)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }
    logger.info('api.news-items.deleted', { dbId })
    return NextResponse.json({
      success: true,
      message: `Deleted item ${dbId}`,
      dbId
    })

  } catch (error) {
    logger.error('api.news-items.deleteError', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
