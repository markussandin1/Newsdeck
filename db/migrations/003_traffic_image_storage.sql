-- Migration 003: Traffic Image Storage System
--
-- This migration adds support for asynchronous image upload queue and
-- intelligent cleanup tracking for traffic camera images stored in GCS.
--
-- Created: 2026-01-02

-- Queue för asynkron bilduppladdning
-- Hanterar uppladdning av trafikbilder från Trafikverket till GCS
CREATE TABLE IF NOT EXISTS image_upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_item_db_id UUID NOT NULL REFERENCES news_items(db_id) ON DELETE CASCADE,
  camera_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Index för att snabbt hitta nästa pending job
CREATE INDEX IF NOT EXISTS idx_upload_queue_status ON image_upload_queue(status, created_at);

-- Index för cleanup av gamla completed/failed jobs
CREATE INDEX IF NOT EXISTS idx_upload_queue_processed ON image_upload_queue(processed_at)
  WHERE status IN ('completed', 'failed');

-- Spåra bilder i GCS för intelligent cleanup
-- Kopplar bilder till NewsItems för att veta när de kan raderas
CREATE TABLE IF NOT EXISTS traffic_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_item_db_id UUID NOT NULL REFERENCES news_items(db_id) ON DELETE CASCADE,
  gcs_path TEXT NOT NULL,
  captured_at TIMESTAMP NOT NULL,
  marked_for_deletion BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index för att hitta bilder per NewsItem
CREATE INDEX IF NOT EXISTS idx_traffic_images_news_item ON traffic_images(news_item_db_id);

-- Index för cleanup (hitta markerade bilder)
CREATE INDEX IF NOT EXISTS idx_traffic_images_deletion ON traffic_images(marked_for_deletion, created_at)
  WHERE marked_for_deletion = true;

-- Index för att hitta orphaned bilder (NewsItems utan kolumner)
CREATE INDEX IF NOT EXISTS idx_traffic_images_orphan_check ON traffic_images(news_item_db_id)
  WHERE marked_for_deletion = false;

-- Kommentar på tabellerna för dokumentation
COMMENT ON TABLE image_upload_queue IS 'Queue för asynkron uppladdning av trafikbilder till GCS. Worker processar pending jobs kontinuerligt.';
COMMENT ON TABLE traffic_images IS 'Spårar GCS-lagrade bilder för intelligent cleanup. Bilder raderas när NewsItem försvinner från alla kolumner.';

-- Kommentarer på viktiga kolumner
COMMENT ON COLUMN image_upload_queue.status IS 'pending = väntar på processing, processing = håller på, completed = klart, failed = misslyckades efter retries';
COMMENT ON COLUMN image_upload_queue.retry_count IS 'Antal försök. Max 3 retries innan status blir failed.';
COMMENT ON COLUMN traffic_images.marked_for_deletion IS 'Sätts till true när NewsItem inte finns i några kolumner längre. Raderas efter 7 dagar.';
COMMENT ON COLUMN traffic_images.gcs_path IS 'Full GCS URL: https://storage.googleapis.com/bucket/newsItemId/timestamp.jpg';
