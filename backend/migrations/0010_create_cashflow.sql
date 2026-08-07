CREATE TABLE IF NOT EXISTS `cashflow_trade_names` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`display_name` text NOT NULL,
	`address` text,
	`iban` text,
	`kvk_number` text,
	`vat_number` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `cashflow_clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`email` text,
	`standard_rate` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `cashflow_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`trade_name_id` integer,
	`name` text NOT NULL,
	`description` text,
	`location` text,
	`type` text NOT NULL DEFAULT 'one-time',
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `cashflow_clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`trade_name_id`) REFERENCES `cashflow_trade_names`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE IF NOT EXISTS `cashflow_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`invoice_number` text NOT NULL,
	`date_created` integer,
	`date_service` integer,
	`payment_due_date` integer,
	`status` text NOT NULL DEFAULT 'draft',
	`is_kor` integer NOT NULL DEFAULT 1,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `cashflow_projects`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS `cashflow_invoice_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`task_description` text NOT NULL,
	`quantity` real NOT NULL DEFAULT 1,
	`unit_price` real NOT NULL DEFAULT 0,
	`total_cost` real NOT NULL DEFAULT 0,
	`type` text NOT NULL DEFAULT 'hours',
	`discount_type` text,
	`discount_value` real,
	FOREIGN KEY (`invoice_id`) REFERENCES `cashflow_invoices`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT OR IGNORE INTO `modules` (`module_name`, `description`) VALUES ('cashflow', 'Cashflow & Facturatie');

INSERT OR IGNORE INTO `usermodulepermissions` (`user_id`, `module_id`)
SELECT u.user_id, m.module_id
FROM `users` u, `modules` m
WHERE m.module_name = 'cashflow';
