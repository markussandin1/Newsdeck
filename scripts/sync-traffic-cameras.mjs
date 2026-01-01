import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const { Pool } = pg;

const TRAFIKVERKET_API_KEY = process.env.TRAFIKVERKET_API_KEY || 'e525079af6474863a80d6155890396c2';
const API_URL = 'https://api.trafikinfo.trafikverket.se/v2/data.json';

const xmlRequest = `
<REQUEST>
    <LOGIN authenticationkey="${TRAFIKVERKET_API_KEY}" />
    <QUERY objecttype="Camera" schemaversion="1">
        <FILTER>
            <AND>
                <EQ name="Active" value="true" />
                <EQ name="Deleted" value="false" />
            </AND>
        </FILTER>
        <INCLUDE>Id</INCLUDE>
        <INCLUDE>Name</INCLUDE>
        <INCLUDE>Description</INCLUDE>
        <INCLUDE>Geometry</INCLUDE>
        <INCLUDE>PhotoUrl</INCLUDE>
        <INCLUDE>PhotoTime</INCLUDE>
        <INCLUDE>Direction</INCLUDE>
        <INCLUDE>Type</INCLUDE>
    </QUERY>
</REQUEST>
`;

async function syncTrafficCameras() {
  console.log('🔄 Fetching traffic cameras from Trafikverket...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml'
      },
      body: xmlRequest
    });

    if (!response.ok) {
      throw new Error(`Trafikverket API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const cameras = data.RESPONSE.RESULT[0].Camera;

    if (!Array.isArray(cameras)) {
      throw new Error('Unexpected API response format: Camera list not found');
    }

    console.log(`✅ Received ${cameras.length} cameras. Syncing to database...`);

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      let upsertCount = 0;
      for (const cam of cameras) {
        // Parse WGS84: "POINT (longitude latitude)"
        const wgs84 = cam.Geometry?.WGS84;
        const match = wgs84?.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/);
        
        if (!match) continue;

        const lon = parseFloat(match[1]);
        const lat = parseFloat(match[2]);

        await client.query(
          `INSERT INTO traffic_cameras (
            id, name, description, latitude, longitude, photo_url, 
            photo_time, direction, camera_type, active, deleted, last_synced
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            photo_url = EXCLUDED.photo_url,
            photo_time = EXCLUDED.photo_time,
            direction = EXCLUDED.direction,
            camera_type = EXCLUDED.camera_type,
            active = EXCLUDED.active,
            deleted = EXCLUDED.deleted,
            last_synced = CURRENT_TIMESTAMP`,
          [
            cam.Id,
            cam.Name || 'Namnlös kamera',
            cam.Description || null,
            lat,
            lon,
            cam.PhotoUrl,
            cam.PhotoTime || null,
            cam.Direction?.toString() || null,
            cam.Type || null,
            true,
            false
          ]
        );
        upsertCount++;
      }

      await client.query('COMMIT');
      console.log(`✅ Successfully synced ${upsertCount} cameras to database.`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
    }

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncTrafficCameras();
