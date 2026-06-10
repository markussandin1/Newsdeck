import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { broadcastNewsItems, NOTIFY_CHANNEL, type BroadcastPayload } from '../lib/realtime/broadcast'
import { eventQueue } from '../lib/event-queue'

const makeItem = (dbId: string) => ({
  dbId,
  workflowId: 'wf',
  source: 'test',
  timestamp: '2026-06-10T10:00:00Z',
  title: `Item ${dbId}`,
  newsValue: 3,
}) as never

test('skickar pg_notify med columnIds och dbIds', async () => {
  const calls: Array<{ channel: string; payload: BroadcastPayload }> = []
  const notify = async (channel: string, payload: string) => {
    calls.push({ channel, payload: JSON.parse(payload) })
  }

  process.env.DATABASE_URL = 'postgresql://fake'
  await broadcastNewsItems(['col-a'], [makeItem('id-1'), makeItem('id-2')], notify)

  assert.equal(calls.length, 1)
  assert.equal(calls[0].channel, NOTIFY_CHANNEL)
  assert.deepEqual(calls[0].payload, { columnIds: ['col-a'], dbIds: ['id-1', 'id-2'] })
})

test('chunkar stora batchar så payload håller sig under NOTIFY-gränsen', async () => {
  const calls: string[] = []
  const notify = async (_c: string, payload: string) => { calls.push(payload) }

  process.env.DATABASE_URL = 'postgresql://fake'
  const items = Array.from({ length: 120 }, (_, i) => makeItem(`id-${i}`))
  await broadcastNewsItems(['col-a'], items, notify)

  assert.equal(calls.length, 3) // 120 / CHUNK_SIZE(50) → 3 chunkar
  for (const payload of calls) {
    assert.ok(payload.length < 8000)
  }
})

test('fortsätter med nästa chunk om en notify kastar', async () => {
  let n = 0
  const notify = async () => {
    n++
    if (n === 1) throw new Error('boom')
  }

  process.env.DATABASE_URL = 'postgresql://fake'
  const items = Array.from({ length: 60 }, (_, i) => makeItem(`id-${i}`))
  await broadcastNewsItems(['col-a'], items, notify) // får inte kasta
  assert.equal(n, 2)
})

test('utan DATABASE_URL levereras direkt till lokala eventQueue', async () => {
  delete process.env.DATABASE_URL
  const received: Array<{ columnId: string; count: number }> = []
  const subId = eventQueue.subscribe(['col-b'], (columnId, items) => {
    received.push({ columnId, count: items.length })
  })

  await broadcastNewsItems(['col-b'], [makeItem('id-x')])

  eventQueue.unsubscribe(subId)
  assert.deepEqual(received, [{ columnId: 'col-b', count: 1 }])
})
