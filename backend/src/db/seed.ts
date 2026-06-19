import db from "./client";
import { users, modules, usermodulepermissions, ingredients, recipes, recipeIngredients, recipeSteps, workoutTemplates, templateExercises } from "./schema";

const seedUserId = 1;
const recipeModuleId = 1;
const workoutModuleId = 2;
const recipeId = 1;

async function seed() {
  console.log("Seeding database...");

  const existingUser = db.select().from(users).limit(1).get();
  if (existingUser) {
    console.log("Database already seeded, skipping.");
    return;
  }

  db.insert(users).values([
    {
      userId: seedUserId,
      username: "admin",
      pswdHash: "$argon2id$v=19$m=65536,t=2,p=1$gk1FBnX70MAmwufEpVkDJdPIJ7cTHv6RHjhJ/qkjbA8$S77uPjXvIaSafBxS83MzK+KXqB5ZvTjA4qnKuM/V9Nk",
    },
    {
      userId: 2,
      username: "tester",
      pswdHash: "$argon2id$v=19$m=65536,t=2,p=1$E+2GpQWmGwwrQL4Q5SJoMnDFN+MzW8YunUYwKiN2NNU$aT9QtkUnT3bI7JyGOOi9JhsaQC7wgdGJChONxB62kPA",
    },
  ]).run();

  db.insert(modules).values({
    moduleId: recipeModuleId,
    moduleName: "recipes",
    moduleAlias: "Smaakmeter",
    description: "Module for managing recipes",
  }).run();

  db.insert(modules).values({
    moduleId: workoutModuleId,
    moduleName: "workout",
    moduleAlias: "Workout Studio",
    description: "Module for managing workout templates and tracking sessions",
  }).run();

  db.insert(usermodulepermissions).values([
    { userId: seedUserId, moduleId: recipeModuleId },
    { userId: 2, moduleId: recipeModuleId },
    { userId: seedUserId, moduleId: workoutModuleId },
    { userId: 2, moduleId: workoutModuleId },
  ]).run();

  const foodData: { name: string }[] = [
    { name: "Tomaat" },
    { name: "Kipfilet" },
    { name: "Olijfolie" },
    { name: "Knoflook" },
    { name: "Zout" },
    { name: "Zwarte Peper" },
    { name: "Ui" },
    { name: "Paprika" },
    { name: "Wortel" },
    { name: "Broccoli" },
    { name: "Spinazie" },
    { name: "Sla" },
    { name: "Komkommer" },
    { name: "Courgette" },
    { name: "Champignon" },
    { name: "Aardappel" },
    { name: "Zoete Aardappel" },
    { name: "Selderij" },
    { name: "Boerenkool" },
    { name: "Kool" },
    { name: "Bloemkool" },
    { name: "Asperges" },
    { name: "Sperziebonen" },
    { name: "Erwten" },
    { name: "Maïs" },
    { name: "Avocado" },
    { name: "Aubergine" },
    { name: "Rode Ui" },
    { name: "Lente-Ui" },
    { name: "Prei" },
    { name: "Citroen" },
    { name: "Limoen" },
    { name: "Sinaasappel" },
    { name: "Appel" },
    { name: "Banaan" },
    { name: "Druiven" },
    { name: "Mango" },
    { name: "Ananas" },
    { name: "Aardbei" },
    { name: "Blauwe Bes" },
    { name: "Framboos" },
    { name: "Perzik" },
    { name: "Peer" },
    { name: "Kers" },
    { name: "Kokosnoot" },
    { name: "Dadel" },
    { name: "Kippendij" },
    { name: "Rundergehakt" },
    { name: "Biefstuk" },
    { name: "Varkenskotelet" },
    { name: "Bacon" },
    { name: "Worst" },
    { name: "Kalkoen" },
    { name: "Lam" },
    { name: "Ham" },
    { name: "Eend" },
    { name: "Kippenvleugel" },
    { name: "Kippenpoot" },
    { name: "Zalm" },
    { name: "Tonijn" },
    { name: "Garnalen" },
    { name: "Kabeljauw" },
    { name: "Tilapia" },
    { name: "Mosselen" },
    { name: "Coquilles" },
    { name: "Sardines" },
    { name: "Ansjovis" },
    { name: "Makreel" },
    { name: "Forel" },
    { name: "Paprikapoeder" },
    { name: "Komijn" },
    { name: "Oregano" },
    { name: "Basilicum" },
    { name: "Tijm" },
    { name: "Rozemarijn" },
    { name: "Kaneel" },
    { name: "Kurkuma" },
    { name: "Gember" },
    { name: "Chilipoeder" },
    { name: "Laurierblad" },
    { name: "Peterselie" },
    { name: "Koriander" },
    { name: "Munt" },
    { name: "Parmezaanse Kaas" },
    { name: "Mozzarella" },
    { name: "Cheddar" },
    { name: "Yoghurt" },
    { name: "Zure Room" },
    { name: "Roomkaas" },
    { name: "Slagroom" },
    { name: "Ei" },
    { name: "Plantaardige Olie" },
    { name: "Sojasaus" },
    { name: "Azijn" },
    { name: "Citroensap" },
    { name: "Limboensap" },
    { name: "Kokosmelk" },
    { name: "Sesamolie" },
    { name: "Kippenbouillon" },
    { name: "Runderbouillon" },
    { name: "Groentebouillon" },
    { name: "Witte Wijn" },
    { name: "Rode Wijn" },
    { name: "Vissaus" },
    { name: "Worcestersaus" },
    { name: "Honing" },
    { name: "Ahornsiroop" },
    { name: "Balsamico Azijn" },
    { name: "Rijstazijn" },
    { name: "Sesamzaadjes" },
    { name: "Bloem" },
    { name: "Suiker" },
    { name: "Bruine Suiker" },
    { name: "Paneermeel" },
    { name: "Pasta" },
    { name: "Rijst" },
    { name: "Quinoa" },
    { name: "Couscous" },
    { name: "Linzen" },
    { name: "Kikkererwten" },
    { name: "Zwarte Bonen" },
    { name: "Kidneybonen" },
    { name: "Amandelen" },
    { name: "Walnoten" },
    { name: "Cashewnoten" },
    { name: "Pinda's" },
    { name: "Tomatensaus (geconcentreerd)" },
    { name: "Tomatensaus" },
    { name: "Tomaten uit Blik" },
    { name: "Maïzena" },
    { name: "Bakpoeder" },
    { name: "Natriumcarbonaat" },
    { name: "Vanille-Extract" },
    { name: "Gist" },
    { name: "Cacaopoeder" },
    { name: "Chocolade" },
    { name: "Mayonaise" },
    { name: "Mosterd" },
    { name: "Ketchup" },
    { name: "Hete Saus" },
    { name: "Pesto" },
  ];

  db.insert(ingredients).values(
    foodData.map((f, i) => ({ ingredientId: i + 1, ...f })),
  ).run();

  db.insert(recipes).values({
    recipeId,
    name: "Gegrilde Kip met Tomatensalsa",
    cookingTime: 30,
    kitchen: "Mexicaans",
    status: "to try",
    description: "Een heerlijk recept voor gegrilde kip geserveerd met verse tomatensalsa.",
  }).run();

  db.insert(recipeIngredients).values([
    { recipeId, ingredientId: 2, quantity: 200, unit: "g" },
    { recipeId, ingredientId: 1, quantity: 100, unit: "g" },
    { recipeId, ingredientId: 3, quantity: 2, unit: "tbsp" },
    { recipeId, ingredientId: 4, quantity: 2, unit: "pcs" },
    { recipeId, ingredientId: 5, quantity: 1, unit: "tsp" },
    { recipeId, ingredientId: 6, quantity: 0.5, unit: "tsp" },
  ]).run();

  db.insert(recipeSteps).values([
    { recipeId, stepNumber: 1, description: "Bestrooi de kipfilets aan beide kanten met zout en zwarte peper." },
    { recipeId, stepNumber: 2, description: "Verhit de olijfolie in een grillpan op middelhoog vuur." },
    { recipeId, stepNumber: 3, description: "Grill de kip 6-7 minuten per kant tot hij gaar is." },
    { recipeId, stepNumber: 4, description: "Snijd de tomaten in blokjes en hak de knoflook fijn." },
    { recipeId, stepNumber: 5, description: "Meng de tomaten, knoflook en een scheutje olijfolie tot een salsa." },
    { recipeId, stepNumber: 6, description: "Serveer de gegrilde kip met de verse tomatensalsa." },
  ]).run();

  db.insert(workoutTemplates).values({
    templateId: 1,
    name: "Full Body",
    description: "Een full-body workout voor beginners.",
    targetMuscleGroups: "Full Body",
    estimatedTime: 45,
  }).run();

  db.insert(templateExercises).values([
    { templateId: 1, exerciseName: "Bench Press", sortOrder: 0, defaultSets: 3, defaultReps: 10, defaultWeight: 40 },
    { templateId: 1, exerciseName: "Squat", sortOrder: 1, defaultSets: 3, defaultReps: 10, defaultWeight: 50 },
    { templateId: 1, exerciseName: "Pull-ups", sortOrder: 2, defaultSets: 3, defaultReps: 8, defaultWeight: null },
  ]).run();

  console.log("Seeding complete.");
}

seed().catch(console.error);
