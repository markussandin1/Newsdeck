// API Key authentication for external services
import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { secrets } from './secrets'

/**
 * Verify API key from request headers
 * Supports both Authorization header and x-api-key header
 */
export async function verifyApiKey(request: NextRequest): Promise<boolean> {
  const apiKey = process.env.NODE_ENV === 'production'
    ? await secrets.getApiKey()
    : process.env.API_KEY

  if (!apiKey) {
    console.error('API_KEY is not configured')
    return false
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    return token === apiKey
  }

  // Check x-api-key header
  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader === apiKey) {
    return true
  }

  return false
}

/**
 * Verify user session for internal operations
 */
export async function verifySession(): Promise<boolean> {
  const session = await auth()
  return !!session?.user
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'Valid API key required. Use Authorization: Bearer <key> or x-api-key: <key> header'
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Create unauthorized response for session-based auth
 */
export function sessionUnauthorizedResponse() {
  return new Response(
    JSON.stringify({
      error: 'Unauthorized',
      message: 'You must be logged in to perform this action'
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}