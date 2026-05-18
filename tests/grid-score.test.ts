import { strict as assert } from 'node:assert'
import { describe, test } from 'node:test'

import { groupItemsForGrid, scoreItem, type ItemWithColumn } from '../lib/grid-score'
import type { NewsItem } from '../lib/types'

function mkItem(
  overrides: Partial<NewsItem> & { ageMinutes: number; newsValue: number }
): NewsItem & { columnId: string } {
  const { ageMinutes: age, ...rest } = overrides
  const ts = new Date(Date.now() - age * 60_000).toISOString()
  return {
    dbId: `db-${Math.random().toString(36).slice(2)}`,
    workflowId: 'col-1',
    source: 'Test',
    title: 'Test item',
    timestamp: ts,
    columnId: 'col-1',
    ...rest,
  } as NewsItem & { columnId: string }
}

describe('scoreItem', () => {
  test('beräknar exponentiell decay baserat på ålder', () => {
    const item = mkItem({ ageMinutes: 0, newsValue: 5 })
    const score = scoreItem(item)
    // Vid ålder 0 minuter: score = 5 * exp(-0/60) = 5 * 1 = 5
    assert.equal(Math.abs(score - 5) < 0.001, true)
  })

  test('minskar score när item blir äldre', () => {
    const newItem = mkItem({ ageMinutes: 0, newsValue: 5 })
    const oldItem = mkItem({ ageMinutes: 60, newsValue: 5 })

    const newScore = scoreItem(newItem)
    const oldScore = scoreItem(oldItem)

    assert.ok(newScore > oldScore)
  })

  test('högre newsValue ger högre score', () => {
    const item1 = mkItem({ ageMinutes: 30, newsValue: 5 })
    const item2 = mkItem({ ageMinutes: 30, newsValue: 2 })

    const score1 = scoreItem(item1)
    const score2 = scoreItem(item2)

    assert.ok(score1 > score2)
  })
})

describe('groupItemsForGrid', () => {
  test('väljer högsta score som hero', () => {
    const items = [
      mkItem({ ageMinutes: 60, newsValue: 1 }),
      mkItem({ ageMinutes: 30, newsValue: 5 }),
      mkItem({ ageMinutes: 0, newsValue: 2 }),
    ]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.hero.newsValue, 5)
  })

  test('väljer nästa två högsta scores som secondary', () => {
    const items = [
      mkItem({ ageMinutes: 120, newsValue: 5 }),
      mkItem({ ageMinutes: 60, newsValue: 4 }),
      mkItem({ ageMinutes: 30, newsValue: 3 }),
      mkItem({ ageMinutes: 0, newsValue: 2 }),
    ]
    const r = groupItemsForGrid(items)
    assert.equal(r.secondary.length, 2)
    // Secondary ska innehålla items 2 och 3 (högsta scores efter hero)
    assert.ok(r.secondary.some(x => x.newsValue === 4))
    assert.ok(r.secondary.some(x => x.newsValue === 3))
  })

  test('filtrerar bort items äldre än 24 timmar', () => {
    const items = [
      mkItem({ ageMinutes: 23 * 60 + 59, newsValue: 5 }),
      mkItem({ ageMinutes: 24 * 60 + 1, newsValue: 4 }),
    ]
    const r = groupItemsForGrid(items)
    const total =
      (r.hero ? 1 : 0) +
      r.secondary.length +
      r.bands.last15.length +
      r.bands.lastHour.length +
      r.bands.earlierToday.length
    assert.equal(total, 1)
  })

  test('item exakt 15 min gammal hamnar i lastHour (inte last15)', () => {
    const items = [
      mkItem({ ageMinutes: 1, newsValue: 5 }),
      mkItem({ ageMinutes: 2, newsValue: 5 }),
      mkItem({ ageMinutes: 3, newsValue: 5 }),
      mkItem({ ageMinutes: 15, newsValue: 3 }),
    ]
    const r = groupItemsForGrid(items)
    assert.equal(r.bands.last15.length, 0)
    assert.equal(r.bands.lastHour.length, 1)
  })

  test('item exakt 60 min gammal hamnar i earlierToday (inte lastHour)', () => {
    const items = [
      mkItem({ ageMinutes: 1, newsValue: 5 }),
      mkItem({ ageMinutes: 2, newsValue: 5 }),
      mkItem({ ageMinutes: 3, newsValue: 5 }),
      mkItem({ ageMinutes: 60, newsValue: 3 }),
    ]
    const r = groupItemsForGrid(items)
    assert.equal(r.bands.lastHour.length, 0)
    assert.equal(r.bands.earlierToday.length, 1)
  })

  test('grupperar items rätt efter ålder (exkluderar top 3)', () => {
    const items = [
      mkItem({ ageMinutes: 5, newsValue: 5 }), // hero
      mkItem({ ageMinutes: 10, newsValue: 5 }), // secondary 1
      mkItem({ ageMinutes: 15, newsValue: 5 }), // secondary 2
      mkItem({ ageMinutes: 5, newsValue: 1 }), // last15
      mkItem({ ageMinutes: 30, newsValue: 1 }), // lastHour
      mkItem({ ageMinutes: 300, newsValue: 1 }), // earlierToday
    ]
    const r = groupItemsForGrid(items)
    assert.ok(r.hero)
    assert.equal(r.secondary.length, 2)
    assert.equal(r.bands.last15.length, 1)
    assert.equal(r.bands.lastHour.length, 1)
    assert.equal(r.bands.earlierToday.length, 1)
  })

  test('returnerar tom result om inga items', () => {
    const r = groupItemsForGrid([])
    assert.equal(r.hero, null)
    assert.equal(r.secondary.length, 0)
    assert.equal(r.bands.last15.length, 0)
    assert.equal(r.bands.lastHour.length, 0)
    assert.equal(r.bands.earlierToday.length, 0)
  })

  test('returnerar tom result om alla items för gamla', () => {
    const items = [mkItem({ ageMinutes: 25 * 60, newsValue: 5 })]
    const r = groupItemsForGrid(items)
    assert.equal(r.hero, null)
    assert.equal(r.secondary.length, 0)
  })
})
