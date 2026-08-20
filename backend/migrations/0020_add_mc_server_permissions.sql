CREATE TABLE IF NOT EXISTS `mc_server_permissions` (
  `user_id` INTEGER NOT NULL,
  `server_id` INTEGER NOT NULL,
  `granted_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `server_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`server_id`) REFERENCES `mc_servers`(`serverId`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_mc_server_user_permissions` ON `mc_server_permissions` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_mc_server_server_permissions` ON `mc_server_permissions` (`server_id`);
