-- Migration: Convert ISO 3166-2 letter codes to SCB numeric codes
-- Description: Standardizes all geographic codes to use SCB format (01, 23, etc.) instead of ISO letters (AB, Z, etc.)
-- Date: 2025-12-30
-- IMPORTANT: Take database backup before running this migration!

-- ============================================================================
-- STEP 1: Create temporary mapping table
-- ============================================================================

CREATE TEMP TABLE iso_scb_mapping (
  iso_code TEXT PRIMARY KEY,
  scb_code TEXT NOT NULL,
  name TEXT NOT NULL
);

INSERT INTO iso_scb_mapping (iso_code, scb_code, name) VALUES
  ('AB', '01', 'Stockholms län'),
  ('C', '03', 'Uppsala län'),
  ('D', '04', 'Södermanlands län'),
  ('E', '05', 'Östergötlands län'),
  ('F', '06', 'Jönköpings län'),
  ('G', '07', 'Kronobergs län'),
  ('H', '08', 'Kalmar län'),
  ('I', '09', 'Gotlands län'),
  ('K', '10', 'Blekinge län'),
  ('M', '12', 'Skåne län'),
  ('N', '13', 'Hallands län'),
  ('O', '14', 'Västra Götalands län'),
  ('S', '17', 'Värmlands län'),
  ('T', '18', 'Örebro län'),
  ('U', '19', 'Västmanlands län'),
  ('W', '20', 'Dalarnas län'),
  ('X', '21', 'Gävleborgs län'),
  ('Y', '22', 'Västernorrlands län'),
  ('Z', '23', 'Jämtlands län'),
  ('AC', '24', 'Västerbottens län'),
  ('BD', '25', 'Norrbottens län');

DO $$
BEGIN
  RAISE NOTICE '✅ Created temporary ISO → SCB mapping table with % entries', (SELECT COUNT(*) FROM iso_scb_mapping);
END$$;

-- ============================================================================
-- STEP 2: Disable foreign key constraints
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Disabling foreign key constraints...';
END$$;

ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_region_fkey;
ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_municipality_fkey;
ALTER TABLE municipalities DROP CONSTRAINT IF EXISTS municipalities_country_code_region_code_fkey;
ALTER TABLE location_name_mappings DROP CONSTRAINT IF EXISTS location_name_mappings_region_country_code_region_code_fkey;
ALTER TABLE location_name_mappings DROP CONSTRAINT IF EXISTS location_name_mappings_municipality_country_code_municipa_fkey;
ALTER TABLE location_name_mappings DROP CONSTRAINT IF EXISTS location_name_mappings_municipality_country_code_municipal_fkey;

DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraints disabled';
END$$;

-- ============================================================================
-- STEP 3: Update regions table
-- ============================================================================

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Updating regions table...';

  UPDATE regions r
  SET code = m.scb_code
  FROM iso_scb_mapping m
  WHERE r.code = m.iso_code;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % regions (ISO → SCB)', updated_count;

  -- Show sample conversions
  RAISE NOTICE '   Samples:';
  RAISE NOTICE '   %', (SELECT string_agg(code || ' (' || name || ')', ', ' ORDER BY code) FROM regions WHERE code IN ('01', '23', '25'));
END$$;

-- ============================================================================
-- STEP 4: Update municipalities table
-- ============================================================================

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Updating municipalities table...';

  UPDATE municipalities mu
  SET region_code = m.scb_code
  FROM iso_scb_mapping m
  WHERE mu.region_code = m.iso_code;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % municipalities', updated_count;
END$$;

-- ============================================================================
-- STEP 5: Update news_items table
-- ============================================================================

DO $$
DECLARE
  updated_regions_count INTEGER;
  updated_municipality_regions_count INTEGER;
  total_with_regions INTEGER;
  total_with_municipality_regions INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Updating news_items table...';

  SELECT COUNT(*) INTO total_with_regions FROM news_items WHERE region_code IS NOT NULL;
  SELECT COUNT(*) INTO total_with_municipality_regions FROM news_items WHERE municipality_region_code IS NOT NULL;

  -- Update region_code
  UPDATE news_items ni
  SET region_code = m.scb_code
  FROM iso_scb_mapping m
  WHERE ni.region_code = m.iso_code;

  GET DIAGNOSTICS updated_regions_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % / % news items with region codes', updated_regions_count, total_with_regions;

  -- Update municipality_region_code (important for foreign key constraint!)
  UPDATE news_items ni
  SET municipality_region_code = m.scb_code
  FROM iso_scb_mapping m
  WHERE ni.municipality_region_code = m.iso_code;

  GET DIAGNOSTICS updated_municipality_regions_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % / % news items with municipality region codes', updated_municipality_regions_count, total_with_municipality_regions;
END$$;

-- ============================================================================
-- STEP 6: Update location_name_mappings table
-- ============================================================================

