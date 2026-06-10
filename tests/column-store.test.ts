import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { applyLive, applySnapshot, applyPatch } from '../lib/dashboard/column-store'
import type { NewsItem } from '../lib/types'

const item = (dbId: string, opts: Partial<NewsItem> = {}): NewsItem => ({
  dbId,
  workflowId: 'wf',
  source: 'test',
  timestamp: '2026-06-10T10:00:00Z',
  createdInDb: '2026-06-10T10:00:00Z',
  title: `Item ${dbId}`,
  newsValue: 3,
  ...opts,
}) as NewsItem

test('applyLive: nya items läggs först, dedup på dbId mot befintligt state', () => {
  const state = { col: [item('a')] }
  const next = applyLive(state, 'col', [item('b'), item('a')])
  assert.deepEqual(next.col.map(i => i.dbId), ['b', 'a'])
})

test('applyLive: dedup inom samma batch — samma dbId två gånger ger ett kort', () => {
  const next = applyLive({}, 'col', [item('x'), item('x')])
  assert.equal(next.col.length, 1)
})

test('applyLive: ompostat event (samma source-id, nytt dbId) ersätter det gamla', () => {
  const state = { col: [item('old', { id: 'src-1' })] }
  const next = applyLive(state, 'col', [item('new', { id: 'src-1' })])
  assert.deepEqual(next.col.map(i => i.dbId), ['new'])
})

test('applyLive: items utan source-id ersätter aldrig något', () => {
  const state = { col: [item('old')] }
  const next = applyLive(state, 'col', [item('new')])
  assert.equal(next.col.length, 2)
})

test('applyLive: oförändrat state returneras med samma referens (ingen onödig render)', () => {
  const state = { col: [item('a')] }
  const next = applyLive(state, 'col', [item('a')])
  assert.equal(next, state)
})

test('applySnapshot: server-svaret är sanningen — klient-items som saknas kastas', () => {
  const state = { col: [item('stale', { createdInDb: '2026-06-10T09:00:00Z' })] }
  const requestedAt = Date.parse('2026-06-10T10:00:00Z')
  const next = applySnapshot(state, { col: [item('fresh')] }, requestedAt)
  assert.deepEqual(next.col.map(i => i.dbId), ['fresh'])
})

test('applySnapshot: SSE-item nyare än snapshot-requesten överlever racet', () => {
  const requestedAt = Date.parse('2026-06-10T10:00:00Z')
  const sseItem = item('via-sse', { createdInDb: '2026-06-10T10:00:05Z' })
  const state = { col: [sseItem] }
  const next = applySnapshot(state, { col: [item('from-db', { createdInDb: '2026-06-10T09:59:00Z' })] }, requestedAt)
  assert.deepEqual(new Set(next.col.map(i => i.dbId)), new Set(['via-sse', 'from-db']))
})

test('applySnapshot: befintlig objektidentitet behålls för oförändrade items', () => {
  const existing = item('a')
  const state = { col: [existing] }
  const next = applySnapshot(state, { col: [item('a')] }, Date.now())
  assert.equal(next.col[0], existing)
})

test('applySnapshot: kolumner sorteras nyast först på createdInDb', () => {
  const next = applySnapshot({}, {
    col: [
      item('gammal', { createdInDb: '2026-06-10T08:00:00Z' }),
      item('ny', { createdInDb: '2026-06-10T11:00:00Z' }),
    ],
  }, Date.now())
  assert.deepEqual(next.col.map(i => i.dbId), ['ny', 'gammal'])
})

test('applyPatch: byter ut ett item på dbId utan att röra övriga', () => {
  const state = { col: [item('a'), item('b')] }
  const patched = item('a', { title: 'Uppdaterad' })
  const next = applyPatch(state, 'col', 'a', patched)
  assert.equal(next.col.find(i => i.dbId === 'a')!.title, 'Uppdaterad')
  assert.equal(next.col.find(i => i.dbId === 'b'), state.col[1])
})

test('applyPatch: okänt dbId är en no-op med samma referens', () => {
  const state = { col: [item('a')] }
  assert.equal(applyPatch(state, 'col', 'finns-ej', item('finns-ej')), state)
})
