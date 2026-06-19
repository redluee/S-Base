CREATE TABLE `session_exercises` (
	`session_exercise_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`exercise_name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`session_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session_sets` (
	`set_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_exercise_id` integer NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer NOT NULL,
	`weight` real,
	`completed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `session_exercises`(`session_exercise_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `template_exercises` (
	`template_exercise_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`exercise_name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`default_sets` integer DEFAULT 3 NOT NULL,
	`default_reps` integer DEFAULT 10 NOT NULL,
	`default_weight` real,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`template_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
	`session_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer,
	`user_id` integer NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`notes` text,
	`name` text,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`template_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `workout_templates` (
	`template_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`target_muscle_groups` text,
	`estimated_time` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
