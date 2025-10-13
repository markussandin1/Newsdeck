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

-- Columns table (for column management)
CREATE TABLE columns (
  id TEXT PRIMARY KEY,
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  flow_id TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- News items table
CREATE TABLE news_items (
  db_id SERIAL PRIMARY KEY,
  id TEXT,
  column_id TEXT REFERENCES columns(id) ON DELETE CASCADE,
  workflow_id TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  news_value INTEGER NOT NULL CHECK (news_value >= 1 AND news_value <= 5),
  category TEXT,
  severity TEXT,
  location JSONB,
  extra JSONB,
  raw JSONB,
  created_in_db TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(column_id, id)
);

-- Column data cache table (many-to-many relationship)
CREATE TABLE column_data (
  db_id SERIAL PRIMARY KEY,
  column_id TEXT NOT NULL,
  news_item_db_id INTEGER NOT NULL REFERENCES news_items(db_id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(column_id, news_item_db_id)
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
CREATE INDEX idx_columns_dashboard_id ON columns(dashboard_id);
CREATE INDEX idx_news_items_column_id ON news_items(column_id);
CREATE INDEX idx_news_items_workflow_id ON news_items(workflow_id);
CREATE INDEX idx_news_items_timestamp ON news_items(timestamp DESC);
CREATE INDEX idx_news_items_created_in_db ON news_items(created_in_db DESC);
CREATE INDEX idx_column_data_column_id ON column_data(column_id);
CREATE INDEX idx_column_data_news_item_db_id ON column_data(news_item_db_id);

-- Insert test dashboard
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

-- Insert test columns with some variety
DO $$
DECLARE
  col1_id TEXT := 'col-breaking-' || uuid_generate_v4();
  col2_id TEXT := 'col-weather-' || uuid_generate_v4();
  col3_id TEXT := 'col-traffic-' || uuid_generate_v4();
BEGIN
  -- Column 1: Breaking News
  INSERT INTO columns (id, dashboard_id, title, description, "order", created_at)
  VALUES (col1_id, 'main-dashboard', 'Breaking News', 'Viktigaste händelserna just nu', 0, CURRENT_TIMESTAMP);

  -- Column 2: Väder
  INSERT INTO columns (id, dashboard_id, title, description, "order", created_at)
  VALUES (col2_id, 'main-dashboard', 'Väder & SMHI', 'Vädervarningar och prognoser', 1, CURRENT_TIMESTAMP);

  -- Column 3: Trafik
  INSERT INTO columns (id, dashboard_id, title, description, "order", created_at)
  VALUES (col3_id, 'main-dashboard', 'Trafik & Olyckor', 'Trafikinformation och olyckor', 2, CURRENT_TIMESTAMP);

  -- Add some test news items to Breaking News column
  INSERT INTO news_items (id, column_id, workflow_id, source, timestamp, title, description, news_value, category, severity, location, extra, raw, created_in_db)
  VALUES
    ('news-1', col1_id, 'workflow-breaking', 'sos', NOW() - INTERVAL '10 minutes',
     'Brand i flerfamiljshus i Stockholm',
     'Räddningstjänsten på plats med flera enheter. Ingen person ska ha kommit till skada.',
     5, 'emergency', 'critical',
     '{"municipality": "Stockholm", "county": "Stockholm", "name": "Södermalm"}'::jsonb,
     '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP),

    ('news-2', col1_id, 'workflow-breaking', 'polisen', NOW() - INTERVAL '25 minutes',
     'Stort polisp pådragnät efter rån i centrala Göteborg',
     'Polisen söker två personer efter ett väpnat rån mot en butik.',
     4, 'crime', 'high',
     '{"municipality": "Göteborg", "county": "Västra Götaland"}'::jsonb,
     '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP),

    ('news-3', col1_id, 'workflow-breaking', 'tt', NOW() - INTERVAL '1 hour',
     'Regeringen presenterar nytt klimatpaket',
     'Statsministern håller presskonferens om omfattande klimatåtgärder.',
     3, 'politics', 'medium',
     '{"municipality": "Stockholm", "county": "Stockholm"}'::jsonb,
     '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP);

  -- Add weather news
  INSERT INTO news_items (id, column_id, workflow_id, source, timestamp, title, description, news_value, category, severity, location, extra, raw, created_in_db)
  VALUES
    ('weather-1', col2_id, 'workflow-weather', 'smhi', NOW() - INTERVAL '30 minutes',
     'Klass 2-varning för kraftig snö i norra Sverige',
     'SMHI varnar för kraftigt snöfall i fjällområden. Upp till 30 cm väntas.',
     4, 'weather', 'high',
     '{"municipality": "Kiruna", "county": "Norrbotten"}'::jsonb,
     '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP),

    ('weather-2', col2_id, 'workflow-weather', 'smhi', NOW() - INTERVAL '2 hours',
     'Soligt och varmt i södra Sverige',
     'Fortsatt högtryck ger sol och temperaturer upp till 22 grader.',
     2, 'weather', 'low',
     '{"municipality": "Malmö", "county": "Skåne"}'::jsonb,
     '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP);

  -- Add traffic news
  INSERT INTO news_items (id, column_id, workflow_id, source, timestamp, title, description, news_value, category, severity, location, extra, raw, created_in_db)
  VALUES
    ('traffic-1', col3_id, 'workflow-traffic', 'trafikverket', NOW() - INTERVAL '15 minutes',
     'Trafikolycka E4 Rotebro - långa köer',
     'Flera bilar inblandade. Vänster fil avstängd i nordgående riktning.',
     3, 'traffic', 'medium',
     '{"municipality": "Sollentuna", "county": "Stockholm"}'::jsonb,
     '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP),

    ('traffic-2', col3_id, 'workflow-traffic', 'trafikverket', NOW() - INTERVAL '45 minutes',
     'Stillastående trafik på E6 söderut',
     'Kö från Hisingen till Göteborg centrum. Räkna med 30 minuters fördröjning.',
     2, 'traffic', 'medium',
     '{"municipality": "Göteborg", "county": "Västra Götaland"}'::jsonb,
     '{}'::jsonb, '{}'::jsonb, CURRENT_TIMESTAMP);

  -- Update dashboard with column IDs in correct format
  UPDATE dashboards
  SET columns = json_build_array(
    json_build_object(
      'id', col1_id,
      'title', 'Breaking News',
      'description', 'Viktigaste händelserna just nu',
      'flowId', 'workflow-breaking',
      'isArchived', false,
      'order', 0
    ),
    json_build_object(
      'id', col2_id,
      'title', 'Väder & SMHI',
      'description', 'Vädervarningar och prognoser',
      'flowId', 'workflow-weather',
      'isArchived', false,
      'order', 1
    ),
    json_build_object(
      'id', col3_id,
      'title', 'Trafik & Olyckor',
      'description', 'Trafikinformation och olyckor',
      'flowId', 'workflow-traffic',
      'isArchived', false,
      'order', 2
    )
  )::jsonb
  WHERE id = 'main-dashboard';

  -- Populate column_data cache from news_items
  -- This simulates what the ingestion service does in production
  INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
  SELECT
    n.column_id,
    n.db_id,
    jsonb_build_object(
      'dbId', n.db_id,
      'id', n.id,
      'columnId', n.column_id,
      'workflowId', n.workflow_id,
      'source', n.source,
      'timestamp', n.timestamp,
      'title', n.title,
      'description', n.description,
      'newsValue', n.news_value,
      'category', n.category,
      'severity', n.severity,
      'location', n.location,
      'extra', n.extra,
      'raw', n.raw,
      'createdInDb', n.created_in_db
    ),
    n.created_in_db
  FROM news_items n
  ORDER BY n.created_in_db DESC;

END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ NewsDeck local database ready!';
  RAISE NOTICE '📊 Created 1 dashboard with 3 columns';
  RAISE NOTICE '📰 Added 8 test news items';
  RAISE NOTICE '🚀 Start app with: npm run dev';
END $$;
