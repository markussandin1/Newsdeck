-- Sync traffic camera data from news_items.extra to column_data.data
--
-- Fixes items that were processed before the column_data sync fix.
-- These items have correct data in news_items but outdated data in column_data.

DO $$
DECLARE
  sync_count INTEGER := 0;
  item RECORD;
BEGIN
  RAISE NOTICE 'Starting traffic camera data sync...';

  -- Update column_data with trafficCamera data from news_items
  FOR item IN
    SELECT
      ni.db_id,
      ni.extra->'trafficCamera' as traffic_camera
    FROM news_items ni
    WHERE ni.extra->'trafficCamera' IS NOT NULL
      AND ni.extra->'trafficCamera'->>'status' = 'ready'
  LOOP
    -- Update all column_data rows for this news_item
    UPDATE column_data
    SET data = jsonb_set(
      data,
      '{trafficCamera}',
      item.traffic_camera
    )
    WHERE news_item_db_id = item.db_id;

    IF FOUND THEN
      sync_count := sync_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Synced % items', sync_count;
END $$;
