/**
 * Next.js Instrumentation
 * Runs once when the server starts (before any requests are handled)
 * Perfect for initializing secrets from GCP Secret Manager
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on Node.js runtime (not Edge)
    const { initializeApplicationSecrets } = await import('./lib/init-secrets')
    await initializeApplicationSecrets()
  }
}
