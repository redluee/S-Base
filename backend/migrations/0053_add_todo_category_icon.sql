ALTER TABLE `todo_categories` ADD `icon` text DEFAULT 'folder' NOT NULL;
--> statement-breakpoint
UPDATE `todo_categories` SET `icon` = 'zap' WHERE `is_system` = 1;
