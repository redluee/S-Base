CREATE TABLE IF NOT EXISTS `resume_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL UNIQUE,
	`full_name` text DEFAULT '' NOT NULL,
	`headline` text DEFAULT '' NOT NULL,
	`photo_path` text,
	`photo_shape` text DEFAULT 'circle' NOT NULL,
	`residence` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`birth_date` text DEFAULT '' NOT NULL,
	`driving_license` text DEFAULT '' NOT NULL,
	`links` text DEFAULT '[]' NOT NULL,
	`skills` text DEFAULT '[]' NOT NULL,
	`languages` text DEFAULT '[]' NOT NULL,
	`hobbies` text DEFAULT '[]' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resume_experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`company` text NOT NULL,
	`place` text DEFAULT '' NOT NULL,
	`job_title` text NOT NULL,
	`start_month` integer NOT NULL,
	`start_year` integer NOT NULL,
	`end_month` integer,
	`end_year` integer,
	`is_current` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`logo_path` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resume_educations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`institution` text NOT NULL,
	`place` text DEFAULT '' NOT NULL,
	`degree` text NOT NULL,
	`start_month` integer NOT NULL,
	`start_year` integer NOT NULL,
	`end_month` integer,
	`end_year` integer,
	`is_current` integer DEFAULT 0 NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`logo_path` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resumes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`title_font` text DEFAULT 'carlito' NOT NULL,
	`text_font` text DEFAULT 'carlito' NOT NULL,
	`accent_color` text DEFAULT '#1f7bc4' NOT NULL,
	`left_width_pct` integer DEFAULT 70 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `resume_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`resume_id` integer NOT NULL,
	`kind` text NOT NULL,
	`ref_id` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`description_override` text,
	FOREIGN KEY (`resume_id`) REFERENCES `resumes`(`id`) ON UPDATE no action ON DELETE cascade
);
