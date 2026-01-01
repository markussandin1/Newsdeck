/**
 * Storage Service
 *
 * Handles upload and deletion of traffic camera images to Google Cloud Storage.
 * Images are stored in a public bucket with the following structure:
 *   gs://bucket-name/{newsItemId}/{timestamp}.jpg
 *
 * Public URL format:
 *   https://storage.googleapis.com/{bucket-name}/{newsItemId}/{timestamp}.jpg
 */

import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const BUCKET_NAME = process.env.GCS_TRAFFIC_IMAGES_BUCKET!;

if (!BUCKET_NAME) {
  console.warn('⚠️ GCS_TRAFFIC_IMAGES_BUCKET not configured. Image uploads will fail.');
}

/**
 * Laddar upp trafikbild till GCS
 *
 * @param buffer - Image buffer från Trafikverket
 * @param newsItemId - UUID för NewsItem
 * @param timestamp - ISO timestamp för när bilden hämtades
 * @returns Public GCS URL till bilden
 * @throws Error om uppladdning misslyckas
 */
export async function uploadTrafficImage(
  buffer: Buffer,
  newsItemId: string,
  timestamp: string
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('GCS_TRAFFIC_IMAGES_BUCKET not configured');
  }

  // Sanitera timestamp för filnamn (ta bort : och andra invalid tecken)
  const sanitizedTimestamp = timestamp.replace(/:/g, '-').replace(/\./g, '-');
  const filename = `${newsItemId}/${sanitizedTimestamp}.jpg`;

  const file = storage.bucket(BUCKET_NAME).file(filename);

  await file.save(buffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=86400', // 24h cache
      metadata: {
        newsItemId,
        uploadedAt: new Date().toISOString()
      }
    }
  });

  // Return public URL
  const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;

  console.log(`✅ Uploaded image to GCS: ${publicUrl}`);

  return publicUrl;
}

/**
 * Raderar bild från GCS
 *
 * @param gcsPath - Full GCS URL eller path
 * @throws Error om radering misslyckas
 */
export async function deleteTrafficImage(gcsPath: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error('GCS_TRAFFIC_IMAGES_BUCKET not configured');
  }

  // Extrahera filename från full URL
  // Input: https://storage.googleapis.com/bucket-name/newsItemId/timestamp.jpg
  // Output: newsItemId/timestamp.jpg
  const filename = gcsPath.replace(`https://storage.googleapis.com/${BUCKET_NAME}/`, '');

  try {
    await storage.bucket(BUCKET_NAME).file(filename).delete();
    console.log(`🗑️ Deleted image from GCS: ${filename}`);
  } catch (error: any) {
    // Ignorera 404-fel (bilden finns redan inte)
    if (error?.code === 404) {
      console.log(`⚠️ Image already deleted: ${filename}`);
      return;
    }
    throw error;
  }
}

/**
 * Verifierar att bucket finns och är åtkomlig
 *
 * @returns true om bucket är OK
 */
export async function verifyBucket(): Promise<boolean> {
  if (!BUCKET_NAME) {
    return false;
  }

  try {
    const bucket = storage.bucket(BUCKET_NAME);
    const [exists] = await bucket.exists();

    if (!exists) {
      console.error(`❌ Bucket ${BUCKET_NAME} does not exist`);
      return false;
    }

    console.log(`✅ GCS bucket verified: ${BUCKET_NAME}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to verify bucket:`, error);
    return false;
  }
}
