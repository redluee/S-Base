ALTER TABLE finance_subscription_preferences ADD COLUMN irregular INTEGER NOT NULL DEFAULT 0 CHECK (irregular IN (0, 1));
