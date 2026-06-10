import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { handleNotificationPayload } from '../lib/realtime/pg-listener'

const makeDeps = () => {
  const fetched: string[][] = []
  const added: Array<{ columnIds: string[]; dbIds: string[] }> = []
  return {
    fetched,
    added,
    deps: {
      fetchItems: async (dbIds: string[]) => {
        fetched.push(dbIds)
        return dbIds.map(dbId => ({ dbId, title: `Item ${dbId}` }) as never)
      },
      addItems: (columnIds: string[], items: Array<{ dbId?: string }>) => {
        added.push({ columnIds, dbIds: items.map(i => i.dbId!) })
      },
    },
  }
}

test('hämtar items per dbId och matar eventQueue', async () => {
  const { deps, fetched, added } = makeDeps()
  await handleNotificationPayload(
    JSON.stringify({ columnIds: ['col-a'], dbIds: ['id-1', 'id-2'] }),
    deps,
  )
  assert.deepEqual(fetched, [['id-1', 'id-2']])
  assert.deepEqual(added, [{ columnIds: ['col-a'], dbIds: ['id-1', 'id-2'] }])
})

test('ignorerar trasig payload utan att kasta', async () => {
  const { deps, added } = makeDeps()
  await handleNotificationPayload('not json {', deps)
  await handleNotificationPayload(undefined, deps)
  await handleNotificationPayload(JSON.stringify({ columnIds: 'fel' }), deps)
  assert.equal(added.length, 0)
})

test('lägger inget i kön när inga items hittas i DB', async () => {
  const { added } = makeDeps()
  await handleNotificationPayload(
    JSON.stringify({ columnIds: ['col-a'], dbIds: ['saknas'] }),
    {
      fetchItems: async () => [],
      addItems: (columnIds, items) =>
        added.push({ columnIds, dbIds: items.map(i => i.dbId!) }),
    },
  )
  assert.equal(added.length, 0)
})
