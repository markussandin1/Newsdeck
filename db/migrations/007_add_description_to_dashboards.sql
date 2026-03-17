-- Add description column to dashboards table
-- This column was present in init.sql but missing from the production schema

ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS description TEXT;
