import { NextRequest, NextResponse } from 'next/server'

import { ingestNewsItems, IngestionError } from '@/lib/services/ingestion'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { verifyApiKey, unauthorizedResponse } from '@/lib/api-auth'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'

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

  // Extract workflowId from body for rate limiting
  const workflowId = (body && typeof body === 'object' && 'workflowId' in body)
    ? (body as { workflowId?: string }).workflowId
    : null

  // Check rate limit
  const rateLimitIdentifier = getRateLimitIdentifier(workflowId, ipAddress)
  const rateLimit = await checkRateLimit(rateLimitIdentifier)

  if (!rateLimit.success) {
    logger.warn('api.workflows.rateLimited', {
      identifier: rateLimitIdentifier,
      limit: rateLimit.limit,
      reset: new Date(rateLimit.reset).toISOString()
    })

    // Log rate limit error
    await db.logApiRequest({
      endpoint: '/api/workflows',
      method: 'POST',
      statusCode: 429,
      success: false,
      errorMessage: `Rate limit exceeded: ${rateLimit.limit} requests per minute`,
      ipAddress,
      userAgent,
      requestBody: body
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${rateLimit.limit} requests per minute. Try again in ${Math.ceil((rateLimit.reset - Date.now()) / 1000)} seconds.`,
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        reset: rateLimit.reset
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimit.limit.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.reset.toString(),
          'Retry-After': Math.ceil((rateLimit.reset - Date.now()) / 1000).toString()
        }
      }
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
