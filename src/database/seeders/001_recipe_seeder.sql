-- insert ingredients
INSERT INTO ingredients (name, food_type) VALUES ('Tomato', 'vegetable');
INSERT INTO ingredients (name, food_type) VALUES ('Chicken Breast', 'meat');
INSERT INTO ingredients (name, food_type) VALUES ('Olive Oil', 'liquid');
INSERT INTO ingredients (name, food_type) VALUES ('Garlic', 'spice');
INSERT INTO ingredients (name, food_type) VALUES ('Salt', 'spice');
INSERT INTO ingredients (name, food_type) VALUES ('Black Pepper', 'spice');

-- insert recipes
INSERT INTO recipes (name, cooking_time, status, description, rating)
VALUES ('Grilled Chicken with Tomato Salsa', 30, 'to try', 'A delicious grilled chicken recipe served with fresh tomato salsa.', NULL);
-- link ingredients to recipes
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 2, 200, 'g'); -- Chicken Breast
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 1, 100, 'g'); -- Tomato
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 3, 2, 'tbsp'); -- Olive Oil
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 4, 2, 'pcs'); -- Garlic
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 5, 1, 'tsp'); -- Salt
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
VALUES (1, 6, 0.5, 'tsp'); -- Black Pepper
