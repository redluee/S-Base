CREATE TABLE IF NOT EXISTS `system_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO `system_settings` (`key`, `value`)
VALUES ('shutdown_schedule', '{"enabled":true,"time":"01:00","blockedUntil":null}');
