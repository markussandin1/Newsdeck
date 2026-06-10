import { strict as assert } from 'node:assert'
import { test } from 'node:test'

import { buildReplacedSourcePairs } from '../lib/db/column-data'

test('returnerar tomt array när inget item har id + dbId', () => {
  // dbId satt till '' (falsy) eller id saknas — ska alla filtreras bort
  const result = buildReplacedSourcePairs([
    { title: 'Inget id', dbId: 'db1', source: 'x', timestamp: '', newsValue: 3, workflowId: '' },
    { id: 'src-1', title: 'Inget dbId', dbId: '', source: 'x', timestamp: '', newsValue: 3, workflowId: '' },
    { title: 'Varken id eller dbId', dbId: '', source: 'x', timestamp: '', newsValue: 3, workflowId: '' },
  ])
  assert.deepEqual(result, [])
})

test('behåller items som har både id och dbId', () => {
  const item = { id: 'src-1', dbId: 'db-uuid-1', title: 'Test', source: 'x', timestamp: '', newsValue: 3, workflowId: '' }
  const result = buildReplacedSourcePairs([item])
  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'src-1')
  assert.equal(result[0].dbId, 'db-uuid-1')
})

test('batch-dubletter med samma source-id ger ett par — sista dbId behålls', () => {
  // Två items i samma batch med source-id 'x' men olika dbIds.
  // Utan dedup skulle de radera varandras nyinsatta column_data-rader.
  const items = [
    { id: 'x', dbId: 'db1', title: 'Första', source: 's', timestamp: '', newsValue: 3, workflowId: '' },
    { id: 'x', dbId: 'db2', title: 'Sista', source: 's', timestamp: '', newsValue: 3, workflowId: '' },
  ]
  const result = buildReplacedSourcePairs(items)
  assert.equal(result.length, 1, 'Ska dedupas till ett par')
  assert.equal(result[0].dbId, 'db2', 'Sista occurrence vinner')
})

test('olika source-ids behåller separata par', () => {
  const items = [
    { id: 'src-1', dbId: 'db1', title: 'A', source: 's', timestamp: '', newsValue: 3, workflowId: '' },
    { id: 'src-2', dbId: 'db2', title: 'B', source: 's', timestamp: '', newsValue: 3, workflowId: '' },
  ]
  const result = buildReplacedSourcePairs(items)
  assert.equal(result.length, 2)
  assert.deepEqual(result.map(i => i.id), ['src-1', 'src-2'])
})

test('blandat — dubbletter, unika och items utan id/dbId', () => {
  const items = [
    { id: 'dup', dbId: 'db-first', title: '1', source: 's', timestamp: '', newsValue: 3, workflowId: '' },
    { id: 'unique', dbId: 'db-unique', title: '2', source: 's', timestamp: '', newsValue: 3, workflowId: '' },
    { id: 'dup', dbId: 'db-last', title: '3', source: 's', timestamp: '', newsValue: 3, workflowId: '' },
    { title: 'Inget id', dbId: 'db-no-id', source: 's', timestamp: '', newsValue: 3, workflowId: '' },   // id saknas — filtreras bort
  ]
  const result = buildReplacedSourcePairs(items)
  assert.equal(result.length, 2, 'dup dedupad, inget-id filtrerat')
  const dup = result.find(i => i.id === 'dup')
  assert.equal(dup?.dbId, 'db-last', 'Sista dubbletten vinner')
  const uniq = result.find(i => i.id === 'unique')
  assert.equal(uniq?.dbId, 'db-unique')
})
