ALTER TABLE `session_exercises` ADD `rest_time` integer;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `paused_at` text;--> statement-breakpoint
ALTER TABLE `workout_sessions` ADD `paused_seconds` integer DEFAULT 0 NOT NULL;
