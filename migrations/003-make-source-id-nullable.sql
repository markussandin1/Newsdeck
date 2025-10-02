-- Migration: Make source_id nullable
-- Date: 2025-10-02
-- Description: Allow source_id to be NULL since it's optional metadata

ALTER TABLE news_items ALTER COLUMN source_id DROP NOT NULL;
