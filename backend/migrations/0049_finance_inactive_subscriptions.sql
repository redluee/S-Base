ALTER TABLE finance_subscription_preferences ADD COLUMN inactive INTEGER NOT NULL DEFAULT 0 CHECK (inactive IN (0, 1));
