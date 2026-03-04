BEGIN;

-- Släpp båda FK-constraints tillfälligt för att tillåta ID-ändringar
ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_default_dashboard_id_fkey;

ALTER TABLE user_dashboard_follows
  DROP CONSTRAINT IF EXISTS user_dashboard_follows_dashboard_id_fkey;

-- Uppdatera user_preferences som refererar main-dashboard till ny UUID
UPDATE user_preferences
SET default_dashboard_id = '00000000-0000-4000-a000-000000000001'
WHERE default_dashboard_id = 'main-dashboard';

-- NULL:a user_preferences med övriga icke-UUID dashboard-IDs
UPDATE user_preferences
SET default_dashboard_id = NULL
WHERE default_dashboard_id IS NOT NULL
  AND default_dashboard_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Uppdatera user_dashboard_follows som refererar main-dashboard till ny UUID
UPDATE user_dashboard_follows
SET dashboard_id = '00000000-0000-4000-a000-000000000001'
WHERE dashboard_id = 'main-dashboard';

-- Ta bort follows för övriga icke-UUID dashboard-IDs (dessa är okartlagbara)
DELETE FROM user_dashboard_follows
WHERE dashboard_id IS NOT NULL
  AND dashboard_id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Tilldela stabil UUID till main-dashboard
UPDATE dashboards
SET id = '00000000-0000-4000-a000-000000000001'
WHERE id = 'main-dashboard';

-- Tilldela slumpmässiga UUID:n till övriga icke-UUID dashboards
UPDATE dashboards
SET id = gen_random_uuid()::text
WHERE id NOT SIMILAR TO '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

-- Återskapa FK-constraints
ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_default_dashboard_id_fkey
  FOREIGN KEY (default_dashboard_id) REFERENCES dashboards(id);

ALTER TABLE user_dashboard_follows
  ADD CONSTRAINT user_dashboard_follows_dashboard_id_fkey
  FOREIGN KEY (dashboard_id) REFERENCES dashboards(id);

COMMIT;
