#!/usr/bin/env node
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkQueue() {
  try {
    console.log('📊 Checking image upload queue...\n');

    // Queue status summary
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count, MAX(created_at) as latest
      FROM image_upload_queue
      GROUP BY status
      ORDER BY status
    `);

    console.log('Queue Status:');
    console.table(statusResult.rows);

    // Recent jobs
    const recentResult = await pool.query(`
      SELECT id, status, retry_count, error_message, created_at, processed_at
      FROM image_upload_queue
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\nRecent Jobs:');
    console.table(recentResult.rows);

    // Check GCS images
    const imagesResult = await pool.query(`
      SELECT COUNT(*) as count, MAX(created_at) as latest
      FROM traffic_images
    `);

    console.log('\nGCS Images:');
    console.table(imagesResult.rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkQueue();
