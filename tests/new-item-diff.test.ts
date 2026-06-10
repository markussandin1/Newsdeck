import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { diffNewItems } from '../lib/dashboard/new-item-diff'
import type { NewsItem } from '../lib/types'

const NOW = Date.parse('2026-06-10T12:00:00Z')

const item = (dbId: string, createdInDb: string): NewsItem => ({
  dbId, workflowId: 'wf', source: 'test', timestamp: createdInDb,
  createdInDb, title: dbId, newsValue: 3,
}) as NewsItem

test('första anropet (seen=null) registrerar allt utan att notifiera', () => {
  const seen = new Set<string>()
  const fresh = diffNewItems({ col: [item('a', '2026-06-10T11:59:30Z')] }, seen, NOW, true)
  assert.deepEqual(fresh, {})
  assert.ok(seen.has('a'))
})

test('nya osedda items inom åldersfönstret notifieras en gång', () => {
  const seen = new Set<string>(['a'])
  const state = { col: [item('b', '2026-06-10T11:59:00Z'), item('a', '2026-06-10T11:00:00Z')] }
  const fresh1 = diffNewItems(state, seen, NOW, false)
  assert.deepEqual(Object.keys(fresh1), ['col'])
  assert.deepEqual(fresh1.col.map(i => i.dbId), ['b'])
  // Idempotent: samma state igen → inget nytt (StrictMode-säkert)
  const fresh2 = diffNewItems(state, seen, NOW, false)
  assert.deepEqual(fresh2, {})
})

test('gamla items (t.ex. backfill efter lång offline) markeras sedda men notifieras inte', () => {
  const seen = new Set<string>()
  const fresh = diffNewItems({ col: [item('old', '2026-06-10T11:00:00Z')] }, seen, NOW, false)
  assert.deepEqual(fresh, {})
  assert.ok(seen.has('old'))
})
