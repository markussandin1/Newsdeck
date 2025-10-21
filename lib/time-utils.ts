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
