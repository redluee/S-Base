PRAGMA foreign_keys=OFF;

CREATE TABLE `minor_stories_dg_tmp` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer REFERENCES `minor_sprints`(`id`) ON DELETE set null,
	`user_id` integer NOT NULL REFERENCES `users`(`user_id`) ON DELETE cascade,
	`story_type_code` text NOT NULL DEFAULT 'US',
	`story_number` text,
	`title` text NOT NULL,
	`as_a` text,
	`i_want` text,
	`so_that` text,
	`learning_outcomes` text NOT NULL DEFAULT '[]',
	`status` text NOT NULL DEFAULT 'todo',
	`order_index` integer NOT NULL DEFAULT 0,
	`created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO `minor_stories_dg_tmp` (
	`id`, `sprint_id`, `user_id`, `story_type_code`, `story_number`, `title`, `as_a`, `i_want`, `so_that`, `learning_outcomes`, `status`, `order_index`, `created_at`
) SELECT 
	`id`, `sprint_id`, `user_id`, `story_type_code`, `story_number`, `title`, `as_a`, `i_want`, `so_that`, `learning_outcomes`, `status`, `order_index`, `created_at`
FROM `minor_stories`;

DROP TABLE `minor_stories`;

ALTER TABLE `minor_stories_dg_tmp` RENAME TO `minor_stories`;

CREATE INDEX IF NOT EXISTS `idx_minor_stories_sprint` ON `minor_stories` (`sprint_id`);

PRAGMA foreign_keys=ON;
