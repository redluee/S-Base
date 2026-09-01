CREATE TABLE IF NOT EXISTS `minor_vacations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_story_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text,
	`is_default` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_sprints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`sprint_number` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`duration_days` integer DEFAULT 14 NOT NULL,
	`show_and_grow_date` text NOT NULL,
	`extended_days` integer DEFAULT 0 NOT NULL,
	`extension_reason` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_stories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`story_type_code` text DEFAULT 'US' NOT NULL,
	`story_number` text,
	`title` text NOT NULL,
	`as_a` text,
	`i_want` text,
	`so_that` text,
	`learning_outcomes` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sprint_id`) REFERENCES `minor_sprints`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_story_criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`story_id` integer NOT NULL,
	`type` text NOT NULL,
	`order_index` integer DEFAULT 1 NOT NULL,
	`text` text NOT NULL,
	`is_completed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `minor_stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_story_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`story_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`story_id`) REFERENCES `minor_stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_self_evaluations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer NOT NULL,
	`learning_outcome` integer NOT NULL,
	`level` text DEFAULT '-' NOT NULL,
	`argumentation` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sprint_id`) REFERENCES `minor_sprints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_teacher_assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer NOT NULL,
	`learning_outcome` integer NOT NULL,
	`assessment` text DEFAULT '-' NOT NULL,
	`notes` text,
	`evaluated_at` text,
	FOREIGN KEY (`sprint_id`) REFERENCES `minor_sprints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_feedback_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer NOT NULL,
	`date` text NOT NULL,
	`from_whom` text NOT NULL,
	`feedback` text NOT NULL,
	`action` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sprint_id`) REFERENCES `minor_sprints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_reflections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer NOT NULL,
	`date` text NOT NULL,
	`what_learned` text,
	`what_retained` text,
	`what_change` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sprint_id`) REFERENCES `minor_sprints`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `minor_peer_help` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`sprint_id` integer,
	`date` text NOT NULL,
	`peer_name` text NOT NULL,
	`description` text NOT NULL,
	`links` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sprint_id`) REFERENCES `minor_sprints`(`id`) ON UPDATE no action ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_minor_sprints_user` ON `minor_sprints` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_minor_stories_sprint` ON `minor_stories` (`sprint_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_minor_peer_help_user` ON `minor_peer_help` (`user_id`);
