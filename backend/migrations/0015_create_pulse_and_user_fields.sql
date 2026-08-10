ALTER TABLE `users` ADD COLUMN `last_login_at` text;
ALTER TABLE `users` ADD COLUMN `is_paused` integer NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO `modules` (`module_name`, `module_alias`, `description`) 
VALUES ('pulse', 'Pulse', 'Monitoring & admin paneel');

INSERT OR IGNORE INTO `usermodulepermissions` (`user_id`, `module_id`)
SELECT u.user_id, m.module_id
FROM `users` u, `modules` m
WHERE u.username IN ('admin', 'steven') AND m.module_name = 'pulse';
