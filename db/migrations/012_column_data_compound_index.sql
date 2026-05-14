-- 012_column_data_compound_index.sql
--
-- Ersätter idx_column_data_column_id (single-column) med ett sammansatt
-- index på (column_id, created_at DESC).
--
-- Bakgrund: getColumnDataBatch (lib/db-postgresql.ts) kör
--   ROW_NUMBER() OVER (PARTITION BY column_id ORDER BY created_at DESC)
-- Det enskilda column_id-indexet hjälper filtreringen men inte sorteringen
-- → PostgreSQL fick sortera upp till 500 items/kolumn vid varje dashboard-
-- laddning. Det sammansatta indexet är en ren superset (samma prefix) så
-- queries som bara filtrerar på column_id kan fortsätta använda det.

CREATE INDEX IF NOT EXISTS idx_column_data_column_id_created_at
  ON column_data (column_id, created_at DESC);

DROP INDEX IF EXISTS idx_column_data_column_id;
