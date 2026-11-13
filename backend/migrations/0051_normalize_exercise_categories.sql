UPDATE `session_exercises` SET `equipment` = NULL WHERE lower(trim(coalesce(`equipment`, ''))) IN ('', 'none', 'null', 'undefined');
UPDATE `template_exercises` SET `equipment` = NULL WHERE lower(trim(coalesce(`equipment`, ''))) IN ('', 'none', 'null', 'undefined');

UPDATE `session_exercises` SET `category` = CASE lower(trim(`category`))
  WHEN 'machines' THEN 'Machines' WHEN 'machine' THEN 'Machines'
  WHEN 'bodyweight' THEN 'Bodyweight'
  WHEN 'cardio' THEN 'Cardio'
  WHEN 'functional' THEN 'Functional' WHEN 'isometric' THEN 'Functional'
  ELSE 'Free Weights' END
WHERE `category` NOT IN ('Free Weights', 'Machines', 'Bodyweight', 'Cardio', 'Functional');

UPDATE `template_exercises` SET `category` = CASE lower(trim(`category`))
  WHEN 'machines' THEN 'Machines' WHEN 'machine' THEN 'Machines'
  WHEN 'bodyweight' THEN 'Bodyweight'
  WHEN 'cardio' THEN 'Cardio'
  WHEN 'functional' THEN 'Functional' WHEN 'isometric' THEN 'Functional'
  ELSE 'Free Weights' END
WHERE `category` NOT IN ('Free Weights', 'Machines', 'Bodyweight', 'Cardio', 'Functional');
