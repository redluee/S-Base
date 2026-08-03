CREATE TABLE IF NOT EXISTS `wines` (
	`wine_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`brand` text NOT NULL,
	`type` text NOT NULL,
	`variety` text NOT NULL,
	`vintage` integer,
	`country_region` text,
	`rating` integer,
	`notes` text,
	`image_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
