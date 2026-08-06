ALTER TABLE `users` ADD COLUMN `email` text;
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);
