-- Migration: Add user-specific features
-- Adds created_by to dashboards, user preferences, and dashboard follows

-- Add created_by fields to dashboards
ALTER TABLE dashboards
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255) NOT NULL DEFAULT 'System';

-- Remove default after adding columns (for future inserts)
ALTER TABLE dashboards
  ALTER COLUMN created_by DROP DEFAULT,
  ALTER COLUMN created_by_name DROP DEFAULT;

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(255) PRIMARY KEY,
  default_dashboard_id VARCHAR(255), -- Hem-dashboard
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (default_dashboard_id) REFERENCES dashboards(id) ON DELETE SET NULL
);

-- User dashboard follows (many-to-many)
CREATE TABLE IF NOT EXISTS user_dashboard_follows (
  user_id VARCHAR(255) NOT NULL,
  dashboard_id VARCHAR(255) NOT NULL,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, dashboard_id),
  FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dashboards_created_by ON dashboards(created_by);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_follows_user ON user_dashboard_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_follows_dashboard ON user_dashboard_follows(dashboard_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "newsdeck-user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "newsdeck-user";
