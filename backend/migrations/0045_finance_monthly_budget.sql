CREATE TABLE IF NOT EXISTS finance_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  monthly_budget_cents INTEGER,
  CONSTRAINT finance_monthly_budget CHECK (
    monthly_budget_cents IS NULL OR (
      typeof(monthly_budget_cents) = 'integer'
      AND monthly_budget_cents >= 0
      AND monthly_budget_cents <= 1000000000000
    )
  )
);
