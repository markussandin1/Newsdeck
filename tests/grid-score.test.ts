import { strict as assert } from 'node:assert'
import { test, describe } from 'node:test'
import { scoreItem, groupItemsForGrid } from '../lib/grid-score'
import type { NewsItem } from '../lib/types'

function mkItem(overrides: Partial<NewsItem> & { ageMinutes: number; newsValue: number }): NewsItem & { columnId: string } {
  const ts = new Date(Date.now() - overrides.ageMinutes * 60_000).toISOString()
  return {
    dbId: `db-${Math.random().toString(36).slice(2)}`,
    workflowId: 'col-1',
    source: 'Test',
    title: 'Test item',
    timestamp: ts,
    newsValue: overrides.newsValue,
    columnId: 'col-1',
    ...overrides,
  } as NewsItem & { columnId: string }
}

describe('scoreItem', () => {
  test('newsValue 5 färsk (0 min) ger score 5', () => {
    const item = mkItem({ ageMinutes: 0, newsValue: 5 })
    assert.ok(Math.abs(scoreItem(item) - 5) < 0.01)
  })

  test('newsValue 5 60 min gammal ger score ~1.84 (5 × 1/e)', () => {
    const item = mkItem({ ageMinutes: 60, newsValue: 5 })
    const s = scoreItem(item)
    assert.ok(s > 1.7 && s < 2.0, `förväntade ~1.84, fick ${s}`)
  })

  test('färsk 4:a (5 min) slår gammal 5:a (90 min)', () => {
    const fresh4 = mkItem({ ageMinutes: 5, newsValue: 4 })
    const old5 = mkItem({ ageMinutes: 90, newsValue: 5 })
    assert.ok(scoreItem(fresh4) > scoreItem(old5))
  })

  test('använder createdInDb om det finns före timestamp', () => {
    const item = mkItem({ ageMinutes: 120, newsValue: 5 })
    item.createdInDb = new Date(Date.now() - 1 * 60_000).toISOString()
    const s = scoreItem(item)
    assert.ok(s > 4.9, `förväntade ~5 (färsk via createdInDb), fick ${s}`)
  })
})

describe('groupItemsForGrid', () => {
  test('tom lista ger tomt resultat', () => {
    const r = groupItemsForGrid([])
    assert.equal(r.hero, null)
    assert.deepEqual(r.secondary, [])
    assert.equal(r.bands.last15.length, 0)
    assert.equal(r.bands.lastHour.length, 0)
    assert.equal(r.bands.earlierToday.length, 0)
  })

  test('1 item → bara Hero', () => {
    const items = [mkItem({ ageMinutes: 5, newsValue: 5 })]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 0)
    assert.equal(r.bands.last15.length, 0)
  })

  test('5 items → Hero + 2 secondary + 2 i band', () => {
    const items = [
      mkItem({ ageMinutes: 5, newsValue: 5 }),
      mkItem({ ageMinutes: 10, newsValue: 5 }),
      mkItem({ ageMinutes: 8, newsValue: 4 }),
      mkItem({ ageMinutes: 12, newsValue: 3 }),
      mkItem({ ageMinutes: 30, newsValue: 3 }),
    ]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 2)
    assert.equal(r.bands.last15.length, 1)
    assert.equal(r.bands.lastHour.length, 1)
    assert.equal(r.bands.earlierToday.length, 0)
  })

  test('items i topp-3 dyker inte upp i banden', () => {
    const items = [
      mkItem({ ageMinutes: 5, newsValue: 5 }),
      mkItem({ ageMinutes: 6, newsValue: 5 }),
      mkItem({ ageMinutes: 7, newsValue: 5 }),
    ]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 2)
    assert.equal(r.bands.last15.length, 0)
  })

  test('item äldre än 24h hamnar inte i något band', () => {
    const items = [
      mkItem({ ageMinutes: 5, newsValue: 5 }),
      mkItem({ ageMinutes: 25 * 60, newsValue: 5 }),
    ]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 0)
    assert.equal(r.bands.earlierToday.length, 0)
  })

  test('banden sorteras på score fallande', () => {
    const items = [
      mkItem({ ageMinutes: 1, newsValue: 5 }),
      mkItem({ ageMinutes: 2, newsValue: 5 }),
      mkItem({ ageMinutes: 3, newsValue: 5 }),
      mkItem({ ageMinutes: 14, newsValue: 2 }),
      mkItem({ ageMinutes: 4, newsValue: 4 }),
    ]
    const r = groupItemsForGrid(items)
    assert.equal(r.bands.last15.length, 2)
    assert.equal(r.bands.last15[0].newsValue, 4)
    assert.equal(r.bands.last15[1].newsValue, 2)
  })
})
