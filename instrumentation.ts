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
    // Check database connection on startup (for local development)
    if (process.env.DATABASE_URL?.includes('localhost:5432')) {
      const { getDetailedDatabaseHealth } = await import('./lib/db-health')

      try {
        const health = await getDetailedDatabaseHealth()

        if (!health.connected && health.proxyRequired) {
          console.error('')
          console.error('╔════════════════════════════════════════════════════════╗')
          console.error('║  ⚠️  DATABASE CONNECTION ERROR                         ║')
          console.error('╚════════════════════════════════════════════════════════╝')
          console.error('')
          console.error('❌ Cloud SQL Proxy is not running!')
          console.error('')
          console.error('The application requires Cloud SQL Proxy to connect to')
          console.error('the production database when developing locally.')
          console.error('')
          console.error('🚀 Start it with:')
          console.error('   npm run proxy:start')
          console.error('')
          console.error('💡 Or use the all-in-one dev command:')
          console.error('   npm run dev:full')
          console.error('')
          console.error('📚 For more help, see: docs/LOCAL_DEVELOPMENT.md')
          console.error('')
        }
      } catch (error) {
        console.error('[Instrumentation] Failed to check database health:', error)
      }
    }

    // Start background image upload worker
    try {
      const { startImageUploadWorker } = await import('./lib/services/image-upload-worker')
      startImageUploadWorker().catch(error => {
        console.error('[Instrumentation] Image upload worker crashed:', error)
      })
    } catch (error) {
      console.error('[Instrumentation] Failed to start image upload worker:', error)
    }
  }
}
