-- 1. Tabel 'recipes'
CREATE TABLE
  if not exists recipes (
    recipe_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cooking_time INTEGER, -- in minuten
    status TEXT NOT NULL DEFAULT 'to try' CHECK (
      status IN (
        'to try',
        'success',
        'needs tweak',
        'failure',
        'archived'
      )
    ),
    description TEXT, -- Let op: 'describtion' gecorrigeerd naar 'description'
    rating INTEGER CHECK (
      rating >= 0
      AND rating <= 10
    ), -- 0-10 (voor halve sterren)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

-- 2. Tabel 'ingredients'
CREATE TABLE
  if not exists ingredients (
    ingredient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    food_type TEXT CHECK (
      food_type IN (
        'vegetable',
        'fruit',
        'meat',
        'fish',
        'spice',
        'liquid',
        'dairy',
        'other'
      )
    )
  );

-- 3. Koppeltabel 'recipe_ingredients'
CREATE TABLE
  if not exists recipe_ingredients (
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity DECIMAL(8, 2) NOT NULL,
    unit TEXT CHECK (
      unit IN (
        'g',
        'kg',
        'ml',
        'l',
        'pcs',
        'tsp',
        'tbsp',
        'pinch'
      )
    ),
    -- Samengestelde primaire sleutel
    PRIMARY KEY (recipe_id, ingredient_id),
    -- Als een recept of ingrediënt wordt verwijderd,
    -- worden de koppelingen hier ook verwijderd.
    FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE
  );

-- 4. Indices (Optioneel, maar goed voor performance)
-- Maakt het zoeken op naam sneller.
CREATE INDEX if not exists idx_recipes_name ON recipes (name);

CREATE INDEX if not exists idx_ingredients_name ON ingredients (name);