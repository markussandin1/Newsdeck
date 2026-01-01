import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function findMismatches() {
  try {
    console.log('=== Finding items with mismatched municipality codes ===\n')

    // Get all municipalities for validation
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

    console.log(`Loaded ${municipalities.size} municipalities for validation\n`)

    // Find items where municipality code doesn't match municipality name
    const itemsResult = await pool.query(`
      SELECT
        db_id,
        title,
        municipality_code,
        region_code,
        location,
        timestamp,
        created_in_db
      FROM news_items
      WHERE
        municipality_code IS NOT NULL
        AND location IS NOT NULL
      ORDER BY created_in_db DESC
      LIMIT 1000
    `)

    console.log(`Checking ${itemsResult.rows.length} items...\n`)

    const mismatches = []

    itemsResult.rows.forEach(item => {
      const locationMuniName = item.location?.municipality?.toLowerCase()
      const locationMuniCode = item.location?.municipalityCode
      const locationName = item.location?.name?.toLowerCase()

      if (!locationMuniName && !locationName) {
        return // Skip items without municipality info in location
      }

      const dbMuniInfo = municipalities.get(item.municipality_code)
      if (!dbMuniInfo) {
        mismatches.push({
          db_id: item.db_id,
          title: item.title,
          problem: 'Invalid municipality code in database',
          dbCode: item.municipality_code,
          locationCode: locationMuniCode,
          locationMuni: locationMuniName,
          locationName: locationName,
          timestamp: item.timestamp
        })
        return
      }

      // Check if location mentions a different municipality
      const expectedMuniName = dbMuniInfo.name

      // Extract municipality name from "Kramfors kommun" or just "Kramfors"
      // Also remove genitive 's' ending
      const extractMuniName = (str) => {
        if (!str) return null
        return str
          .replace(/\s+kommun$/, '')  // Remove " kommun"
          .replace(/s$/, '')           // Remove trailing 's' (genitive)
          .trim()
      }

      const cleanLocationMuni = extractMuniName(locationMuniName)
      const cleanExpectedMuni = extractMuniName(expectedMuniName)

      // Check if location contains a different municipality name
      let possibleMismatch = false
      let suspectedMuni = null

      if (cleanLocationMuni && cleanLocationMuni !== cleanExpectedMuni) {
        possibleMismatch = true
        suspectedMuni = cleanLocationMuni
      } else if (locationName) {
        // Check if locationName contains another municipality name
        municipalities.forEach((info, code) => {
          const cleanMuniName = extractMuniName(info.name)
          if (code !== item.municipality_code &&
              cleanMuniName.length > 4 && // Avoid short false matches
              locationName.includes(cleanMuniName) &&
              !locationName.includes(cleanExpectedMuni)) {
            possibleMismatch = true
            suspectedMuni = cleanMuniName
          }
        })
      }

      if (possibleMismatch) {
        mismatches.push({
          db_id: item.db_id,
          title: item.title,
          problem: 'Municipality code mismatch',
          dbCode: item.municipality_code,
          dbMuniName: expectedMuniName,
          locationCode: locationMuniCode,
          locationMuni: locationMuniName,
          locationName: locationName,
          suspectedMuni: suspectedMuni,
          timestamp: item.timestamp
        })
      }
    })

    console.log(`\n=== Found ${mismatches.length} mismatches ===\n`)

    if (mismatches.length > 0) {
      mismatches.slice(0, 20).forEach((m, idx) => {
        console.log(`${idx + 1}. ${m.title}`)
        console.log(`   Problem: ${m.problem}`)
        console.log(`   DB code: ${m.dbCode} (${m.dbMuniName || 'INVALID'})`)
        console.log(`   Location code: ${m.locationCode || 'null'}`)
        console.log(`   Location muni: ${m.locationMuni || 'null'}`)
        console.log(`   Location name: ${m.locationName || 'null'}`)
        if (m.suspectedMuni) {
          console.log(`   Suspected correct: ${m.suspectedMuni}`)
        }
        console.log(`   Timestamp: ${m.timestamp}`)
        console.log('')
      })

      if (mismatches.length > 20) {
        console.log(`... and ${mismatches.length - 20} more\n`)
      }

      // Group by municipality code to see patterns
      console.log('\n=== Mismatches by municipality code ===\n')
      const byCode = new Map()
      mismatches.forEach(m => {
        const count = byCode.get(m.dbCode) || 0
        byCode.set(m.dbCode, count + 1)
      })

      Array.from(byCode.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([code, count]) => {
          const info = municipalities.get(code)
          console.log(`${code} (${info?.name || 'INVALID'}): ${count} items`)
        })
    } else {
      console.log('✅ No mismatches found!')
    }

  } catch (err) {
    console.error('Error:', err.message)
    console.error(err.stack)
  } finally {
    await pool.end()
  }
}

findMismatches()
