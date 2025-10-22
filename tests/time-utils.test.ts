import { strict as assert } from 'node:assert'
import { test, describe } from 'node:test'
import { formatCompactTime, formatFullTime, isUrl, getHostname, isNewsItemNew } from '../lib/time-utils'

describe('formatCompactTime', () => {
  test('shows only time for today', () => {
    const now = new Date()
    now.setHours(14, 30, 0, 0)

    const result = formatCompactTime(now.toISOString())

    // Should show time only (HH:mm format)
    assert.match(result, /^\d{2}:\d{2}$/)
    assert.equal(result, '14:30')
  })

  test('shows "Igår HH:mm" for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(14, 30, 0, 0)

    const result = formatCompactTime(yesterday.toISOString())

    // Should show "Igår" followed by time
    assert.match(result, /^Igår \d{2}:\d{2}$/)
    assert.ok(result.startsWith('Igår'))
    assert.ok(result.includes('14:30'))
  })

  test('shows date and time for 2 days ago', () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    twoDaysAgo.setHours(14, 30, 0, 0)

    const result = formatCompactTime(twoDaysAgo.toISOString())

    // Swedish locale uses format: "19 okt. 14:30" (day month time)
    assert.match(result, /^\d{1,2} \w{3,5}\.? \d{2}:\d{2}$/)
    assert.ok(result.includes('14:30'))
  })

  test('shows date and time for old dates', () => {
    const oldDate = new Date('2025-01-15T14:30:00Z')

    const result = formatCompactTime(oldDate.toISOString())

    // Swedish locale uses format: "15 jan. 14:30"
    assert.match(result, /^\d{1,2} \w{3,5}\.? \d{2}:\d{2}$/)
    assert.ok(result.includes('jan'))
    assert.ok(result.includes('15'))
  })

  test('handles midnight correctly', () => {
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)

    const result = formatCompactTime(midnight.toISOString())

    // Today at midnight should show just time
    assert.equal(result, '00:00')
  })

  test('handles timestamps across timezone boundaries', () => {
    // Test with explicit Stockholm timezone timestamp
    const timestamp = '2025-10-21T23:59:00+02:00'

    const result = formatCompactTime(timestamp)

    // Should parse correctly
    assert.ok(typeof result === 'string')
    assert.match(result, /\d{2}:\d{2}/)
  })
})

describe('formatFullTime', () => {
  test('shows full date and time with seconds', () => {
    const date = new Date('2025-10-21T14:30:45Z')

    const result = formatFullTime(date.toISOString())

    // Should include year, month, day, hours, minutes, seconds
    assert.ok(result.includes('2025'))
    assert.ok(result.includes('oktober'))
    assert.ok(result.includes('21'))
    // Time format varies by locale, just check it's present
    assert.match(result, /\d{2}:\d{2}:\d{2}/)
  })
})

describe('isUrl', () => {
  test('returns true for valid HTTP URLs', () => {
    assert.equal(isUrl('http://example.com'), true)
    assert.equal(isUrl('https://example.com'), true)
    assert.equal(isUrl('https://example.com/path?query=1'), true)
  })

  test('returns true for other valid URL schemes', () => {
    assert.equal(isUrl('ftp://files.example.com'), true)
    assert.equal(isUrl('mailto:test@example.com'), true)
  })

  test('returns false for invalid URLs', () => {
    assert.equal(isUrl('not a url'), false)
    assert.equal(isUrl('just-text'), false)
    assert.equal(isUrl('example.com'), false) // Missing protocol
  })

  test('returns false for null, undefined, and empty strings', () => {
    assert.equal(isUrl(null), false)
    assert.equal(isUrl(undefined), false)
    assert.equal(isUrl(''), false)
  })

  test('handles edge cases', () => {
    assert.equal(isUrl('http://'), false) // Invalid URL
    assert.equal(isUrl('://example.com'), false) // Missing scheme
  })
})

describe('getHostname', () => {
  test('extracts hostname from URL', () => {
    assert.equal(getHostname('https://example.com/path'), 'example.com')
    assert.equal(getHostname('http://subdomain.example.com'), 'subdomain.example.com')
  })

  test('removes www prefix', () => {
    assert.equal(getHostname('https://www.example.com'), 'example.com')
    assert.equal(getHostname('http://www.test.com/page'), 'test.com')
  })

  test('preserves non-www subdomains', () => {
    assert.equal(getHostname('https://api.example.com'), 'api.example.com')
    assert.equal(getHostname('https://cdn.example.com'), 'cdn.example.com')
  })

  test('returns original value for invalid URLs', () => {
    assert.equal(getHostname('not a url'), 'not a url')
    assert.equal(getHostname('just text'), 'just text')
  })

  test('handles URLs with ports', () => {
    assert.equal(getHostname('https://example.com:8080'), 'example.com')
    assert.equal(getHostname('http://localhost:3000'), 'localhost')
  })
})

describe('isNewsItemNew', () => {
  test('returns true for items created less than 1 minute ago', () => {
    const now = new Date()
    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000)

    assert.equal(isNewsItemNew(thirtySecondsAgo.toISOString()), true)
  })

  test('returns true for items created exactly 59 seconds ago', () => {
    const now = new Date()
    const fiftyNineSecondsAgo = new Date(now.getTime() - 59 * 1000)

    assert.equal(isNewsItemNew(fiftyNineSecondsAgo.toISOString()), true)
  })

  test('returns false for items created exactly 1 minute ago', () => {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)

    assert.equal(isNewsItemNew(oneMinuteAgo.toISOString()), false)
  })

  test('returns false for items created 2 minutes ago', () => {
    const now = new Date()
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000)

    assert.equal(isNewsItemNew(twoMinutesAgo.toISOString()), false)
  })

  test('returns false for items created 1 hour ago', () => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    assert.equal(isNewsItemNew(oneHourAgo.toISOString()), false)
  })

  test('returns false for items created yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    assert.equal(isNewsItemNew(yesterday.toISOString()), false)
  })

  test('returns false when createdInDb is undefined', () => {
    assert.equal(isNewsItemNew(undefined), false)
  })

  test('returns false when createdInDb is empty string', () => {
    assert.equal(isNewsItemNew(''), false)
  })

  test('returns true for items created just now', () => {
    const now = new Date()

    assert.equal(isNewsItemNew(now.toISOString()), true)
  })

  test('handles items created in the future (clock skew)', () => {
    const future = new Date()
    future.setMinutes(future.getMinutes() + 5)

    // Items "from the future" should be considered new
    assert.equal(isNewsItemNew(future.toISOString()), true)
  })
})
