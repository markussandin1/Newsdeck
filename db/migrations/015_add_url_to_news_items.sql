-- 015: Lägg till url-kolumn på news_items.
--
-- url sparades tidigare bara i column_data-JSONB (hela itemet serialiseras
-- dit), men news_items-tabellen saknade kolumnen. Live-vägen (SSE via
-- getNewsItemsByDbIds) läser från news_items och tappade därför url:en.
--
-- Backfill från raw-payloaden där källan skickade url (gemener) eller URL
-- (versaler) — samma prioritetsordning som resolveUrl i ingestion.

ALTER TABLE news_items ADD COLUMN IF NOT EXISTS url TEXT;

UPDATE news_items
SET url = COALESCE(NULLIF(raw->>'URL', ''), NULLIF(raw->>'url', ''))
WHERE url IS NULL;
