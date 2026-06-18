CREATE TABLE `modules` (
	`module_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module_name` text NOT NULL,
	`module_alias` text,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modules_module_name_unique` ON `modules` (`module_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `modules_module_alias_unique` ON `modules` (`module_alias`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usermodulepermissions` (
	`user_id` integer NOT NULL,
	`module_id` integer NOT NULL,
	`granted_at` text DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY(`user_id`, `module_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`module_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_permissions` ON `usermodulepermissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_module_permissions` ON `usermodulepermissions` (`module_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`user_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`pswd_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `ingredients` (
	`ingredient_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`recipe_id` integer NOT NULL,
	`ingredient_id` integer NOT NULL,
	`quantity` real NOT NULL,
	`unit` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`recipe_id`, `ingredient_id`),
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`recipe_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients`(`ingredient_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipe_steps` (
	`step_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`step_number` integer NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`recipe_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `recipes` (
	`recipe_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cooking_time` integer,
	`kitchen` text,
	`status` text DEFAULT 'to try' NOT NULL,
	`description` text,
	`rating` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
