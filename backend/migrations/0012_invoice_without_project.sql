ALTER TABLE `cashflow_invoices` ADD `client_id` integer REFERENCES `cashflow_clients`(`id`) ON DELETE cascade;
ALTER TABLE `cashflow_invoices` ADD `trade_name_id` integer REFERENCES `cashflow_trade_names`(`id`) ON DELETE set null;

UPDATE `cashflow_invoices` 
SET `client_id` = (SELECT `client_id` FROM `cashflow_projects` WHERE `cashflow_projects`.`id` = `cashflow_invoices`.`project_id`)
WHERE `client_id` IS NULL;

UPDATE `cashflow_invoices` 
SET `trade_name_id` = (SELECT `trade_name_id` FROM `cashflow_projects` WHERE `cashflow_projects`.`id` = `cashflow_invoices`.`project_id`)
WHERE `trade_name_id` IS NULL;

ALTER TABLE `cashflow_projects` DROP COLUMN `type`;
