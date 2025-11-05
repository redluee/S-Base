// migrations/recipe.ts
import db from "../index.ts";
import { exit } from "process";

const arg = process.argv[2];

if (!arg) {
  console.error("Please provide an argument: 'up' or 'down'");
  exit(1);
}

try {
  if (arg === "up") {
    console.log("Running 'up' migration...");
    up(db);
    console.log("Migration 'up' completed successfully.");
  }
  else if (arg === "down") {
    console.log("Running 'down' migration (resetting database)...");
    down(db);
    console.log("Migration 'down' completed successfully.");
  }
  else {
    console.error(`Unknown argument: ${arg}. Use 'up' or 'down'.`);
    exit(1);
  }
} catch (error) {
  console.error("Migration failed:", error);
  exit(1);
}

export function up(db: any): void {
  db.run(`
    BEGIN TRANSACTION;

    -- 1. Tabel 'recipes'
    -- Status en rating gebruiken CHECK constraints om de ENUM-logica na te bootsen.
    CREATE TABLE if not exists recipes (
      recipe_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cooking_time INTEGER, -- in minuten
      status TEXT NOT NULL DEFAULT 'to try' CHECK(
        status IN (
          'to try',
          'success',
          'needs tweak',
          'failure',
          'archived'
        )
      ),
      description TEXT, -- Let op: 'describtion' gecorrigeerd naar 'description'
      rating INTEGER CHECK(
        rating >= 0
        AND rating <= 10
      ), -- 0-10 (voor halve sterren)
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Tabel 'ingredients'
    -- Food_type gebruikt ook een CHECK constraint.
    CREATE TABLE if not exists ingredients (
      ingredient_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      food_type TEXT CHECK(
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
    -- Unit gebruikt een CHECK constraint.
    CREATE TABLE if not exists recipe_ingredients (
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity DECIMAL(8, 2) NOT NULL,
      unit TEXT CHECK(
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
      
      -- Foreign keys met ON DELETE CASCADE
      -- Als een recept of ingrediënt wordt verwijderd,
      -- worden de koppelingen hier ook verwijderd.
      FOREIGN KEY (recipe_id) REFERENCES recipes (recipe_id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES ingredients (ingredient_id) ON DELETE CASCADE
    );

    -- 4. Indices (Optioneel, maar goed voor performance)
    -- Maakt het zoeken op naam sneller.
    CREATE INDEX if not exists idx_recipes_name ON recipes (name);
    CREATE INDEX if not exists idx_ingredients_name ON ingredients (name);
    -- Maakt het opzoeken van recepten op basis van een ingrediënt sneller.
    CREATE INDEX if not exists idx_recipe_ingredients_ingredient_id ON recipe_ingredients (ingredient_id);

    COMMIT;
  `);
  console.log("Recipe migration 'up' executed successfully.");
}

export function down(db: any): void {
  db.run(`
    BEGIN TRANSACTION;

    DROP TABLE IF EXISTS recipe_ingredients;
    DROP TABLE IF EXISTS ingredients;
    DROP TABLE IF EXISTS recipes;
    
    -- Indices worden automatisch verwijderd als de tabel wordt gedropt,
    -- maar expliciet zijn kan helpen als de 'up' faalt.
    DROP INDEX IF EXISTS idx_recipes_name;
    DROP INDEX IF EXISTS idx_ingredients_name;
    DROP INDEX IF EXISTS idx_recipe_ingredients_ingredient_id;

    COMMIT;
  `);
}
