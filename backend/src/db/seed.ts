import db from "./client";
import {
  users,
  modules,
  usermodulepermissions,
  recipes,
  recipeSteps,
  recipeIngredients,
  ingredients,
  workoutTemplates,
  templateExercises,
  workoutSessions,
  sessionExercises,
  sessionSets,
  measurements,
  wines
} from "./schema";
import { eq, sql } from "drizzle-orm";

async function getOrCreateModule(name: string, alias: string, description: string) {
  const existing = db.select().from(modules).where(eq(modules.moduleName, name)).get();
  if (existing) {
    return existing;
  }
  return db.insert(modules).values({
    moduleName: name,
    moduleAlias: alias,
    description,
  }).returning().get();
}

async function seed() {
  console.log("Starting development database seeding...");

  // 1. Ensure modules exist
  const recipesMod = await getOrCreateModule("recipes", "Smaak Tracker", "Module voor het beheren van recepten");
  const workoutMod = await getOrCreateModule("workout", "Workout Studio", "Module voor het beheren van workouts en trainingssessies");
  const measurementsMod = await getOrCreateModule("measurements", "Metingen", "Module voor lichaamsmetingen");

  const allDbModules = [recipesMod, workoutMod, measurementsMod];

  // 2. Setup users: admin and test
  const usernames = ["admin", "test"];
  const userMap = new Map<string, any>();

  for (const username of usernames) {
    // Delete existing user if exists to ensure clean idempotent seed
    const existingUser = db.select().from(users).where(eq(users.username, username)).get();
    if (existingUser) {
      const uid = existingUser.userId;
      db.run(sql`DELETE FROM session_sets WHERE session_exercise_id IN (
        SELECT session_exercise_id FROM session_exercises WHERE session_id IN (
          SELECT session_id FROM workout_sessions WHERE user_id = ${uid}
        )
      )`);
      db.run(sql`DELETE FROM session_exercises WHERE session_id IN (
        SELECT session_id FROM workout_sessions WHERE user_id = ${uid}
      )`);
      db.run(sql`DELETE FROM workout_sessions WHERE user_id = ${uid}`);
      db.run(sql`DELETE FROM template_exercises WHERE template_id IN (
        SELECT template_id FROM workout_templates WHERE user_id = ${uid}
      )`);
      db.run(sql`DELETE FROM workout_templates WHERE user_id = ${uid}`);
      db.run(sql`DELETE FROM wines WHERE user_id = ${uid}`);
      db.run(sql`DELETE FROM measurements WHERE user_id = ${uid}`);
      db.run(sql`DELETE FROM usermodulepermissions WHERE user_id = ${uid}`);
      db.run(sql`DELETE FROM sessions WHERE user_id = ${uid}`);
      db.run(sql`DELETE FROM users WHERE user_id = ${uid}`);
      console.log(`Cleared existing user '${username}' and associated data.`);
    }

    const passwordHash = await Bun.password.hash(username, { algorithm: "argon2id" });
    const insertedUser = db.insert(users).values({
      username,
      pswdHash: passwordHash,
      email: `${username}@example.com`,
    }).returning().get();

    userMap.set(username, insertedUser);
    console.log(`Created user '${username}' (id=${insertedUser.userId})`);

    // Grant all module permissions
    for (const mod of allDbModules) {
      db.insert(usermodulepermissions).values({
        userId: insertedUser.userId,
        moduleId: mod.moduleId,
      }).run();
    }
    console.log(`Granted all module permissions to user '${username}'.`);
  }

  // 3. Seed 5 global Recipes (and remove any with conflicting names first)
  const recipeData = [
    {
      name: "Gegrilde Kip met Tomatensalsa",
      cookingTime: 30,
      kitchen: "Mexicaans",
      status: "success",
      description: "Een heerlijk recept voor gegrilde kip geserveerd met verse tomatensalsa.",
      rating: 9,
      steps: [
        "Bestrooi de kipfilets aan beide kanten met zout en zwarte peper.",
        "Verhit de olijfolie in een grillpan op middelhoog vuur.",
        "Grill de kip 6-7 minuten per kant tot hij gaar is.",
        "Snijd de tomaten in blokjes en hak de knoflook en ui fijn.",
        "Meng de tomaten, knoflook, ui en een scheutje olijfolie tot een salsa.",
        "Serveer de gegrilde kip met de verse salsa."
      ]
    },
    {
      name: "Klassieke Pasta Bolognese",
      cookingTime: 45,
      kitchen: "Italiaans",
      status: "success",
      description: "Traditionele Italiaanse pastasaus met rundergehakt, tomaat en verse kruiden.",
      rating: 8,
      steps: [
        "Kook de pasta volgens de aanwijzingen op de verpakking.",
        "Snipper de ui en hak de knoflook fijn.",
        "Fruit de ui en knoflook in een grote pan met olijfolie.",
        "Voeg het rundergehakt toe en bak dit rul.",
        "Voeg de tomatensaus en Italiaanse kruiden toe en laat 15 minuten sudderen op laag vuur.",
        "Meng de saus met de gekookte pasta en serveer met geraspte Parmezaanse kaas."
      ]
    },
    {
      name: "Vegetarische Curry met Kikkererwten",
      cookingTime: 25,
      kitchen: "Indiaas",
      status: "to try",
      description: "Een milde, romige curry boordevol groenten en kikkererwten, geserveerd met rijst.",
      rating: 7,
      steps: [
        "Kook de rijst volgens de aanwijzingen.",
        "Snijd de paprika, courgette en ui in blokjes.",
        "Fruit de ui in kokosolie en voeg currypasta toe.",
        "Voeg de groenten toe en bak 5 minuten mee.",
        "Schenk de kokosmelk in de pan en voeg de uitgelekte kikkererwten toe.",
        "Laat het geheel 10 minuten zachtjes koken en serveer met de rijst."
      ]
    },
    {
      name: "Gegrilde Zalm met Broccoli",
      cookingTime: 20,
      kitchen: "Aziatisch",
      status: "needs tweak",
      description: "Zalmfilet gemarineerd in sojasaus en sesamolie, geserveerd met knapperige broccoli.",
      rating: 8,
      steps: [
        "Marineer de zalmfilet in sojasaus and een beetje sesamolie.",
        "Snijd de broccoli in roosjes en stoom of kook deze beetgaar.",
        "Verhit een pan en bak de zalm 3-4 minuten aan elke kant.",
        "Garneer met sesamzaadjes and serveer direct met de broccoli."
      ]
    },
    {
      name: "Shakshuka",
      cookingTime: 20,
      kitchen: "Midden-Oosters",
      status: "success",
      description: "Eieren gepocheerd in een pittige tomatensaus met paprika, ui en komijn.",
      rating: 9,
      steps: [
        "Fruit ui, knoflook en paprika in een pan.",
        "Voeg komijn en paprikapoeder toe en bak 1 minuut mee.",
        "Schenk de tomatenblokjes in de pan en laat 10 minuten pruttelen.",
        "Maak kuiltjes in de saus en breek hier de eieren in.",
        "Leg een deksel op de pan en laat de eieren in ca. 6 minuten stollen.",
        "Garneer met verse peterselie en serveer met brood."
      ]
    }
  ];

  for (const r of recipeData) {
    const existingRecipe = db.select().from(recipes).where(eq(recipes.name, r.name)).get();
    if (existingRecipe) {
      db.delete(recipes).where(eq(recipes.recipeId, existingRecipe.recipeId)).run();
    }

    const insertedRecipe = db.insert(recipes).values({
      name: r.name,
      cookingTime: r.cookingTime,
      kitchen: r.kitchen,
      status: r.status,
      description: r.description,
      rating: r.rating
    }).returning().get();

    for (let i = 0; i < r.steps.length; i++) {
      db.insert(recipeSteps).values({
        recipeId: insertedRecipe.recipeId,
        stepNumber: i + 1,
        description: r.steps[i]
      }).run();
    }
  }
  console.log("Seeded 5 global recipes.");

  // 4. Seed user-specific data (Workout templates, completed workouts, body measurements, wines)
  for (const [username, user] of userMap.entries()) {
    console.log(`Seeding specific data for user '${username}'...`);

    // --- 3 Workout Templates ---
    const templates = [
      {
        name: "Borst en Triceps",
        description: "Focus op push spiergroepen voor krachtopbouw.",
        targetMuscleGroups: "Borst, Triceps, Schouders",
        estimatedTime: 60,
        exercises: [
          { exerciseName: "Bench Press", sortOrder: 0, category: "Free Weights", defaultSets: 4, defaultReps: 10, defaultWeight: 60.0, equipment: "barbell" },
          { exerciseName: "Dumbbell Shoulder Press", sortOrder: 1, category: "Free Weights", defaultSets: 3, defaultReps: 10, defaultWeight: 16.0, equipment: "dumbbell" },
          { exerciseName: "Tricep Pushdown", sortOrder: 2, category: "Free Weights", defaultSets: 3, defaultReps: 12, defaultWeight: 20.0, equipment: "cable" }
        ]
      },
      {
        name: "Rug en Biceps",
        description: "Focus op pull spiergroepen voor een sterke rug.",
        targetMuscleGroups: "Rug, Biceps",
        estimatedTime: 50,
        exercises: [
          { exerciseName: "Pull-Up", sortOrder: 0, category: "Bodyweight", defaultSets: 3, defaultReps: 8, defaultWeight: 0.0, equipment: "none" },
          { exerciseName: "Barbell Row", sortOrder: 1, category: "Free Weights", defaultSets: 3, defaultReps: 10, defaultWeight: 50.0, equipment: "barbell" },
          { exerciseName: "Dumbbell Bicep Curl", sortOrder: 2, category: "Free Weights", defaultSets: 3, defaultReps: 12, defaultWeight: 12.0, equipment: "dumbbell" }
        ]
      },
      {
        name: "Benen & Core",
        description: "Focus op onderlichaam en stabiliteit.",
        targetMuscleGroups: "Benen, Core",
        estimatedTime: 45,
        exercises: [
          { exerciseName: "Barbell Back Squat", sortOrder: 0, category: "Free Weights", defaultSets: 4, defaultReps: 8, defaultWeight: 80.0, equipment: "barbell" },
          { exerciseName: "Bulgarian Split Squat", sortOrder: 1, category: "Free Weights", defaultSets: 3, defaultReps: 8, defaultWeight: 14.0, equipment: "dumbbell" },
          { exerciseName: "Plank", sortOrder: 2, category: "Bodyweight", defaultSets: 3, defaultReps: 1, defaultWeight: 0.0, defaultDuration: 60, equipment: "none" }
        ]
      }
    ];

    const templateIds: number[] = [];
    for (const t of templates) {
      const insertedTemplate = db.insert(workoutTemplates).values({
        userId: user.userId,
        name: t.name,
        description: t.description,
        targetMuscleGroups: t.targetMuscleGroups,
        estimatedTime: t.estimatedTime
      }).returning().get();

      templateIds.push(insertedTemplate.templateId);

      for (const ex of t.exercises) {
        db.insert(templateExercises).values({
          templateId: insertedTemplate.templateId,
          exerciseName: ex.exerciseName,
          sortOrder: ex.sortOrder,
          category: ex.category,
          defaultSets: ex.defaultSets,
          defaultReps: ex.defaultReps,
          defaultWeight: ex.defaultWeight,
          defaultDuration: ex.defaultDuration ?? null,
          equipment: ex.equipment
        }).run();
      }
    }
    console.log(`  Seeded 3 workout templates for ${username}.`);

    // --- 9 Completed Workouts (Sessions, 3 per template) ---
    let sessionCount = 0;
    for (let j = 0; j < templateIds.length; j++) {
      const templateId = templateIds[j];
      const template = templates[j];
      for (let k = 0; k < 3; k++) {
        const day = 1 + j * 3 + k;
        const startedAt = `2026-08-0${day} 10:00:00`;
        const completedAt = `2026-08-0${day} 11:00:00`;

        const insertedSession = db.insert(workoutSessions).values({
          templateId,
          userId: user.userId,
          startedAt,
          completedAt,
          notes: `Geweldige training! Alle sets succesvol afgerond voor ${template.name} (Sessie ${k + 1}).`,
          name: `${template.name} Sessie ${k + 1}`
        }).returning().get();

        for (const ex of template.exercises) {
          const insertedEx = db.insert(sessionExercises).values({
            sessionId: insertedSession.sessionId,
            exerciseName: ex.exerciseName,
            sortOrder: ex.sortOrder,
            category: ex.category,
            equipment: ex.equipment
          }).returning().get();

          for (let s = 1; s <= ex.defaultSets; s++) {
            db.insert(sessionSets).values({
              sessionExerciseId: insertedEx.sessionExerciseId,
              setNumber: s,
              reps: ex.defaultReps,
              weight: ex.defaultWeight,
              duration: ex.defaultDuration ?? null,
              completed: 1
            }).run();
          }
        }
        sessionCount++;
      }
    }
    console.log(`  Seeded ${sessionCount} completed workouts for ${username}.`);

    // --- 3 Body Measurement Logs ---
    const measurementLogs = [
      { date: "2026-08-01", height: 180.0, weight: 80.0, bodyFat: 15.0, skeletalMuscle: 38.0, fatMass: 12.0 },
      { date: "2026-08-03", height: 180.0, weight: 79.5, bodyFat: 14.8, skeletalMuscle: 38.2, fatMass: 11.8 },
      { date: "2026-08-05", height: 180.0, weight: 79.0, bodyFat: 14.5, skeletalMuscle: 38.5, fatMass: 11.5 }
    ];

    for (const log of measurementLogs) {
      db.insert(measurements).values({
        userId: user.userId,
        date: log.date,
        height: log.height,
        weight: log.weight,
        bodyFat: log.bodyFat,
        skeletalMuscle: log.skeletalMuscle,
        fatMass: log.fatMass
      }).run();
    }
    console.log(`  Seeded 3 body measurement logs for ${username}.`);

    // --- 5 Wines ---
    const wineData = [
      { brand: "Château Margaux", type: "Rood", variety: "Cabernet Sauvignon", vintage: 2015, countryRegion: "Frankrijk, Bordeaux", purchaseLocation: "Wijnwinkel Amsterdam", rating: 9, notes: "Heerlijke volle smaak, perfect bij rood vlees." },
      { brand: "Cloudy Bay", type: "Wit", variety: "Sauvignon Blanc", vintage: 2021, countryRegion: "Nieuw-Zeeland, Marlborough", purchaseLocation: "Online Wijnshop", rating: 8, notes: "Fris, fruitig met tonen van passievrucht." },
      { brand: "Moët & Chandon", type: "Mousserend", variety: "Chardonnay blend", vintage: 2018, countryRegion: "Frankrijk, Champagne", purchaseLocation: "Slijterij Utrecht", rating: 10, notes: "Klassieke champagne, fijne bubbel." },
      { brand: "Penfolds Bin 389", type: "Rood", variety: "Cabernet Shiraz", vintage: 2019, countryRegion: "Australië", purchaseLocation: "Lokale Slijter", rating: 9, notes: "Stevige en kruidige smaak met houtrijping." },
      { brand: "Ruinart Rosé", type: "Rosé", variety: "Pinot Noir blend", vintage: 2020, countryRegion: "Frankrijk, Champagne", purchaseLocation: "Luchthaven Schiphol", rating: 9, notes: "Zeer verfijnde rosé met rood fruit aroma's." }
    ];

    for (const w of wineData) {
      db.insert(wines).values({
        userId: user.userId,
        brand: w.brand,
        type: w.type,
        variety: w.variety,
        vintage: w.vintage,
        countryRegion: w.countryRegion,
        purchaseLocation: w.purchaseLocation,
        rating: w.rating,
        notes: w.notes
      }).run();
    }
    console.log(`  Seeded 5 wines for ${username}.`);
  }

  console.log("Development database seeding completed successfully!");
}

seed().catch(console.error);
