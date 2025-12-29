-- Migration: Geographic Metadata for Location Filtering
-- Description: Creates reference tables for countries, regions, municipalities and location mappings
-- Date: 2025-12-29

-- Countries table (multi-country support)
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_local TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Regions/Counties (län in Sweden)
CREATE TABLE IF NOT EXISTS regions (
  country_code TEXT NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_short TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (country_code, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_regions_unique_code ON regions(country_code, code);

-- Municipalities (kommuner in Sweden)
CREATE TABLE IF NOT EXISTS municipalities (
  country_code TEXT NOT NULL,
  region_code TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  merged_into_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (country_code, region_code, code),
  FOREIGN KEY (country_code, region_code) REFERENCES regions(country_code, code) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_municipalities_unique_code
  ON municipalities(country_code, region_code, code);

-- Location name mappings (for fuzzy matching and variations)
CREATE TABLE IF NOT EXISTS location_name_mappings (
  id SERIAL PRIMARY KEY,
  variant TEXT NOT NULL UNIQUE,
  country_code TEXT REFERENCES countries(code),
  region_country_code TEXT,
  region_code TEXT,
  municipality_country_code TEXT,
  municipality_region_code TEXT,
  municipality_code TEXT,
  match_priority INTEGER DEFAULT 100,
  match_type TEXT CHECK (match_type IN ('exact', 'fuzzy')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (region_country_code, region_code)
    REFERENCES regions(country_code, code),
  FOREIGN KEY (municipality_country_code, municipality_region_code, municipality_code)
    REFERENCES municipalities(country_code, region_code, code)
);

CREATE INDEX IF NOT EXISTS idx_location_mappings_variant
  ON location_name_mappings(LOWER(variant));
CREATE INDEX IF NOT EXISTS idx_location_mappings_priority
  ON location_name_mappings(match_priority);

-- Location normalization logs (for data quality monitoring)
CREATE TABLE IF NOT EXISTS location_normalization_logs (
  id SERIAL PRIMARY KEY,
  raw_location JSONB NOT NULL,
  failed_field TEXT,
  failed_value TEXT,
  source_workflow_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_normalization_logs_failed_value
  ON location_normalization_logs(failed_value);
CREATE INDEX IF NOT EXISTS idx_normalization_logs_created_at
  ON location_normalization_logs(created_at DESC);

-- Add normalized foreign keys to news_items (NON-BREAKING - all nullable)
ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS country_code TEXT REFERENCES countries(code),
  ADD COLUMN IF NOT EXISTS region_country_code TEXT,
  ADD COLUMN IF NOT EXISTS region_code TEXT,
  ADD COLUMN IF NOT EXISTS municipality_country_code TEXT,
  ADD COLUMN IF NOT EXISTS municipality_region_code TEXT,
  ADD COLUMN IF NOT EXISTS municipality_code TEXT;

-- Add foreign key constraints with SET NULL protection (only if columns don't already have them)
-- CRITICAL: Use ON DELETE SET NULL to prevent data loss when geo data is cleaned/updated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_items_region_fkey'
  ) THEN
    ALTER TABLE news_items
      ADD CONSTRAINT news_items_region_fkey
      FOREIGN KEY (region_country_code, region_code)
      REFERENCES regions(country_code, code)
      ON DELETE SET NULL;  -- Protect news_items from cascading deletes
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'news_items_municipality_fkey'
  ) THEN
    ALTER TABLE news_items
      ADD CONSTRAINT news_items_municipality_fkey
      FOREIGN KEY (municipality_country_code, municipality_region_code, municipality_code)
      REFERENCES municipalities(country_code, region_code, code)
      ON DELETE SET NULL;  -- Protect news_items from cascading deletes
  END IF;
END$$;

-- Add indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_news_items_country_code ON news_items(country_code);
CREATE INDEX IF NOT EXISTS idx_news_items_region ON news_items(region_country_code, region_code);
CREATE INDEX IF NOT EXISTS idx_news_items_municipality
  ON news_items(municipality_country_code, municipality_region_code, municipality_code);

-- Insert Sweden as the first country
INSERT INTO countries (code, name, name_local)
VALUES ('SE', 'Sweden', 'Sverige')
ON CONFLICT (code) DO NOTHING;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Geographic metadata migration completed successfully';
  RAISE NOTICE 'Next step: Run scripts/import-scb-data.mjs to populate regions and municipalities';
END$$;
