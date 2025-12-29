#!/usr/bin/env node

/**
 * Parse SCB Excel file to extract all Swedish municipalities
 *
 * Reads the official SCB Excel file and outputs JavaScript code
 * with all 290 municipalities organized by region.
 */

import XLSX from 'xlsx'
import fs from 'fs'

const excelFile = '/tmp/scb_kommun_2025.xls'

if (!fs.existsSync(excelFile)) {
  console.error('❌ Excel file not found:', excelFile)
  process.exit(1)
}

console.log('📖 Reading Excel file...')
const workbook = XLSX.readFile(excelFile)
const sheetName = workbook.SheetNames[0]
const worksheet = workbook.Sheets[sheetName]

console.log(`📊 Sheet name: ${sheetName}`)

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

console.log(`📝 Total rows: ${data.length}`)
console.log('📋 First 5 rows:')
data.slice(0, 5).forEach((row, i) => {
  console.log(`  Row ${i}:`, row)
})

// Parse municipalities grouped by region
const regions = new Map()
let currentRegion = null

data.forEach((row, index) => {
  // Skip header rows
  if (index < 2) return

  const [code, name] = row

  if (!code || !name) return

  const codeStr = String(code).trim()
  const nameStr = String(name).trim()

  // Region codes are 2 digits (01-25)
  if (codeStr.length === 2 && /^\d{2}$/.test(codeStr)) {
    currentRegion = codeStr
    if (!regions.has(currentRegion)) {
      regions.set(currentRegion, { name: nameStr, municipalities: [] })
    }
  }
  // Municipality codes are 4 digits
  else if (codeStr.length === 4 && /^\d{4}$/.test(codeStr) && currentRegion) {
    regions.get(currentRegion).municipalities.push({
      code: codeStr,
      name: nameStr,
      regionCode: currentRegion
    })
  }
})

// Generate JavaScript code
console.log('\n📝 Generating municipality data...\n')
console.log('const MUNICIPALITIES = [')

let totalMunicipalities = 0
for (const [regionCode, regionData] of regions) {
  if (regionData.municipalities.length === 0) continue

  console.log(`  // ${regionData.name} (${regionCode}) - ${regionData.municipalities.length} municipalities`)
  regionData.municipalities.forEach(muni => {
    console.log(`  { regionCode: '${muni.regionCode}', code: '${muni.code}', name: '${muni.name}' },`)
    totalMunicipalities++
  })
  console.log('')
}

console.log(']')
console.log(`\n✅ Total: ${totalMunicipalities} municipalities from ${regions.size} regions`)
