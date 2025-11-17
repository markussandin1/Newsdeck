-- NewsDeck Local Development Database
-- Simple schema with test data

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dashboards table (matches production)
CREATE TABLE dashboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  columns JSONB DEFAULT '[]'::jsonb,
  view_count INTEGER DEFAULT 0,
  last_viewed TIMESTAMP WITH TIME ZONE,
  created_by TEXT DEFAULT 'system',
  created_by_name TEXT DEFAULT 'System',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- News items table (updated to match production schema)
CREATE TABLE news_items (
  db_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT,  -- Changed from 'id' to match production
  workflow_id TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  news_value INTEGER NOT NULL CHECK (news_value >= 0 AND news_value <= 5),  -- Allow 0
  category TEXT,
  severity TEXT,
  location JSONB,
  extra JSONB,
  raw JSONB,
  created_in_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Column data cache table (many-to-many relationship)
CREATE TABLE column_data (
  column_id TEXT NOT NULL,
  news_item_db_id UUID NOT NULL REFERENCES news_items(db_id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (column_id, news_item_db_id)
);

-- API request logs (optional, for debugging)
CREATE TABLE api_request_logs (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_news_items_workflow_id ON news_items(workflow_id);
CREATE INDEX idx_news_items_timestamp ON news_items(timestamp DESC);
CREATE INDEX idx_news_items_created_in_db ON news_items(created_in_db DESC);
CREATE INDEX idx_column_data_column_id ON column_data(column_id);
CREATE INDEX idx_column_data_news_item_db_id ON column_data(news_item_db_id);

-- Unique constraint to prevent duplicate source_ids
CREATE UNIQUE INDEX idx_news_items_unique_source_id ON news_items(source_id)
WHERE source_id IS NOT NULL;

-- Insert empty main dashboard (columns will be created via UI)
INSERT INTO dashboards (id, name, description, slug, columns, created_by, created_by_name, created_at)
VALUES (
  'main-dashboard',
  'Huvuddashboard',
  'Din huvuddashboard för nyhetsövervakning',
  'main',
  '[]'::jsonb,
  'system',
  'System',
  CURRENT_TIMESTAMP
);
