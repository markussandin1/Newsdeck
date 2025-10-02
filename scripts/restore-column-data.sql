-- Restore column_data by matching news_items to columns based on workflow_id
-- This SQL script rebuilds the column_data table after migration

-- For each dashboard's columns, find matching news items and insert into column_data
DO $$
DECLARE
  dashboard_row RECORD;
  column_item JSONB;
  workflow_id_val VARCHAR(255);
  news_item_row RECORD;
  inserted_count INTEGER := 0;
BEGIN
  -- Loop through all dashboards
  FOR dashboard_row IN
    SELECT id, name, columns FROM dashboards
  LOOP
    RAISE NOTICE 'Processing dashboard: % (%)', dashboard_row.name, dashboard_row.id;

    -- Loop through each column in the dashboard
    FOR column_item IN
      SELECT * FROM jsonb_array_elements(dashboard_row.columns)
    LOOP
      -- Skip archived columns
      IF (column_item->>'isArchived')::boolean IS TRUE THEN
        RAISE NOTICE '  Skipping archived column: %', column_item->>'title';
        CONTINUE;
      END IF;

      -- Get workflow_id (prefer flowId, fallback to id)
      workflow_id_val := COALESCE(column_item->>'flowId', column_item->>'id');

      RAISE NOTICE '  Processing column: % (workflow: %)', column_item->>'title', workflow_id_val;

      -- Find and insert matching news items (limit 100 most recent)
      FOR news_item_row IN
        SELECT * FROM news_items
        WHERE workflow_id = workflow_id_val
        ORDER BY created_in_db DESC
        LIMIT 100
      LOOP
        -- Insert into column_data
        INSERT INTO column_data (column_id, news_item_db_id, data, created_at)
        VALUES (
          column_item->>'id',
          news_item_row.db_id,
          jsonb_build_object(
            'dbId', news_item_row.db_id,
            'id', news_item_row.source_id,
            'workflowId', news_item_row.workflow_id,
            'source', news_item_row.source,
            'timestamp', news_item_row.timestamp,
            'title', news_item_row.title,
            'description', news_item_row.description,
            'newsValue', news_item_row.news_value,
            'category', news_item_row.category,
            'severity', news_item_row.severity,
            'location', news_item_row.location,
            'extra', news_item_row.extra,
            'raw', news_item_row.raw,
            'createdInDb', news_item_row.created_in_db
          ),
          news_item_row.created_in_db
        )
        ON CONFLICT (column_id, news_item_db_id) DO NOTHING;

        inserted_count := inserted_count + 1;
      END LOOP;

    END LOOP;
  END LOOP;

  RAISE NOTICE 'Restore complete! Total items restored: %', inserted_count;
END $$;

-- Show final counts
SELECT
  (SELECT COUNT(*) FROM news_items) as total_news_items,
  (SELECT COUNT(*) FROM column_data) as total_column_data,
  (SELECT COUNT(DISTINCT column_id) FROM column_data) as columns_with_data;
