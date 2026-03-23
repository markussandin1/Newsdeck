-- Migration: Geo-service UUID integration (Bonnier News centrala geo-service)
-- Description: Adds region_geo_id, region_name, municipality_geo_id, municipality_name to news_items
--              and geo_service_id to regions/municipalities for future filter support
-- Date: 2026-03-23

-- Nya fält på news_items för geo-service UUID:n och namn
ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS region_geo_id TEXT,
  ADD COLUMN IF NOT EXISTS region_name TEXT,
  ADD COLUMN IF NOT EXISTS municipality_geo_id TEXT,
  ADD COLUMN IF NOT EXISTS municipality_name TEXT;

-- Geo-service ID på referenstabeller (för framtida filter)
ALTER TABLE regions ADD COLUMN IF NOT EXISTS geo_service_id TEXT UNIQUE;
ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS geo_service_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_news_items_region_geo_id ON news_items(region_geo_id);
CREATE INDEX IF NOT EXISTS idx_news_items_municipality_geo_id ON news_items(municipality_geo_id);

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Geo-service UUID migration completed successfully';
  RAISE NOTICE 'region_geo_id, region_name, municipality_geo_id, municipality_name added to news_items';
  RAISE NOTICE 'geo_service_id added to regions and municipalities tables';
END$$;
