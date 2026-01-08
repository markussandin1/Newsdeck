#!/usr/bin/env node

/**
 * Verify SCB Codes
 *
 * Compares municipality codes in our SE_SCB.json file against official SCB data
 * from kommunlankod_2025.csv to identify any mismatches.
 *
 * Usage: node scripts/verify-scb-codes.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Paths
const CSV_PATH = path.join(rootDir, 'kommunlankod_2025.csv');
const JSON_PATH = path.join(rootDir, 'data/geo/SE_SCB.json');

/**
 * Parse official SCB CSV file
 * @returns {Map<string, string>} Map of code -> name
 */
function parseOfficialCSV() {
  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n');

  const municipalities = new Map();
  const regions = new Map();

  for (const line of lines) {
    const parts = line.split(';');
    if (parts.length < 2) continue;

    const code = parts[0].trim();
    const name = parts[1].trim();

    if (!code || !name || code === 'Kod' || code === 'Code') continue;

    // 2-digit codes are regions
    if (code.length === 2) {
      regions.set(code, name);
    }
    // 4-digit codes are municipalities
    else if (code.length === 4) {
      municipalities.set(code, name);
    }
  }

  console.log(`✅ Parsed official CSV: ${regions.size} regions, ${municipalities.size} municipalities`);
  return { municipalities, regions };
}

/**
 * Parse our current SE_SCB.json file
 * @returns {Map<string, string>} Map of code -> name
 */
function parseCurrentJSON() {
  const content = fs.readFileSync(JSON_PATH, 'utf-8');
  const data = JSON.parse(content);

  const municipalities = new Map();
  const regions = new Map();

  for (const subdivision of data.subdivisions) {
    // Remove "SE-" prefix
    const code = subdivision.code.replace(/^SE-/, '');
    const name = subdivision.name;

    if (subdivision.level === 1) {
      regions.set(code, name);
    } else if (subdivision.level === 2) {
      municipalities.set(code, name);
    }
  }

  console.log(`✅ Parsed current JSON: ${regions.size} regions, ${municipalities.size} municipalities`);
  return { municipalities, regions };
}

/**
 * Compare two maps and report mismatches
 */
function compareMaps(official, current, type) {
  const mismatches = [];
  const missing = [];
  const extra = [];

  // Check for mismatches and missing entries
  for (const [code, officialName] of official.entries()) {
    if (!current.has(code)) {
      missing.push({ code, name: officialName });
    } else if (current.get(code) !== officialName) {
      mismatches.push({
        code,
        official: officialName,
        current: current.get(code)
      });
    }
  }

  // Check for extra entries
  for (const [code, currentName] of current.entries()) {
    if (!official.has(code)) {
      extra.push({ code, name: currentName });
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`${type.toUpperCase()} VERIFICATION`);
  console.log('='.repeat(80));

  if (mismatches.length === 0 && missing.length === 0 && extra.length === 0) {
    console.log(`✅ All ${type} codes are CORRECT!`);
    return true;
  }

  if (mismatches.length > 0) {
    console.log(`\n❌ MISMATCHES (${mismatches.length}):`);
    console.log('Code  | Official SCB Name       | Current JSON Name');
    console.log('------|-------------------------|------------------------');
    for (const { code, official, current } of mismatches) {
      console.log(`${code.padEnd(6)}| ${official.padEnd(24)}| ${current}`);
    }
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  MISSING (${missing.length}):`);
    for (const { code, name } of missing) {
      console.log(`  ${code}: ${name}`);
    }
  }

  if (extra.length > 0) {
    console.log(`\n⚠️  EXTRA (${extra.length}):`);
    for (const { code, name } of extra) {
      console.log(`  ${code}: ${name}`);
    }
  }

  return false;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Verifying SCB municipality codes...\n');

  // Check files exist
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ Error: kommunlankod_2025.csv not found at ${CSV_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ Error: SE_SCB.json not found at ${JSON_PATH}`);
    process.exit(1);
  }

  // Parse files
  const official = parseOfficialCSV();
  const current = parseCurrentJSON();

  // Compare
  const regionsOK = compareMaps(official.regions, current.regions, 'regions');
  const municipalitiesOK = compareMaps(official.municipalities, current.municipalities, 'municipalities');

  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));

  if (regionsOK && municipalitiesOK) {
    console.log('✅ All codes are correct!');
    process.exit(0);
  } else {
    console.log('❌ Data corruption detected. SE_SCB.json needs to be regenerated.');
    console.log('\n📝 Next step: Run generate-scb-json-from-csv.mjs to create corrected file');
    process.exit(1);
  }
}

main();
