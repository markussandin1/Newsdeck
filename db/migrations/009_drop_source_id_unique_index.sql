-- Migration 009: Drop unique index on source_id
-- Each incoming event is now treated as unique (identified by db_id UUID).
-- Deduplication is the responsibility of the Workflows system.
DROP INDEX IF EXISTS idx_news_items_unique_source_id;
