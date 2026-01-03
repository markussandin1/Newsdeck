-- Migration 005: Gallery Page Performance Index
-- Optimizes queries for traffic camera gallery page
-- Created: 2026-01-03

-- Partial index for gallery queries
-- Only indexes items with ready traffic camera images
-- Sorts by timestamp DESC for chronological display
CREATE INDEX IF NOT EXISTS idx_gallery_traffic_cameras
ON news_items (timestamp DESC)
WHERE
  extra->'trafficCamera'->>'currentUrl' IS NOT NULL
  AND extra->'trafficCamera'->>'status' = 'ready';

COMMENT ON INDEX idx_gallery_traffic_cameras IS
'Optimizes gallery page queries. Partial index only covers items with ready traffic camera images.';

-- Rollback instructions:
-- DROP INDEX IF EXISTS idx_gallery_traffic_cameras;
