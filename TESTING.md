# Testing Guide

This document explains the testing infrastructure and how to write tests for Newsdeck.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Infrastructure](#test-infrastructure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#cicd-integration)

## Quick Start

Run all tests:

```bash
npm test
```

Run specific test file:

```bash
npm test -- --test-name-pattern="formatCompactTime"
```

## Test Infrastructure

### Test Framework

We use **Node.js native test runner** (`node:test`) - no external testing library required!

**Why Node.js test runner?**
- ✅ Built into Node.js (no extra dependencies)
- ✅ Fast and lightweight
- ✅ TypeScript support via compilation
- ✅ Modern and actively maintained

### File Structure

```
newsdeck-production/
├── tests/                    # All test files
│   ├── ingestion.test.ts     # Original ingestion tests
│   ├── time-utils.test.ts    # Timestamp formatting tests
│   ├── rate-limit.test.ts    # Rate limiting logic tests
│   └── validation.test.ts    # NewsItem validation tests
├── lib/
│   └── time-utils.ts         # Shared utilities (testable)
├── tsconfig.json             # Main TypeScript config
└── tsconfig.test.json        # Test-specific TypeScript config
```

### Configuration Files

**tsconfig.test.json**
- Extends main `tsconfig.json`
- Compiles tests to `.test-dist/` directory
- Uses CommonJS modules for Node.js compatibility

**package.json scripts**
```json
{
  "test": "rm -rf .test-dist && tsc --project tsconfig.test.json && node --test $(find .test-dist/tests -name '*.js') && rm -rf .test-dist"
}
```

## Running Tests

### All Tests

```bash
npm test
```

Output example:
```
✔ formatCompactTime › shows only time for today (0.5ms)
✔ formatCompactTime › shows "Igår HH:mm" for yesterday (0.3ms)
✔ isUrl › returns true for valid HTTP URLs (0.2ms)
✔ getRateLimitIdentifier › uses workflow ID when available (0.1ms)
✔ NewsItem Validation › requires either columnId or workflowId (1.2ms)

▶ All tests passed (23/23)
```

### Specific Test File

```bash
# Run only time-utils tests
npm test -- tests/time-utils.test.ts

# Run only validation tests
npm test -- tests/validation.test.ts
```

### Filter by Test Name

```bash
npm test -- --test-name-pattern="Igår"
```

### Watch Mode (Development)

Node.js test runner doesn't have built-in watch mode, but you can use `nodemon`:

```bash
# Install nodemon (optional)
npm install --save-dev nodemon

# Watch for changes and rerun tests
npx nodemon --watch lib --watch tests --ext ts --exec "npm test"
```

## Writing Tests

### Basic Test Structure

```typescript
import { strict as assert } from 'node:assert'
import { test, describe } from 'node:test'
import { yourFunction } from '../lib/your-module'

describe('YourModule', () => {
  test('does something correctly', () => {
    const result = yourFunction('input')
    assert.equal(result, 'expected output')
  })

  test('handles edge cases', () => {
    assert.throws(
      () => yourFunction(null),
      /Expected error message/
    )
  })
})
```

### Assertions

Node.js provides `assert` module with many helpers:

```typescript
import { strict as assert } from 'node:assert'

// Equality
assert.equal(actual, expected)
assert.notEqual(actual, unexpected)
assert.deepEqual(obj1, obj2)

// Truthiness
assert.ok(value) // truthy
assert.ok(!value) // falsy

// Type checks
assert.equal(typeof value, 'string')

// Pattern matching
assert.match(string, /regex/)

// Errors
assert.throws(() => { throw new Error() })
assert.rejects(async () => { throw new Error() })

// Advanced
assert.deepStrictEqual(obj1, obj2) // Strict comparison
```

### Async Tests

```typescript
test('async operation', async () => {
  const result = await fetchData()
  assert.equal(result.status, 'success')
})

test('rejected promise', async () => {
  await assert.rejects(
    async () => await failingOperation(),
    { message: 'Expected error' }
  )
})
```

### Mocking

For database operations, create mock implementations:

```typescript
const createMockDb = () => {
  const calls: any[] = []

  return {
    db: {
      addNewsItems: async (items) => {
        calls.push(items)
        return items
      }
    },
    calls
  }
}

test('saves items to database', async () => {
  const { db, calls } = createMockDb()

  await saveItems(db, [{ title: 'Test' }])

  assert.equal(calls.length, 1)
  assert.equal(calls[0][0].title, 'Test')
})
```

### Testing Time-Dependent Code

```typescript
test('formats current time', () => {
  const now = new Date('2025-10-21T14:30:00Z')

  const result = formatCompactTime(now.toISOString())

  assert.equal(result, '14:30')
})

test('handles yesterday', () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(14, 30, 0, 0)

  const result = formatCompactTime(yesterday.toISOString())

  assert.match(result, /^Igår \d{2}:\d{2}$/)
})
```

## Test Coverage

### Current Coverage

| Module | Coverage | Notes |
|--------|----------|-------|
| `lib/time-utils.ts` | ✅ High | All functions tested |
| `lib/services/ingestion.ts` | ✅ High | Validation and normalization |
| `lib/rate-limit.ts` | ⚠️ Partial | Identifier logic tested, DB integration needs setup |
| React Components | ❌ None | Requires React Testing Library setup |
| API Routes | ❌ None | Requires integration test setup |

### What Should Be Tested?

**Priority 1 - Critical Business Logic**
- ✅ NewsItem validation and normalization
- ✅ Timestamp formatting (today/yesterday/older)
- ✅ URL detection and validation
- ✅ Rate limit identifier generation
- ⏳ Rate limit enforcement (needs DB)

**Priority 2 - Data Integrity**
- ✅ Database operations (basic mocking)
- ⏳ Coordinate normalization
- ⏳ Source URL extraction

**Priority 3 - UI Components**
- ⏳ NewsItem component rendering
- ⏳ Timestamp display
- ⏳ URL link rendering

**Priority 4 - Integration**
- ⏳ API endpoint responses
- ⏳ Database queries
- ⏳ Long-polling behavior

### Adding Coverage for New Code

When adding new features:

1. **Write test first** (TDD approach):
   ```typescript
   test('new feature works', () => {
     const result = newFeature('input')
     assert.equal(result, 'expected')
   })
   ```

2. **Implement the feature**

3. **Verify test passes**: `npm test`

## CI/CD Integration

### GitHub Actions

Add testing to your workflow (`.github/workflows/test.yml`):

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run type-check

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
```

### Pre-commit Hook (Optional)

Install `husky` to run tests before commits:

```bash
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run type-check && npm run lint && npm test"
```

## Best Practices

### 1. Test Behavior, Not Implementation

❌ **Bad:**
```typescript
test('uses forEach internally', () => {
  const spy = jest.spyOn(Array.prototype, 'forEach')
  processItems([1, 2, 3])
  expect(spy).toHaveBeenCalled()
})
```

✅ **Good:**
```typescript
test('processes all items', () => {
  const result = processItems([1, 2, 3])
  assert.deepEqual(result, [2, 4, 6])
})
```

### 2. Keep Tests Isolated

Each test should be independent:

```typescript
// ❌ Tests depend on each other
let sharedState
test('test 1', () => { sharedState = 'value' })
test('test 2', () => { assert.equal(sharedState, 'value') })

// ✅ Each test is independent
test('test 1', () => {
  const state = 'value'
  assert.equal(state, 'value')
})
test('test 2', () => {
  const state = 'value'
  assert.equal(state, 'value')
})
```

### 3. Use Descriptive Test Names

```typescript
// ❌ Unclear
test('it works', () => { ... })

// ✅ Clear and specific
test('formatCompactTime shows "Igår 14:30" for yesterday', () => { ... })
```

### 4. Test Edge Cases

```typescript
describe('isUrl', () => {
  test('returns true for valid URLs', () => { ... })
  test('returns false for invalid URLs', () => { ... })
  test('handles null and undefined', () => { ... })  // ✅ Edge case
  test('handles empty strings', () => { ... })       // ✅ Edge case
  test('handles malformed URLs', () => { ... })      // ✅ Edge case
})
```

### 5. Keep Tests Fast

- Mock external dependencies (database, API calls)
- Use in-memory data when possible
- Avoid `setTimeout` unless testing time-dependent behavior

### 6. Organize Tests Logically

```typescript
describe('NewsItem Validation', () => {
  describe('required fields', () => {
    test('requires columnId or workflowId', () => { ... })
    test('requires title', () => { ... })
  })

  describe('optional fields', () => {
    test('accepts description', () => { ... })
    test('accepts location', () => { ... })
  })

  describe('field normalization', () => {
    test('trims whitespace', () => { ... })
    test('clamps newsValue to 1-5', () => { ... })
  })
})
```

## Troubleshooting

### Tests fail with "Cannot find module"

**Problem:** TypeScript paths (`@/lib/...`) not resolved

**Solution:** Ensure `tsconfig.test.json` extends `tsconfig.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "outDir": ".test-dist"
  }
}
```

### Tests timeout

**Problem:** Async test doesn't complete

**Solution:** Ensure async tests return/await promises:
```typescript
// ❌ Missing await
test('async test', async () => {
  fetchData() // Promise not awaited
})

