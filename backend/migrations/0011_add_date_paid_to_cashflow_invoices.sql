ALTER TABLE `cashflow_invoices` ADD `date_paid` integer;
UPDATE `cashflow_invoices` SET `date_paid` = COALESCE(`date_created`, `date_service`, CAST(strftime('%s', `created_at`) AS INTEGER) * 1000) WHERE `status` = 'paid' AND `date_paid` IS NULL;
