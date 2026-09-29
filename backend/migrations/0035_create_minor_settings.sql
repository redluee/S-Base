CREATE TABLE IF NOT EXISTS `minor_settings` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`portfolio_url` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
