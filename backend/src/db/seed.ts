import db from "./client";
import { users, modules, usermodulepermissions, ingredients, recipes, recipeIngredients, recipeSteps } from "./schema";

const seedUserId = 1;
const recipeModuleId = 1;
const recipeId = 1;

async function seed() {
  console.log("Seeding database...");

  const existingUser = db.select().from(users).where((u) => u.username).get();
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

  db.insert(usermodulepermissions).values([
    { userId: seedUserId, moduleId: recipeModuleId },
    { userId: 2, moduleId: recipeModuleId },
  ]).run();

  const foodData: { name: string; foodType: string }[] = [
    { name: "Tomaat", foodType: "vegetable" },
    { name: "Kipfilet", foodType: "meat" },
    { name: "Olijfolie", foodType: "liquid" },
    { name: "Knoflook", foodType: "spice" },
    { name: "Zout", foodType: "spice" },
    { name: "Zwarte Peper", foodType: "spice" },
    { name: "Ui", foodType: "vegetable" },
    { name: "Paprika", foodType: "vegetable" },
    { name: "Wortel", foodType: "vegetable" },
    { name: "Broccoli", foodType: "vegetable" },
    { name: "Spinazie", foodType: "vegetable" },
    { name: "Sla", foodType: "vegetable" },
    { name: "Komkommer", foodType: "vegetable" },
    { name: "Courgette", foodType: "vegetable" },
    { name: "Champignon", foodType: "vegetable" },
    { name: "Aardappel", foodType: "vegetable" },
    { name: "Zoete Aardappel", foodType: "vegetable" },
    { name: "Selderij", foodType: "vegetable" },
    { name: "Boerenkool", foodType: "vegetable" },
    { name: "Kool", foodType: "vegetable" },
    { name: "Bloemkool", foodType: "vegetable" },
    { name: "Asperges", foodType: "vegetable" },
    { name: "Sperziebonen", foodType: "vegetable" },
    { name: "Erwten", foodType: "vegetable" },
    { name: "Maïs", foodType: "vegetable" },
    { name: "Avocado", foodType: "vegetable" },
    { name: "Aubergine", foodType: "vegetable" },
    { name: "Rode Ui", foodType: "vegetable" },
    { name: "Lente-Ui", foodType: "vegetable" },
    { name: "Prei", foodType: "vegetable" },
    { name: "Citroen", foodType: "fruit" },
    { name: "Limoen", foodType: "fruit" },
    { name: "Sinaasappel", foodType: "fruit" },
    { name: "Appel", foodType: "fruit" },
    { name: "Banaan", foodType: "fruit" },
    { name: "Druiven", foodType: "fruit" },
    { name: "Mango", foodType: "fruit" },
    { name: "Ananas", foodType: "fruit" },
    { name: "Aardbei", foodType: "fruit" },
    { name: "Blauwe Bes", foodType: "fruit" },
    { name: "Framboos", foodType: "fruit" },
    { name: "Perzik", foodType: "fruit" },
    { name: "Peer", foodType: "fruit" },
    { name: "Kers", foodType: "fruit" },
    { name: "Kokosnoot", foodType: "fruit" },
    { name: "Dadel", foodType: "fruit" },
    { name: "Kippendij", foodType: "meat" },
    { name: "Rundergehakt", foodType: "meat" },
    { name: "Biefstuk", foodType: "meat" },
    { name: "Varkenskotelet", foodType: "meat" },
    { name: "Bacon", foodType: "meat" },
    { name: "Worst", foodType: "meat" },
    { name: "Kalkoen", foodType: "meat" },
    { name: "Lam", foodType: "meat" },
    { name: "Ham", foodType: "meat" },
    { name: "Eend", foodType: "meat" },
    { name: "Kippenvleugel", foodType: "meat" },
    { name: "Kippenpoot", foodType: "meat" },
    { name: "Zalm", foodType: "fish" },
    { name: "Tonijn", foodType: "fish" },
    { name: "Garnalen", foodType: "fish" },
    { name: "Kabeljauw", foodType: "fish" },
    { name: "Tilapia", foodType: "fish" },
    { name: "Mosselen", foodType: "fish" },
    { name: "Coquilles", foodType: "fish" },
    { name: "Sardines", foodType: "fish" },
    { name: "Ansjovis", foodType: "fish" },
    { name: "Makreel", foodType: "fish" },
    { name: "Forel", foodType: "fish" },
    { name: "Paprikapoeder", foodType: "spice" },
    { name: "Komijn", foodType: "spice" },
    { name: "Oregano", foodType: "spice" },
    { name: "Basilicum", foodType: "spice" },
    { name: "Tijm", foodType: "spice" },
    { name: "Rozemarijn", foodType: "spice" },
    { name: "Kaneel", foodType: "spice" },
    { name: "Kurkuma", foodType: "spice" },
    { name: "Gember", foodType: "spice" },
    { name: "Chilipoeder", foodType: "spice" },
    { name: "Laurierblad", foodType: "spice" },
    { name: "Peterselie", foodType: "spice" },
    { name: "Koriander", foodType: "spice" },
    { name: "Munt", foodType: "spice" },
    { name: "Nootmuskaat", foodType: "spice" },
    { name: "Korianderzaad", foodType: "spice" },
    { name: "Dille", foodType: "spice" },
    { name: "Salie", foodType: "spice" },
    { name: "Kerriepoeder", foodType: "spice" },
    { name: "Chilivlokken", foodType: "spice" },
    { name: "Boter", foodType: "dairy" },
    { name: "Melk", foodType: "dairy" },
    { name: "Room", foodType: "dairy" },
    { name: "Kaas", foodType: "dairy" },
    { name: "Parmezaanse Kaas", foodType: "dairy" },
    { name: "Mozzarella", foodType: "dairy" },
    { name: "Cheddar", foodType: "dairy" },
    { name: "Yoghurt", foodType: "dairy" },
    { name: "Zure Room", foodType: "dairy" },
    { name: "Roomkaas", foodType: "dairy" },
    { name: "Slagroom", foodType: "dairy" },
    { name: "Ei", foodType: "dairy" },
    { name: "Plantaardige Olie", foodType: "liquid" },
    { name: "Sojasaus", foodType: "liquid" },
    { name: "Azijn", foodType: "liquid" },
    { name: "Citroensap", foodType: "liquid" },
    { name: "Limboensap", foodType: "liquid" },
    { name: "Kokosmelk", foodType: "liquid" },
    { name: "Sesamolie", foodType: "liquid" },
    { name: "Kippenbouillon", foodType: "liquid" },
    { name: "Runderbouillon", foodType: "liquid" },
    { name: "Groentebouillon", foodType: "liquid" },
    { name: "Witte Wijn", foodType: "liquid" },
    { name: "Rode Wijn", foodType: "liquid" },
    { name: "Vissaus", foodType: "liquid" },
    { name: "Worcestersaus", foodType: "liquid" },
    { name: "Honing", foodType: "liquid" },
    { name: "Ahornsiroop", foodType: "liquid" },
    { name: "Balsamico Azijn", foodType: "liquid" },
    { name: "Rijstazijn", foodType: "liquid" },
    { name: "Sesamzaadjes", foodType: "other" },
    { name: "Bloem", foodType: "other" },
    { name: "Suiker", foodType: "other" },
    { name: "Bruine Suiker", foodType: "other" },
    { name: "Paneermeel", foodType: "other" },
    { name: "Pasta", foodType: "other" },
    { name: "Rijst", foodType: "other" },
    { name: "Quinoa", foodType: "other" },
    { name: "Couscous", foodType: "other" },
    { name: "Linzen", foodType: "other" },
    { name: "Kikkererwten", foodType: "other" },
    { name: "Zwarte Bonen", foodType: "other" },
    { name: "Kidneybonen", foodType: "other" },
    { name: "Amandelen", foodType: "other" },
    { name: "Walnoten", foodType: "other" },
    { name: "Cashewnoten", foodType: "other" },
    { name: "Pinda's", foodType: "other" },
    { name: "Tomatensaus (geconcentreerd)", foodType: "other" },
    { name: "Tomatensaus", foodType: "other" },
    { name: "Tomaten uit Blik", foodType: "other" },
    { name: "Maïzena", foodType: "other" },
    { name: "Bakpoeder", foodType: "other" },
    { name: "Natriumcarbonaat", foodType: "other" },
    { name: "Vanille-Extract", foodType: "other" },
    { name: "Gist", foodType: "other" },
    { name: "Cacaopoeder", foodType: "other" },
    { name: "Chocolade", foodType: "other" },
    { name: "Mayonaise", foodType: "other" },
    { name: "Mosterd", foodType: "other" },
    { name: "Ketchup", foodType: "other" },
    { name: "Hete Saus", foodType: "other" },
    { name: "Pesto", foodType: "other" },
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

  console.log("Seeding complete.");
}

seed().catch(console.error);
