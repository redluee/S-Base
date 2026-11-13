INSERT INTO `minor_self_evaluations` (`sprint_id`, `learning_outcome`, `level`, `argumentation`)
SELECT s.`id`, lu.n, '-', ''
FROM `minor_sprints` s
CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) lu
WHERE NOT EXISTS (
  SELECT 1 FROM `minor_self_evaluations` e WHERE e.`sprint_id` = s.`id` AND e.`learning_outcome` = lu.n
);

INSERT INTO `minor_teacher_assessments` (`sprint_id`, `learning_outcome`, `assessment`, `notes`)
SELECT s.`id`, lu.n, '-', ''
FROM `minor_sprints` s
CROSS JOIN (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) lu
WHERE NOT EXISTS (
  SELECT 1 FROM `minor_teacher_assessments` a WHERE a.`sprint_id` = s.`id` AND a.`learning_outcome` = lu.n
);
