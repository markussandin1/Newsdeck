/**
 * In-memory sliding-window rate limiting for API endpoints.
 *
 * Tidigare implementation gjorde BEGIN/DELETE/SELECT/INSERT/COMMIT mot
 * PostgreSQL för varje request → hundratals onödiga transaktioner per
 * minut under last. Eftersom Cloud Run är konfigurerad med max-instances=1
 * räcker en process-lokal Map som store.
 *
 * VIKTIGT: Om max-instances höjs över 1 måste detta flyttas till en delad
 * store (Redis/Upstash) eller per-instance-limits blir per-instans i stället
 * för globalt.
 */

const RATE_LIMIT_MAX_REQUESTS = 500
const RATE_LIMIT_WINDOW_MS = 60 * 1000

// identifier → array of millisecond timestamps inom nuvarande fönster.
const requestLog = new Map<string, number[]>()

// Periodisk GC så identifierar som blir tysta inte ackumulerar minne.
// Map:en är vanligtvis bara några hundra entries så kostnaden är minimal.
const GC_INTERVAL_MS = 5 * 60 * 1000
let gcTimer: ReturnType<typeof setInterval> | null = null
function ensureGc() {
  if (gcTimer) return
  gcTimer = setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS
    Array.from(requestLog.entries()).forEach(([key, timestamps]) => {
      const fresh = timestamps.filter(t => t >= cutoff)
      if (fresh.length === 0) {
        requestLog.delete(key)
      } else {
        requestLog.set(key, fresh)
      }
    })
  }, GC_INTERVAL_MS)
  // Don't keep the process alive just for the GC timer
  if (typeof gcTimer === 'object' && 'unref' in gcTimer) {
    ;(gcTimer as { unref: () => void }).unref()
  }
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for a given identifier.
 *
 * @param identifier - Unique identifier (e.g., IP address, workflow ID)
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  ensureGc()

  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const resetTime = now + RATE_LIMIT_WINDOW_MS

  const existing = requestLog.get(identifier) || []
  // Filter out timestamps äldre än fönstret
  const fresh = existing.filter(t => t >= cutoff)

  if (fresh.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(identifier, fresh)
    return {
      success: false,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: 0,
      reset: resetTime,
    }
  }

  fresh.push(now)
  requestLog.set(identifier, fresh)

  return {
    success: true,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - fresh.length),
    reset: resetTime,
  }
}

/**
 * Get the identifier for rate limiting.
 * Uses workflow ID if available (for internal workflows),
 * falls back to IP address.
 */
export function getRateLimitIdentifier(
  workflowId: string | null | undefined,
  ipAddress: string
): string {
  if (workflowId) {
    return `workflow:${workflowId}`
  }
  return `ip:${ipAddress}`
}

// Test-only helper. Återställer state mellan tester utan att exponera Map:en.
export function __resetRateLimitForTests(): void {
  requestLog.clear()
}
