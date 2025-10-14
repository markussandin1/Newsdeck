/**
 * Dashboard utility functions
 *
 * Helper functions extracted from MainDashboard.tsx for reusability
 * and better testability.
 */

/**
 * Type guard to check if a value is a Record (object with string keys)
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Deep equality comparison for objects and arrays
 * Used for detecting actual changes in dashboard data
 */
export const deepEqual = (obj1: unknown, obj2: unknown): boolean => {
  if (Object.is(obj1, obj2)) return true

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false
    return obj1.every((value, index) => deepEqual(value, obj2[index]))
  }

  if (isRecord(obj1) && isRecord(obj2)) {
    const keys1 = Object.keys(obj1)
    const keys2 = Object.keys(obj2)

    if (keys1.length !== keys2.length) return false

    return keys1.every(key => deepEqual(obj1[key], obj2[key]))
  }

  return false
}

/**
 * Extract workflow ID from a URL or return the input as-is
 *
 * Examples:
 * - "https://workflows.example.com/workflows/abc-123" -> "abc-123"
 * - "abc-123" -> "abc-123"
 */
export const extractWorkflowId = (input: string): string => {
  const trimmed = input.trim()

  // If it looks like a URL, extract the UUID from it
  if (trimmed.includes('://') || trimmed.includes('/workflows/')) {
    // Match UUID pattern (8-4-4-4-12 hex digits)
    const uuidMatch = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
    if (uuidMatch) {
      return uuidMatch[1]
    }

    // Fallback: take last segment after /
    const segments = trimmed.split('/')
    return segments[segments.length - 1]
  }

  // Otherwise return as-is (already a UUID or custom ID)
  return trimmed
}
