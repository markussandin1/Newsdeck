#!/usr/bin/env node

/**
 * Simple migration runner
 * Usage: node scripts/run-migration.js migrations/001-add-user-features.sql
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
}

loadEnv()

async function runMigration(migrationFile) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('✓ Connected to database')

    const sql = fs.readFileSync(migrationFile, 'utf8')
    console.log(`Running migration: ${path.basename(migrationFile)}`)

    await client.query(sql)
    console.log('✓ Migration completed successfully')
  } catch (error) {
    console.error('✗ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage: node scripts/run-migration.js <migration-file>')
  process.exit(1)
}

runMigration(migrationFile)
