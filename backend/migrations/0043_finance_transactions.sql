CREATE TABLE IF NOT EXISTS finance_import_sources (
  account_id INTEGER PRIMARY KEY REFERENCES finance_accounts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  identity TEXT NOT NULL,
  number_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(typeof(amount_cents) = 'integer' AND abs(amount_cents) <= 1000000000000),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  counterparty_key TEXT,
  transfer_override INTEGER CHECK(transfer_override IS NULL OR transfer_override IN (0,1))
);
CREATE INDEX IF NOT EXISTS finance_transactions_account_date ON finance_transactions(account_id, date);

CREATE UNIQUE INDEX IF NOT EXISTS finance_source_identity ON finance_import_sources(user_id, identity);
CREATE UNIQUE INDEX IF NOT EXISTS finance_transaction_fingerprint ON finance_transactions(account_id, fingerprint);
