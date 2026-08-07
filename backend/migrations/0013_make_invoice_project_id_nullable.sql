PRAGMA foreign_keys=OFF;

CREATE TABLE `cashflow_invoices_dg_tmp` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL REFERENCES `cashflow_clients`(`id`) ON DELETE cascade,
	`project_id` integer REFERENCES `cashflow_projects`(`id`) ON DELETE set null,
	`trade_name_id` integer REFERENCES `cashflow_trade_names`(`id`) ON DELETE set null,
	`invoice_number` text NOT NULL,
	`date_created` integer,
	`date_service` integer,
	`payment_due_date` integer,
	`date_paid` integer,
	`status` text NOT NULL DEFAULT 'draft',
	`is_kor` integer NOT NULL DEFAULT 1,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO `cashflow_invoices_dg_tmp` (
	`id`, `client_id`, `project_id`, `trade_name_id`, `invoice_number`, `date_created`, `date_service`, `payment_due_date`, `date_paid`, `status`, `is_kor`, `created_at`
) SELECT 
	`id`, `client_id`, `project_id`, `trade_name_id`, `invoice_number`, `date_created`, `date_service`, `payment_due_date`, `date_paid`, `status`, `is_kor`, `created_at`
FROM `cashflow_invoices`;

DROP TABLE `cashflow_invoices`;

ALTER TABLE `cashflow_invoices_dg_tmp` RENAME TO `cashflow_invoices`;

PRAGMA foreign_keys=ON;
