-- Migration: Add unique constraint for source_id to prevent duplicates
-- This ensures that the same external source ID cannot be inserted multiple times

-- Create a partial unique index on source_id (only when NOT NULL)
-- This allows multiple NULL source_ids but prevents duplicate non-NULL source_ids
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_items_unique_source_id
ON news_items(source_id)
WHERE source_id IS NOT NULL;

-- Note: This is a partial index because:
-- 1. source_id can be NULL for items without an external ID
-- 2. We only want to prevent duplicates for items that DO have a source_id
-- 3. Multiple NULL values are allowed (NULL != NULL in SQL)
