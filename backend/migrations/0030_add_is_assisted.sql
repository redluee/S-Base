ALTER TABLE `template_exercises` ADD `is_assisted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `session_exercises` ADD `is_assisted` integer DEFAULT 0 NOT NULL;
