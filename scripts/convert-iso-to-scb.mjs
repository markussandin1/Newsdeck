#!/usr/bin/env node
/**
 * Convert geographic data from ISO 3166-2 letter codes to SCB numeric codes
 *
 * Usage: node scripts/convert-iso-to-scb.mjs
 *
 * Reads:  data/geo/SE.json (ISO format)
 *         data/geo/scb-iso-mapping.json (mapping reference)
 * Writes: data/geo/SE_SCB.json (SCB format)
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')
const mappingPath = path.join(projectRoot, 'data/geo/scb-iso-mapping.json')
const inputPath = path.join(projectRoot, 'data/geo/SE.json')
const outputPath = path.join(projectRoot, 'data/geo/SE_SCB.json')

console.log('\n🔄 Converting ISO 3166-2 codes to SCB codes...\n')

// Read mapping file
if (!fs.existsSync(mappingPath)) {
  console.error(`❌ Mapping file not found: ${mappingPath}`)
  console.error('   Run this script after creating data/geo/scb-iso-mapping.json')
  process.exit(1)
}

const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'))
const isoToScb = new Map()
mapping.regions.forEach(r => {
  isoToScb.set(r.iso, r.scb)
})

console.log(`✅ Loaded ${isoToScb.size} ISO → SCB mappings`)

// Read input file
if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input file not found: ${inputPath}`)
  process.exit(1)
}

const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
console.log(`✅ Read ${inputData.subdivisions.length} subdivisions from SE.json`)

// Convert codes
let regionsConverted = 0
let municipalitiesConverted = 0

const convertedData = {
  country: inputData.country,
  subdivisions: inputData.subdivisions.map(item => {
    const converted = { ...item }

    // Extract code without country prefix
    // "SE-AB" → "AB", "SE-0180" → "0180"
    const codeWithoutPrefix = item.code.replace(/^SE-/, '')

    if (item.level === 1 && item.type === 'county') {
      // This is a region/county - convert ISO letter code to SCB numeric
      const scbCode = isoToScb.get(codeWithoutPrefix)
      if (!scbCode) {
        console.warn(`⚠️  No SCB mapping found for region: ${codeWithoutPrefix} (${item.name})`)
        return converted
      }
      converted.code = `SE-${scbCode}`
      regionsConverted++
    } else if (item.level === 2 && item.type === 'municipality') {
      // Municipality - code stays the same (already SCB format)
      // But update parent reference to use SCB code
      if (item.parent) {
        const parentCodeWithoutPrefix = item.parent.replace(/^SE-/, '')
        const scbParentCode = isoToScb.get(parentCodeWithoutPrefix)
        if (scbParentCode) {
          converted.parent = `SE-${scbParentCode}`
        } else {
          console.warn(`⚠️  No SCB mapping found for parent: ${parentCodeWithoutPrefix}`)
        }
      }
      municipalitiesConverted++
    }

    return converted
  })
}

console.log(`✅ Converted ${regionsConverted} regions (ISO → SCB)`)
console.log(`✅ Updated ${municipalitiesConverted} municipalities (parent references)`)

// Write output file
fs.writeFileSync(outputPath, JSON.stringify(convertedData, null, 2), 'utf-8')
console.log(`\n✅ Wrote converted data to: ${outputPath}`)

// Show sample conversions
console.log('\n📋 Sample conversions:')
const samples = [
  { iso: 'AB', name: 'Stockholms län' },
  { iso: 'Z', name: 'Jämtlands län' },
  { iso: 'BD', name: 'Norrbottens län' }
]

samples.forEach(({ iso, name }) => {
  const scb = isoToScb.get(iso)
  console.log(`   ${iso.padEnd(3)} → ${scb}  (${name})`)
})

console.log('\n✅ Conversion complete!\n')
