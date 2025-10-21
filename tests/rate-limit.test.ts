import { strict as assert } from 'node:assert'
import { test, describe } from 'node:test'
import { getRateLimitIdentifier } from '../lib/rate-limit'

describe('getRateLimitIdentifier', () => {
  test('uses workflow ID when available', () => {
    const result = getRateLimitIdentifier('my-workflow', '192.168.1.1')
    assert.equal(result, 'workflow:my-workflow')
  })

  test('falls back to IP address when workflow ID is null', () => {
    const result = getRateLimitIdentifier(null, '192.168.1.1')
    assert.equal(result, 'ip:192.168.1.1')
  })

  test('falls back to IP address when workflow ID is undefined', () => {
    const result = getRateLimitIdentifier(undefined, '10.0.0.1')
    assert.equal(result, 'ip:10.0.0.1')
  })

  test('falls back to IP address when workflow ID is empty string', () => {
    const result = getRateLimitIdentifier('', '127.0.0.1')
    assert.equal(result, 'ip:127.0.0.1')
  })

  test('handles IPv6 addresses', () => {
    const result = getRateLimitIdentifier(null, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')
    assert.equal(result, 'ip:2001:0db8:85a3:0000:0000:8a2e:0370:7334')
  })

  test('creates distinct identifiers for different workflows', () => {
    const id1 = getRateLimitIdentifier('workflow-1', '192.168.1.1')
    const id2 = getRateLimitIdentifier('workflow-2', '192.168.1.1')

    assert.notEqual(id1, id2)
    assert.equal(id1, 'workflow:workflow-1')
    assert.equal(id2, 'workflow:workflow-2')
  })

  test('creates distinct identifiers for different IPs', () => {
    const id1 = getRateLimitIdentifier(null, '192.168.1.1')
    const id2 = getRateLimitIdentifier(null, '192.168.1.2')

    assert.notEqual(id1, id2)
    assert.equal(id1, 'ip:192.168.1.1')
    assert.equal(id2, 'ip:192.168.1.2')
  })
})

// NOTE: Full integration tests for checkRateLimit() require a test database
// and are better suited for integration testing or E2E tests.
// The logic is:
// 1. Allows up to 500 requests per minute per identifier
// 2. Blocks request #501 within the same minute
// 3. Resets after 60 seconds
// 4. Fails open (allows request) if database is unavailable
//
// To test this properly, you would need:
// - A test PostgreSQL database
// - Helper to seed rate_limit_log table
// - Time mocking or actual waiting for window expiry
//
// Example integration test structure:
//
// describe('checkRateLimit - Integration', () => {
//   test('blocks after 500 requests within 1 minute', async () => {
//     const identifier = 'test-workflow-' + Date.now()
//
//     // Make 500 requests
//     for (let i = 0; i < 500; i++) {
//       const result = await checkRateLimit(identifier)
//       assert.equal(result.success, true, `Request ${i + 1} should succeed`)
//     }
//
//     // 501st request should be blocked
//     const blocked = await checkRateLimit(identifier)
//     assert.equal(blocked.success, false)
//     assert.equal(blocked.remaining, 0)
//   })
//
//   test('resets after window expires', async () => {
//     const identifier = 'test-workflow-' + Date.now()
//
//     // Fill up the rate limit
//     for (let i = 0; i < 500; i++) {
//       await checkRateLimit(identifier)
//     }
//
//     // Should be blocked now
//     const blocked = await checkRateLimit(identifier)
//     assert.equal(blocked.success, false)
//
//     // Wait for window to expire (61 seconds to be safe)
//     await new Promise(resolve => setTimeout(resolve, 61000))
//
//     // Should be allowed again
//     const allowed = await checkRateLimit(identifier)
//     assert.equal(allowed.success, true)
//   })
// })