DO $$
DECLARE
  updated_regions_count INTEGER;
  updated_municipality_regions_count INTEGER;
  total_with_regions INTEGER;
  total_with_municipality_regions INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Updating location_name_mappings table...';

  SELECT COUNT(*) INTO total_with_regions FROM location_name_mappings WHERE region_code IS NOT NULL;
  SELECT COUNT(*) INTO total_with_municipality_regions FROM location_name_mappings WHERE municipality_region_code IS NOT NULL;

  -- Update region_code
  UPDATE location_name_mappings lnm
  SET region_code = m.scb_code
  FROM iso_scb_mapping m
  WHERE lnm.region_code = m.iso_code;

  GET DIAGNOSTICS updated_regions_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % / % location mappings (region codes)', updated_regions_count, total_with_regions;

  -- Update municipality_region_code (important for foreign key constraint!)
  UPDATE location_name_mappings lnm
  SET municipality_region_code = m.scb_code
  FROM iso_scb_mapping m
  WHERE lnm.municipality_region_code = m.iso_code;

  GET DIAGNOSTICS updated_municipality_regions_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % / % location mappings (municipality region codes)', updated_municipality_regions_count, total_with_municipality_regions;
END$$;

-- ============================================================================
-- STEP 7: Re-enable foreign key constraints
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Re-enabling foreign key constraints...';
END$$;

-- municipalities → regions
ALTER TABLE municipalities
  ADD CONSTRAINT municipalities_country_code_region_code_fkey
  FOREIGN KEY (country_code, region_code)
  REFERENCES regions(country_code, code)
  ON DELETE CASCADE;

-- news_items → regions
ALTER TABLE news_items
  ADD CONSTRAINT news_items_region_fkey
  FOREIGN KEY (region_country_code, region_code)
  REFERENCES regions(country_code, code)
  ON DELETE SET NULL;

-- news_items → municipalities
ALTER TABLE news_items
  ADD CONSTRAINT news_items_municipality_fkey
  FOREIGN KEY (municipality_country_code, municipality_region_code, municipality_code)
  REFERENCES municipalities(country_code, region_code, code)
  ON DELETE SET NULL;

-- location_name_mappings → regions
ALTER TABLE location_name_mappings
  ADD CONSTRAINT location_name_mappings_region_country_code_region_code_fkey
  FOREIGN KEY (region_country_code, region_code)
  REFERENCES regions(country_code, code);

-- location_name_mappings → municipalities
ALTER TABLE location_name_mappings
  ADD CONSTRAINT location_name_mappings_municipality_country_code_municipal_fkey
  FOREIGN KEY (municipality_country_code, municipality_region_code, municipality_code)
  REFERENCES municipalities(country_code, region_code, code);

DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key constraints re-enabled';
END$$;

-- ============================================================================
-- STEP 8: Verify migration results
-- ============================================================================

DO $$
DECLARE
  regions_count INTEGER;
  municipalities_count INTEGER;
  news_items_with_regions INTEGER;
  location_mappings_count INTEGER;
  sample_regions TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📊 Verification:';
  RAISE NOTICE '';

  -- Count records
  SELECT COUNT(*) INTO regions_count FROM regions;
  SELECT COUNT(*) INTO municipalities_count FROM municipalities;
  SELECT COUNT(*) INTO news_items_with_regions FROM news_items WHERE region_code IS NOT NULL;
  SELECT COUNT(*) INTO location_mappings_count FROM location_name_mappings WHERE region_code IS NOT NULL;

  RAISE NOTICE '   Regions:             %', regions_count;
  RAISE NOTICE '   Municipalities:      %', municipalities_count;
  RAISE NOTICE '   News items (w/geo):  %', news_items_with_regions;
  RAISE NOTICE '   Location mappings:   %', location_mappings_count;
  RAISE NOTICE '';

  -- Show sample region codes (should be SCB numeric now)
  SELECT string_agg(code, ', ' ORDER BY code) INTO sample_regions
  FROM (SELECT DISTINCT code FROM regions ORDER BY code LIMIT 5) sub;

  RAISE NOTICE '   Sample region codes: %', sample_regions;
  RAISE NOTICE '   (Should be numeric SCB codes like: 01, 03, 04, 05, 06)';
  RAISE NOTICE '';
END$$;

-- ============================================================================
-- STEP 9: Final verification
-- ============================================================================

DO $$
DECLARE
  iso_codes_remaining INTEGER;
BEGIN
  -- Check if any ISO letter codes remain
  SELECT COUNT(*) INTO iso_codes_remaining
  FROM regions
  WHERE code ~ '^[A-Z]+$';  -- Matches letter-only codes like AB, Z, AC, BD

  IF iso_codes_remaining > 0 THEN
    RAISE WARNING '⚠️  Found % regions with ISO letter codes still present!', iso_codes_remaining;
    RAISE WARNING '   Migration may have failed. Please investigate.';
  ELSE
    RAISE NOTICE '✅ No ISO letter codes remaining - migration successful!';
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '   All geographic codes converted from ISO 3166-2 to SCB format';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Clean geographic data: node scripts/clean-geo-data.mjs';
    RAISE NOTICE '  2. Re-import with SCB codes: node scripts/import-geo-data.mjs data/geo/SE_SCB.json';
    RAISE NOTICE '  3. Test Workflows integration';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '';
  END IF;
END$$;