// ✅ Properly awaited
test('async test', async () => {
  await fetchData()
})
```

### Type errors in tests

**Problem:** TypeScript complains about test code

**Solution:** Install type definitions:
```bash
npm install --save-dev @types/node
```

## Future Improvements

### React Component Testing

Install React Testing Library:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

Example:
```typescript
import { render, screen } from '@testing-library/react'
import NewsItem from '@/components/NewsItem'

test('shows NY badge for new items', () => {
  render(<NewsItem item={{ ...mockItem, isNew: true }} />)
  expect(screen.getByText('NY')).toBeInTheDocument()
})
```

### Integration Testing

Test API endpoints with actual database:

```typescript
test('POST /api/workflows stores items', async () => {
  const response = await fetch('http://localhost:3000/api/workflows', {
    method: 'POST',
    headers: { 'x-api-key': process.env.API_KEY },
    body: JSON.stringify({ workflowId: 'test', items: [...] })
  })

  assert.equal(response.status, 200)

  // Verify in database
  const items = await db.getColumnData('test')
  assert.equal(items.length, 1)
})
```

### E2E Testing with Playwright

Test full user workflows:

```bash
npm install --save-dev @playwright/test
```

```typescript
import { test, expect } from '@playwright/test'

test('user can view news items', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page.locator('.news-item')).toBeVisible()
  await page.click('.news-item')
  await expect(page.locator('.news-modal')).toBeVisible()
})
```

## Questions?

- **How do I test React components?** → See "React Component Testing" above
- **How do I test database operations?** → Use mocks (see examples) or setup test database
- **How do I test API routes?** → See "Integration Testing" above
- **Should I test private functions?** → No, test public API and behavior

## Resources

- [Node.js Test Runner Docs](https://nodejs.org/api/test.html)
- [Node.js Assert Module](https://nodejs.org/api/assert.html)
- [Testing Best Practices](https://testingjavascript.com/)
