/**
 * Formats a timestamp for compact display in news cards
 * - Today: shows only time (14:30)
 * - Yesterday: shows "Igår HH:mm"
 * - Older: shows date and time (okt 20 14:30)
 */
export function formatCompactTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()

  // Set both dates to midnight for day comparison
  const dateAtMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nowAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Calculate difference in days
  const diffTime = nowAtMidnight.getTime() - dateAtMidnight.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  const timeStr = date.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm'
  })

  if (diffDays === 0) {
    // Today - show only time
    return timeStr
  } else if (diffDays === 1) {
    // Yesterday
    return `Igår ${timeStr}`
  } else {
    // Older - show date and time
    const dateStr = date.toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric',
      timeZone: 'Europe/Stockholm'
    })
    return `${dateStr} ${timeStr}`
  }
}

/**
 * Formats a timestamp for full display in modals and detailed views
 */
export function formatFullTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Stockholm'
  })
}

/**
 * Checks if a string value is a valid URL
 */
export function isUrl(value?: string | null): boolean {
  if (!value) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/**
 * Extracts hostname from a URL, removing www. prefix
 */
export function getHostname(value: string): string {
  try {
    const hostname = new URL(value).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return value
  }
}

/**
 * Check if a news item should be marked as "new" based on its creation time.
 * An item is considered "new" if it was created in the database less than 1 minute ago.
 *
 * @param createdInDb ISO 8601 timestamp when the item was created in the database
 * @returns true if the item is less than 1 minute old
 */
export function isNewsItemNew(createdInDb?: string): boolean {
  if (!createdInDb) {
    return false
  }

  const now = new Date()
  const created = new Date(createdInDb)
  const ageInMilliseconds = now.getTime() - created.getTime()
  const ageInMinutes = ageInMilliseconds / (1000 * 60)

  return ageInMinutes < 1
}
