ALTER TABLE finance_subscription_preferences ADD COLUMN cadence TEXT CHECK (cadence IS NULL OR cadence IN ('weekly', 'fortnightly', 'fourWeekly', 'monthly', 'quarterly', 'yearly'));
