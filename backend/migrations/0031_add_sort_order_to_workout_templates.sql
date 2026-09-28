ALTER TABLE `workout_templates` ADD `sort_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `workout_templates`
SET `sort_order` = (
  SELECT COUNT(*)
  FROM `workout_templates` AS `wt2`
  WHERE `wt2`.`user_id` = `workout_templates`.`user_id`
    AND `wt2`.`created_at` > `workout_templates`.`created_at`
);
