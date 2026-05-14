import { strict as assert } from 'node:assert'
import { describe, test } from 'node:test'

import { getCategory, getCategoryIcon } from '../lib/categories'

describe('getCategory — tolerant lookup', () => {
  test('exakt CategoryKey-match', () => {
    const def = getCategory('brand')
    assert.ok(def)
    assert.equal(def?.key, 'brand')
    assert.equal(def?.icon, '🔥')
  })

  test('storstavad variant matchar samma key', () => {
    const def = getCategory('Brand')
    assert.ok(def)
    assert.equal(def?.key, 'brand')
  })

  test('extra whitespace trimmas', () => {
    const def = getCategory('  trafikolycka  ')
    assert.ok(def)
    assert.equal(def?.key, 'trafikolycka')
  })

  test('gruppnamn "Trafik" får pseudo-kategori med bil-ikon', () => {
    const def = getCategory('Trafik')
    assert.ok(def)
    assert.equal(def?.icon, '🚗')
    assert.equal(def?.label, 'Trafik')
    assert.equal(def?.group, 'traffic')
  })

  test('gruppnamn "Kollektivtrafik" får tåg-ikon', () => {
    const def = getCategory('Kollektivtrafik')
    assert.equal(def?.icon, '🚆')
  })

  test('gruppnamn "Brott" får varning-ikon', () => {
    const def = getCategory('Brott')
    assert.equal(def?.icon, '🚨')
  })

  test('gruppnamn "Väder" får regn-ikon (även utan diakritik)', () => {
    assert.equal(getCategory('Väder')?.icon, '🌧️')
    assert.equal(getCategory('Vader')?.icon, '🌧️')
  })

  test('"Övrigt" mappas till annan-kategorin', () => {
    const def = getCategory('Övrigt')
    assert.equal(def?.key, 'annan')
  })

  test('okänt värde returnerar undefined', () => {
    assert.equal(getCategory('nonsens'), undefined)
  })

  test('tom sträng returnerar undefined', () => {
    assert.equal(getCategory(''), undefined)
  })
})

describe('getCategoryIcon', () => {
  test('returnerar pin för saknad kategori', () => {
    assert.equal(getCategoryIcon(undefined), '📍')
    assert.equal(getCategoryIcon(''), '📍')
  })

  test('returnerar korrekt ikon för känd key', () => {
    assert.equal(getCategoryIcon('brand'), '🔥')
  })

  test('case-insensitive fungerar via getCategory', () => {
    assert.equal(getCategoryIcon('BRAND'), '🔥')
  })

  test('gruppnamn fallback fungerar', () => {
    assert.equal(getCategoryIcon('Trafik'), '🚗')
  })
})
