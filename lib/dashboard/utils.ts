/**
 * Dashboard utility functions
 *
 * Helper functions extracted from DashboardView.tsx for reusability
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

