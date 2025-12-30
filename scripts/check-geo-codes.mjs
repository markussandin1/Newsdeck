#!/usr/bin/env node

/**
 * Check geographic codes in news_items table
 *
 * This script helps diagnose geographic filtering issues by showing
 * what geographic codes are actually stored in the database.
 */

import { config } from 'dotenv'
import pg from 'pg'

config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

async function checkGeoCodes() {
  try {
    console.log('Checking geographic codes in news_items...\n')

    // Get sample of recent news items with their geo codes
    const recentItems = await pool.query(`
      SELECT
        title,
        (location->>'municipality') as loc_municipality,
        (location->>'county') as loc_county,
        (location->>'name') as loc_name,
        country_code,
        region_code,
        municipality_code,
        created_in_db
      FROM news_items
      ORDER BY created_in_db DESC
      LIMIT 20
    `)

    console.log('Recent news items (last 20):')
    console.log('=' .repeat(120))

    for (const row of recentItems.rows) {
      console.log(`Title: ${row.title.substring(0, 60)}...`)
      console.log(`  Location (raw): municipality="${row.loc_municipality || 'null'}", county="${row.loc_county || 'null'}", name="${row.loc_name || 'null'}"`)
      console.log(`  Normalized:     countryCode=${row.country_code || 'null'}, regionCode=${row.region_code || 'null'}, municipalityCode=${row.municipality_code || 'null'}`)
      console.log(`  Created: ${row.created_in_db}`)
      console.log()
    }

    // Get statistics on how many items have each type of geographic code
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(country_code) as has_country,
        COUNT(region_code) as has_region,
        COUNT(municipality_code) as has_municipality
      FROM news_items
      WHERE created_in_db > NOW() - INTERVAL '24 hours'
    `)

    console.log('\nStatistics (last 24 hours):')
    console.log('=' .repeat(80))
    console.log(`Total items:           ${stats.rows[0].total}`)
    console.log(`Has country_code:      ${stats.rows[0].has_country} (${Math.round(100 * stats.rows[0].has_country / stats.rows[0].total)}%)`)
    console.log(`Has region_code:       ${stats.rows[0].has_region} (${Math.round(100 * stats.rows[0].has_region / stats.rows[0].total)}%)`)
    console.log(`Has municipality_code: ${stats.rows[0].has_municipality} (${Math.round(100 * stats.rows[0].has_municipality / stats.rows[0].total)}%)`)

    // Check for items with region but no municipality
    const regionOnly = await pool.query(`
      SELECT
        COUNT(*) as count,
        region_code
      FROM news_items
      WHERE created_in_db > NOW() - INTERVAL '24 hours'
        AND region_code IS NOT NULL
        AND municipality_code IS NULL
      GROUP BY region_code
      ORDER BY count DESC
    `)

    console.log('\nItems with region_code but NO municipality_code (last 24 hours):')
    console.log('=' .repeat(80))
    for (const row of regionOnly.rows) {
      console.log(`Region ${row.region_code}: ${row.count} items`)
    }

    // Check Stockholm-specific items
    const stockholm = await pool.query(`
      SELECT
        title,
        (location->>'municipality') as loc_municipality,
        (location->>'county') as loc_county,
        region_code,
        municipality_code
      FROM news_items
      WHERE created_in_db > NOW() - INTERVAL '24 hours'
        AND (
          region_code = 'AB'
          OR municipality_code = '0180'
          OR (location->>'municipality') ILIKE '%stockholm%'
          OR (location->>'county') ILIKE '%stockholm%'
        )
      ORDER BY created_in_db DESC
      LIMIT 10
    `)

    console.log('\nStockholm-related items (last 24 hours):')
    console.log('=' .repeat(120))
    for (const row of stockholm.rows) {
      console.log(`Title: ${row.title.substring(0, 60)}...`)
      console.log(`  Raw location: municipality="${row.loc_municipality || 'null'}", county="${row.loc_county || 'null'}"`)
      console.log(`  Normalized:   regionCode=${row.region_code || 'null'}, municipalityCode=${row.municipality_code || 'null'}`)
      console.log()
    }

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

checkGeoCodes()
