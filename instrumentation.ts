/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically called by Next.js once when the server starts.
 * It's the perfect place to initialize server-side caches and connections.
 *
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { locationCache } = await import('./lib/services/location-cache')

    try {
      console.log('[Instrumentation] Loading location cache...')
      await locationCache.load()
      console.log('[Instrumentation] ✅ Location cache loaded successfully')
    } catch (error) {
      console.error('[Instrumentation] ❌ Failed to load location cache:', error)
      // Don't throw - allow server to start even if cache loading fails
      // The ingestion pipeline will gracefully handle cache not being ready
    }
  }
}
