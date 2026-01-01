
import { trafficCameraService } from './lib/services/traffic-camera-service';
import { getPool } from './lib/db-postgresql';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function check() {
  const lat = 57.4108631639055;
  const lon = 12.2172045347652;
  console.log(`Checking cameras near ${lat}, ${lon}...`);
  const cam = await trafficCameraService.findNearestCamera(lat, lon, 20);
  console.log('Nearest camera:', cam);
  await getPool().end();
}
check();
