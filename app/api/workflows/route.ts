import { NextRequest, NextResponse } from 'next/server'

import { ingestNewsItems, IngestionError } from '@/lib/services/ingestion'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Check API key authentication
  if (!verifyApiKey(request)) {
    // Log unauthorized attempt
    await db.logApiRequest({
      endpoint: '/api/workflows',
      method: 'POST',
      statusCode: 401,
      success: false,
      errorMessage: 'Unauthorized - invalid or missing API key',
      ipAddress,
      userAgent
    })
    return unauthorizedResponse()
  }

  let body: unknown

  try {
    body = await request.json()
  } catch (error) {
    logger.warn('api.workflows.invalidJson', { error })

    // Log JSON parse error
    await db.logApiRequest({
      endpoint: '/api/workflows',
      method: 'POST',
      statusCode: 400,
      success: false,
      errorMessage: 'Request body must be valid JSON',
      ipAddress,
      userAgent
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Request body must be valid JSON'
      },
      { status: 400 }
    )
  }

  try {
    const result = await ingestNewsItems(body, db)
    logger.info('api.workflows.success', {
      columnId: result.columnId,
      workflowId: result.workflowId,
      itemsAdded: result.itemsAdded,
      columnsUpdated: result.columnsUpdated,
      matchingColumns: result.matchingColumns,
      columnTotals: result.columnTotals
    })

    // Real-time updates now handled via Pub/Sub + event queue in ingestion service

    const response = {
      success: true,
      message: 'Workflow payload processed',
      ...result
    }

    // Log successful request
    await db.logApiRequest({
      endpoint: '/api/workflows',
      method: 'POST',
      statusCode: 200,
      success: true,
      requestBody: body,
      responseBody: response,
      ipAddress,
      userAgent
    })

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof IngestionError) {
      logger.warn('api.workflows.validationError', { error: error.message })

      // Log validation error
      await db.logApiRequest({
        endpoint: '/api/workflows',
        method: 'POST',
        statusCode: error.status,
        success: false,
        requestBody: body,
        errorMessage: error.message,
        ipAddress,
        userAgent
      })

      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      )
    }

    logger.error('api.workflows.unexpectedError', { error })

    // Log unexpected error
    await db.logApiRequest({
      endpoint: '/api/workflows',
      method: 'POST',
      statusCode: 500,
      success: false,
      requestBody: body,
      errorMessage: error instanceof Error ? error.message : 'Unexpected server error',
      ipAddress,
      userAgent
    })

    return NextResponse.json(
      { success: false, error: 'Unexpected server error' },
      { status: 500 }
    )
  }
}
