-- Migration 010: Drop geo normalization tables
--
-- These tables were used for fuzzy location matching during news item ingestion.
-- Normalization is now handled by the Workflows system before posting to Newsdeck.
-- The location codes (countryCode, regionCode, municipalityCode) are provided
-- directly in the payload and only validated for format correctness.
--
-- NOTE: The countries, regions, and municipalities tables are kept — they are
-- used by the geographic filter UI in the frontend.

DROP TABLE IF EXISTS location_normalization_logs;
DROP TABLE IF EXISTS location_name_mappings;
