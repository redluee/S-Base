CREATE TABLE IF NOT EXISTS `cashflow_expenses` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL REFERENCES `users`(`user_id`) ON DELETE cascade,
  `description` text NOT NULL,
  `category` text,
  `amount` real NOT NULL,
  `date` integer,
  `trade_name_id` integer REFERENCES `cashflow_trade_names`(`id`) ON DELETE set null,
  `receipt_pdf_path` text,
  `receipt_pdf_name` text,
  `notes` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
