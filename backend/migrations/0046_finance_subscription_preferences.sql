CREATE TABLE IF NOT EXISTS finance_subscription_preferences (
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  group_key TEXT NOT NULL,
  name TEXT,
  excluded INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT finance_subscription_excluded CHECK (excluded IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_subscription_preference_source
  ON finance_subscription_preferences (user_id, source_key);
