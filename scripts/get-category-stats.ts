import { Pool } from 'pg';
import { parse as parseConnectionString } from 'pg-connection-string';
import { logger } from '../lib/logger';

// This is a simplified version of the getPool logic from lib/db-postgresql.ts
// It's self-contained to avoid issues with module paths in scripts.
const getPool = (): Pool => {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  let config: any = parseConnectionString(DATABASE_URL);

  const poolConfig = {
      ...config,
      port: parseInt(config.port, 10),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
  };

  // Adjust for non-production environments if necessary
  if (process.env.NODE_ENV !== 'production') {
    poolConfig.ssl = false;
  }

  return new Pool(poolConfig);
};

async function getCategoryStats() {
  console.log('Connecting to the database to fetch category stats...');
  // Load .env file
  const dotenv = await import('dotenv');
  dotenv.config({ path: './.env.local' });
  dotenv.config();

  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('Executing query...');
    const result = await client.query(
      `SELECT category, COUNT(*) as count 
       FROM news_items 
       WHERE category IS NOT NULL AND category != '' 
       GROUP BY category 
       ORDER BY count DESC`
    );

    console.log('Query successful. Category stats:');
    console.log(JSON.stringify(result.rows, null, 2));

  } catch (error) {
    logger.error('Error fetching category stats:', { error });
    console.error('Failed to fetch category stats:', error);
  } finally {
    await client.release();
    await pool.end();
    console.log('Database connection closed.');
  }
}

getCategoryStats();
