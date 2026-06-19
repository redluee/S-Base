PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_session_sets` (
	`set_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_exercise_id` integer NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer,
	`weight` real,
	`distance` real,
	`duration` integer,
	`rpe` real,
	`heart_rate` integer,
	`completed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `session_exercises`(`session_exercise_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session_sets`("set_id", "session_exercise_id", "set_number", "reps", "weight", "distance", "duration", "rpe", "heart_rate", "completed") SELECT "set_id", "session_exercise_id", "set_number", "reps", "weight", "distance", "duration", "rpe", "heart_rate", "completed" FROM `session_sets`;--> statement-breakpoint
DROP TABLE `session_sets`;--> statement-breakpoint
ALTER TABLE `__new_session_sets` RENAME TO `session_sets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `session_exercises` ADD `category` text DEFAULT 'resistance' NOT NULL;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `category` text DEFAULT 'resistance' NOT NULL;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `default_distance` real;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `default_duration` integer;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `default_rpe` real;--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `default_heart_rate` integer;