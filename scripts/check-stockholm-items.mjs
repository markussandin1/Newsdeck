#!/usr/bin/env node
import { config } from 'dotenv'
import pg from 'pg'

config({ path: '.env.local' })
config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function check() {
  console.log('Checking Stockholm items...\n')
  
  const result = await pool.query(`
    SELECT 
      title,
      (location->>'municipality') as loc_municipality,
      (location->>'county') as loc_county,
      (location->>'name') as loc_name,
      municipality_code,
      region_code
    FROM news_items
    WHERE region_code = 'AB' OR municipality_code = '0180'
    ORDER BY created_in_db DESC
    LIMIT 20
  `)

  console.log('Found ' + result.rows.length + ' Stockholm-area items:\n')
  
  let withMuniCode = 0
  let withRegionOnly = 0
  
  result.rows.forEach(row => {
    const hasMuni = !!row.municipality_code
    if (hasMuni) withMuniCode++
    else withRegionOnly++
    
    console.log('Title: ' + row.title.substring(0, 50))
    console.log('  Raw: municipality="' + (row.loc_municipality || 'null') + '", county="' + (row.loc_county || 'null') + '"')
    console.log('  Normalized: municipalityCode=' + (row.municipality_code || 'NULL') + ', regionCode=' + (row.region_code || 'NULL'))
    console.log()
  })

  console.log('SUMMARY:')
  console.log('Items with municipalityCode: ' + withMuniCode)
  console.log('Items with ONLY regionCode: ' + withRegionOnly)
  console.log()
  
  if (withRegionOnly > 0) {
    console.log('PROBLEM IDENTIFIED:')
    console.log('Most items have regionCode (län) but NOT municipalityCode!')
    console.log('This is why filtering by Stockholm kommun shows no results.')
    console.log()
    console.log('Root cause: Source data has county but not municipality.')
  }

  await pool.end()
}

check().catch(console.error)
