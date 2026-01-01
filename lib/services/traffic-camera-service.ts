import { getPool } from '../db-postgresql'
import { logger } from '../logger'

export interface TrafficCamera {
  id: string
  name: string
  description?: string
  latitude: number
  longitude: number
  photoUrl: string
  photoTime?: string
  direction?: string
  cameraType?: string
  active: boolean
  deleted: boolean
}

export const trafficCameraService = {
  /**
   * Upsert multiple traffic cameras into the database
   */
  upsertCameras: async (cameras: TrafficCamera[]) => {
    const pool = getPool()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const camera of cameras) {
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
            camera.id,
            camera.name,
            camera.description || null,
            camera.latitude,
            camera.longitude,
            camera.photoUrl,
            camera.photoTime || null,
            camera.direction || null,
            camera.cameraType || null,
            camera.active,
            camera.deleted
          ]
        )
      }

      await client.query('COMMIT')
      logger.info('trafficCameraService.upsertCameras.success', { count: cameras.length })
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('trafficCameraService.upsertCameras.error', { error })
      throw error
    } finally {
      client.release()
    }
  },

  /**
   * Find the nearest traffic camera to a given point
   * Uses the Haversine formula for distance calculation in SQL
   * Returns distance in kilometers
   */
  findNearestCamera: async (lat: number, lon: number, maxDistanceKm: number = 10) => {
    const pool = getPool()

    try {
      const query = `
        SELECT 
          id, name, photo_url as "photoUrl", photo_time as "photoTime",
          latitude, longitude,
          (
            6371 * acos(
              cos(radians($1)) * cos(radians(latitude)) * 
              cos(radians(longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(latitude))
            )
          ) AS distance
        FROM traffic_cameras
        WHERE active = true AND deleted = false
        AND latitude BETWEEN $1 - ($3 / 111.0) AND $1 + ($3 / 111.0)
        AND longitude BETWEEN $2 - ($3 / (111.0 * cos(radians($1)))) AND $2 + ($3 / (111.0 * cos(radians($1))))
        ORDER BY distance
        LIMIT 1
      `
      
      const result = await pool.query(query, [lat, lon, maxDistanceKm])
      
      if (result.rows.length === 0) return null
      
      const nearest = result.rows[0]
      if (nearest.distance > maxDistanceKm) return null
      
      return {
        id: nearest.id,
        name: nearest.name,
        photoUrl: nearest.photoUrl,
        photoTime: nearest.photoTime,
        distance: nearest.distance
      }
    } catch (error) {
      logger.error('trafficCameraService.findNearestCamera.error', { error, lat, lon })
      return null
    }
  },

  /**
   * Fetch live camera data from Trafikverket API
   * Used to get the absolute latest image URL and timestamp at the moment of an event
   */
  fetchLiveCameraData: async (cameraId: string) => {
    try {
      const apiKey = process.env.TRAFIKVERKET_API_KEY || 'e525079af6474863a80d6155890396c2'
      const xmlRequest = `
        <REQUEST>
            <LOGIN authenticationkey="${apiKey}" />
            <QUERY objecttype="Camera" schemaversion="1.0">
                <FILTER>
                    <EQ name="Id" value="${cameraId}" />
                </FILTER>
                <INCLUDE>Id</INCLUDE>
                <INCLUDE>PhotoUrl</INCLUDE>
                <INCLUDE>PhotoTime</INCLUDE>
            </QUERY>
        </REQUEST>`

      const response = await fetch('https://api.trafikinfo.trafikverket.se/v2/data.json', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xmlRequest
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const camera = data?.RESPONSE?.RESULT?.[0]?.Camera?.[0]

      if (!camera) return null

      return {
        id: camera.Id,
        photoUrl: camera.PhotoUrl,
        photoTime: camera.PhotoTime
      }
    } catch (error) {
      logger.error('trafficCameraService.fetchLiveCameraData.error', { error, cameraId })
      return null
    }
  }
}
