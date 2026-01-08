#!/usr/bin/env node

/**
 * Generate SCB JSON from CSV
 *
 * Creates a corrected SE_SCB.json file from official SCB CSV data.
 *
 * Usage: node scripts/generate-scb-json-from-csv.mjs
 *
 * Input:  kommunlankod_2025.csv
 * Output: data/geo/SE_SCB_corrected.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Paths
const CSV_PATH = path.join(rootDir, 'kommunlankod_2025.csv');
const OUTPUT_PATH = path.join(rootDir, 'data/geo/SE_SCB_corrected.json');

/**
 * Parse official SCB CSV and generate JSON structure
 */
function generateJSON() {
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n');

  const subdivisions = [];
  let currentRegion = null;

  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 2) continue;

    const code = parts[0].trim();
    const name = parts[1].trim();

    if (!code || !name || code === 'Kod' || code === 'Code') continue;

    // 2-digit codes are regions (län)
    if (code.length === 2) {
      currentRegion = code;
      subdivisions.push({
        level: 1,
        code: `SE-${code}`,
        name: name,
        type: 'county'
      });
    }
    // 4-digit codes are municipalities
    else if (code.length === 4) {
      if (!currentRegion) {
        console.warn(`⚠️  Warning: Municipality ${code} (${name}) has no parent region`);
        continue;
      }

      subdivisions.push({
        level: 2,
        code: `SE-${code}`,
        name: name,
        type: 'municipality',
        parent: `SE-${currentRegion}`
      });
    }
  }

  return {
    country: 'SE',
    subdivisions: subdivisions
  };
}

/**
 * Main function
 */
function main() {
  console.log('🏗️  Generating corrected SE_SCB.json from official CSV...\n');

  // Check input file exists
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ Error: kommunlankod_2025.csv not found at ${CSV_PATH}`);
    process.exit(1);
  }

  // Generate JSON
  const jsonData = generateJSON();

  // Count regions and municipalities
  const regions = jsonData.subdivisions.filter(s => s.level === 1);
  const municipalities = jsonData.subdivisions.filter(s => s.level === 2);

  console.log(`✅ Generated structure:`);
  console.log(`   - ${regions.length} regions (län)`);
  console.log(`   - ${municipalities.length} municipalities (kommuner)`);
  console.log(`   - Total: ${jsonData.subdivisions.length} subdivisions\n`);

  // Write to file
  const jsonString = JSON.stringify(jsonData, null, 2);
  fs.writeFileSync(OUTPUT_PATH, jsonString, 'utf-8');

  console.log(`✅ Written to: ${OUTPUT_PATH}\n`);

  // Show sample (first 5 municipalities)
  console.log('📋 Sample (first 5 municipalities):');
  municipalities.slice(0, 5).forEach(m => {
    const code = m.code.replace(/^SE-/, '');
    console.log(`   ${code}: ${m.name}`);
  });

  console.log(`\n✅ Success! Now run verify-scb-codes.mjs to confirm all codes are correct.`);
}

main();
