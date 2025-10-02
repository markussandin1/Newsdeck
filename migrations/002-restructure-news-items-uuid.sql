-- Migration: Restructure news_items to use UUID as PRIMARY KEY
-- Date: 2025-10-02
-- Description: Change from source 'id' to generated 'db_id' as PRIMARY KEY

-- Step 1: Add new columns to news_items
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS db_id UUID DEFAULT gen_random_uuid();
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);

-- Step 2: Migrate existing data (copy id to source_id)
UPDATE news_items SET source_id = id WHERE source_id IS NULL;

-- Step 3: Drop and recreate column_data with proper foreign key
DROP TABLE IF EXISTS column_data;
CREATE TABLE column_data (
  db_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id VARCHAR(255) NOT NULL,
  news_item_db_id UUID NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (news_item_db_id) REFERENCES news_items(db_id) ON DELETE CASCADE,
  UNIQUE (column_id, news_item_db_id)
);

-- Step 4: Create indexes for column_data
CREATE INDEX IF NOT EXISTS idx_column_data_column_id ON column_data(column_id);
CREATE INDEX IF NOT EXISTS idx_column_data_news_item_db_id ON column_data(news_item_db_id);

-- Step 5: Drop old PRIMARY KEY constraint and add new one
ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_pkey;
ALTER TABLE news_items ADD PRIMARY KEY (db_id);

-- Step 6: Update news_value constraint to allow 0-5 instead of 1-5
ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_news_value_check;
ALTER TABLE news_items ADD CONSTRAINT news_items_news_value_check CHECK (news_value BETWEEN 0 AND 5);

-- Step 7: Add index on source_id for lookups
CREATE INDEX IF NOT EXISTS idx_news_items_source_id ON news_items(source_id);

-- Note: column_data will be empty after this migration
-- Data will be re-populated automatically when workflows send new data
