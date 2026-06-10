-- Web Push-prenumerationer (Fas 4c i realtime-v2-planen).
-- En rad per browser/enhet. column_ids + news_value_threshold avgör
-- server-side vilka events som push-notifieras (speglar klientens
-- notisinställningar och synkas när användaren ändrar dem).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  column_ids TEXT[] NOT NULL DEFAULT '{}',
  news_value_threshold INT NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_columns ON push_subscriptions USING GIN (column_ids);
