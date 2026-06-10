import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { selectPushTargets } from '../lib/services/push-dispatch'
import type { NewsItem } from '../lib/types'

const item = (dbId: string, newsValue: number): NewsItem => ({
  dbId, workflowId: 'wf', source: 'test', timestamp: '2026-06-10T10:00:00Z',
  title: `Item ${dbId}`, newsValue,
}) as NewsItem

const sub = (id: string, columnIds: string[], threshold: number) => ({
  id, userId: 'u', endpoint: `https://push/${id}`,
  keys: { p256dh: 'k', auth: 'a' }, columnIds, newsValueThreshold: threshold,
})

test('matchar prenumeration på kolumn-överlapp och tröskel', () => {
  const targets = selectPushTargets(
    ['col-a'],
    [item('x', 5)],
    [sub('s1', ['col-a'], 4), sub('s2', ['col-b'], 1), sub('s3', ['col-a'], 5)],
  )
  assert.deepEqual(targets.map(t => t.subscription.id), ['s1', 's3'])
  assert.equal(targets[0].item.dbId, 'x')
})

test('väljer item med högst nyhetsvärde som notis-innehåll', () => {
  const targets = selectPushTargets(
    ['col-a'],
    [item('låg', 2), item('hög', 5)],
    [sub('s1', ['col-a'], 3)],
  )
  assert.equal(targets[0].item.dbId, 'hög')
})

test('inga träffar under tröskeln', () => {
  const targets = selectPushTargets(['col-a'], [item('x', 2)], [sub('s1', ['col-a'], 4)])
  assert.equal(targets.length, 0)
})
