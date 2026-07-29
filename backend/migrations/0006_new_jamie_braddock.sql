CREATE TABLE `measurement_photos` (
	`photo_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`measurement_id` integer NOT NULL,
	`file_path` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`measurement_id`) REFERENCES `measurements`(`measurement_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`measurement_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`date` text NOT NULL,
	`height` real,
	`weight` real,
	`body_fat` real,
	`skeletal_muscle` real,
	`fat_mass` real,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
