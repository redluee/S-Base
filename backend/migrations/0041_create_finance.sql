CREATE TABLE IF NOT EXISTS finance_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank TEXT,
  type TEXT NOT NULL CHECK (type IN ('current', 'savings')),
  opening_date TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
);
CREATE INDEX IF NOT EXISTS finance_accounts_user ON finance_accounts(user_id);
CREATE TABLE IF NOT EXISTS finance_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  account_id INTEGER NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  balance_cents INTEGER NOT NULL CHECK (typeof(balance_cents) = 'integer' AND abs(balance_cents) <= 1000000000000)
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_observation_account_date ON finance_observations(account_id, date);
CREATE TABLE IF NOT EXISTS finance_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_cents INTEGER NOT NULL CHECK (typeof(target_cents) = 'integer' AND target_cents > 0 AND target_cents <= 1000000000000),
  target_date TEXT
);
CREATE INDEX IF NOT EXISTS finance_goals_user ON finance_goals(user_id);
CREATE TABLE IF NOT EXISTS finance_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  goal_id INTEGER NOT NULL REFERENCES finance_goals(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (typeof(amount_cents) = 'integer' AND amount_cents >= 0 AND amount_cents <= 1000000000000)
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_allocation_goal_account ON finance_allocations(goal_id, account_id);
INSERT OR IGNORE INTO modules (module_name, module_alias, description)
VALUES ('finance', 'Geldzaken', 'Persoonlijke rekeningen, saldoverloop en spaardoelen');
