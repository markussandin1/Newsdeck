#!/usr/bin/env node

/**
 * Cloud SQL Proxy Health Check
 *
 * Verifies that the Cloud SQL Proxy is running before starting dev server.
 * Used by `npm run dev:full` to ensure database connectivity.
 *
 * Exit codes:
 * - 0: Proxy is running
 * - 1: Proxy is not running
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function checkProxy() {
  try {
    // Check if proxy process is running
    const { stdout } = await execAsync(
      'ps aux | grep "cloud-sql-proxy.*newsdeck" | grep -v grep'
    )

    if (stdout.trim()) {
      console.log('✅ Cloud SQL Proxy is running')
      console.log('')
      // Show which process is running
      const processLine = stdout.trim().split('\n')[0]
      const parts = processLine.split(/\s+/)
      const pid = parts[1]
      console.log(`   PID: ${pid}`)
      console.log(`   Port: 5432 (localhost)`)
      console.log('')
      return true
    }
  } catch (error) {
    // grep returns exit code 1 if no match found
  }

  // Proxy not running
  console.error('╔════════════════════════════════════════════════════════╗')
  console.error('║  ❌ Cloud SQL Proxy is NOT running                    ║')
  console.error('╚════════════════════════════════════════════════════════╝')
  console.error('')
  console.error('The application requires Cloud SQL Proxy to connect to')
  console.error('the production database when developing locally.')
  console.error('')
  console.error('🚀 Start it with:')
  console.error('   npm run proxy:start')
  console.error('')
  console.error('💡 Or set up auto-start (recommended):')
  console.error('   npm run proxy:autostart')
  console.error('')
  console.error('📚 For more help, see:')
  console.error('   docs/LOCAL_DEVELOPMENT.md')
  console.error('')

  process.exit(1)
}

checkProxy()
