import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

/**
 * Script to fix municipality codes that don't match location data
 *
 * Usage:
 *   node scripts/fix-municipality-codes.mjs --dry-run    # Show what would be fixed
 *   node scripts/fix-municipality-codes.mjs --fix        # Actually fix the data
 */

const DRY_RUN = !process.argv.includes('--fix')

async function fixMunicipalityCodes() {
  try {
    console.log('=== Fixing Municipality Codes ===')
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'FIX MODE (will update database)'}\n`)

    // Load all municipalities and their mappings
    const municipalitiesResult = await pool.query(`
      SELECT code, name, region_code
      FROM municipalities
      ORDER BY code
    `)

    const municipalities = new Map()
    municipalitiesResult.rows.forEach(row => {
      municipalities.set(row.code, {
        name: row.name.toLowerCase(),
        regionCode: row.region_code
      })
    })

    // Load location name mappings
    const mappingsResult = await pool.query(`
      SELECT variant, municipality_code, region_code, match_priority
      FROM location_name_mappings
      WHERE municipality_code IS NOT NULL
      ORDER BY match_priority DESC
    `)

    const variantToCode = new Map()
    mappingsResult.rows.forEach(row => {
      const key = row.variant.toLowerCase()
      if (!variantToCode.has(key) || row.match_priority > variantToCode.get(key).priority) {
        variantToCode.set(key, {
          code: row.municipality_code,
          priority: row.match_priority
        })
      }
    })

    console.log(`Loaded ${municipalities.size} municipalities`)
    console.log(`Loaded ${variantToCode.size} name variants\n`)

    // Find items with mismatched codes
    const itemsResult = await pool.query(`
      SELECT
        db_id,
        title,
        municipality_code,
        region_code,
        location,
        timestamp
      FROM news_items
      WHERE
        municipality_code IS NOT NULL
        AND location IS NOT NULL
      ORDER BY created_in_db DESC
      LIMIT 1000
    `)

    console.log(`Checking ${itemsResult.rows.length} items...\n`)

    const fixes = []

    for (const item of itemsResult.rows) {
      const locationMuni = item.location?.municipality?.toLowerCase()
      const locationName = item.location?.name?.toLowerCase()

      if (!locationMuni && !locationName) continue

      // Extract municipality name from location
      const extractMuniName = (str) => {
        if (!str) return null
        // Remove " kommun" suffix and common variations
        return str
          .replace(/\s+kommun$/, '')
          .replace(/\s+municipalit(y|et)$/, '')
          .trim()
      }

      const cleanLocationMuni = extractMuniName(locationMuni)

      // Try to find correct municipality code
      let correctCode = null
      let matchType = null

      // 1. Direct exact match from location.municipality
      if (cleanLocationMuni) {
        const mapping = variantToCode.get(cleanLocationMuni)
        if (mapping) {
          correctCode = mapping.code
          matchType = 'exact_municipality'
        } else {
          // Try without genitive 's'
          const withoutS = cleanLocationMuni.replace(/s$/, '')
          const mapping2 = variantToCode.get(withoutS)
          if (mapping2) {
            correctCode = mapping2.code
            matchType = 'municipality_without_s'
          }
        }
      }

      // 2. Try to extract from location.name (e.g., "Kramfors" from "Strinne, Kramfors")
      if (!correctCode && locationName) {
        const parts = locationName.split(',').map(p => p.trim())
        for (const part of parts) {
          const cleanPart = extractMuniName(part)
          const mapping = variantToCode.get(cleanPart)
          if (mapping) {
            correctCode = mapping.code
            matchType = 'location_name_part'
            break
          }
        }
      }

      // Check if we found a different code than what's in database
      if (correctCode && correctCode !== item.municipality_code) {
        const currentMuni = municipalities.get(item.municipality_code)
        const correctMuni = municipalities.get(correctCode)

        fixes.push({
          db_id: item.db_id,
          title: item.title,
          currentCode: item.municipality_code,
          currentName: currentMuni?.name || 'UNKNOWN',
          correctCode: correctCode,
          correctName: correctMuni?.name || 'UNKNOWN',
          matchType: matchType,
          locationMuni: cleanLocationMuni,
          locationName: locationName,
          timestamp: item.timestamp
        })
      }
    }

    console.log(`\n=== Found ${fixes.length} items to fix ===\n`)

    if (fixes.length === 0) {
      console.log('✅ No fixes needed!')
      return
    }

    // Show first 20 fixes
    fixes.slice(0, 20).forEach((fix, idx) => {
      console.log(`${idx + 1}. ${fix.title}`)
      console.log(`   Current: ${fix.currentCode} (${fix.currentName})`)
      console.log(`   Correct: ${fix.correctCode} (${fix.correctName})`)
      console.log(`   Match type: ${fix.matchType}`)
      console.log(`   Location muni: ${fix.locationMuni || 'null'}`)
      console.log('')
    })

    if (fixes.length > 20) {
      console.log(`... and ${fixes.length - 20} more\n`)
    }

    // Group by current code
    console.log('\n=== Fixes by current municipality code ===\n')
    const byCurrentCode = new Map()
    fixes.forEach(fix => {
      const key = `${fix.currentCode} → ${fix.correctCode}`
      const count = byCurrentCode.get(key) || 0
      byCurrentCode.set(key, count + 1)
    })

    Array.from(byCurrentCode.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => {
        console.log(`${key}: ${count} items`)
      })

    // Apply fixes if not dry run
    if (!DRY_RUN) {
      console.log(`\n=== Applying ${fixes.length} fixes ===\n`)

      let updated = 0
      for (const fix of fixes) {
        const result = await pool.query(`
          UPDATE news_items
          SET municipality_code = $1
          WHERE db_id = $2
        `, [fix.correctCode, fix.db_id])

        if (result.rowCount > 0) {
          updated++
          if (updated % 50 === 0) {
            console.log(`Updated ${updated}/${fixes.length} items...`)
          }
        }
      }

      console.log(`\n✅ Successfully updated ${updated} items!`)
      console.log('\nNote: You should also refresh column_data to sync the changes:')
      console.log('  - Items will be re-ingested automatically on next update from Workflows')
      console.log('  - Or you can manually trigger re-ingestion for affected columns')
    } else {
      console.log('\n⚠️  DRY RUN MODE - No changes made')
      console.log('Run with --fix to apply these changes')
    }

  } catch (err) {
    console.error('Error:', err.message)
    console.error(err.stack)
  } finally {
    await pool.end()
  }
}

fixMunicipalityCodes()
