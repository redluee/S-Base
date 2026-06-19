import db from "./client";
import {
  workoutTemplates,
  templateExercises,
} from "./schema";

function seedWorkouts() {
  const existingCount = db.select().from(workoutTemplates).all().length;
  if (existingCount > 1) {
    console.log("Workout templates already seeded, skipping.");
    return;
  }

  const templateIdStart = existingCount + 1;

  const templates = [
    {
      templateId: templateIdStart,
      name: "Springkracht",
      description:
        "Training gericht op sprongkracht en explosiviteit in de benen. Combineert squats, split squats, RDL's en kuitwerk voor maximale vertical jump.",
      targetMuscleGroups: "Benen, Kuiten, Core",
      estimatedTime: 45,
      exercises: [
        { exerciseName: "Standard Back Squat", sortOrder: 0, defaultSets: 4, defaultReps: 8, defaultWeight: null },
        { exerciseName: "Bulgarian Split Squat", sortOrder: 1, defaultSets: 3, defaultReps: 8, defaultWeight: null },
        { exerciseName: "Single-Legged RDL", sortOrder: 2, defaultSets: 3, defaultReps: 8, defaultWeight: null },
        { exerciseName: "Single-Leg Calf Raise", sortOrder: 3, defaultSets: 3, defaultReps: 12, defaultWeight: null },
        { exerciseName: "Hanging Leg Raise", sortOrder: 4, defaultSets: 3, defaultReps: 10, defaultWeight: null },
      ],
    },
    {
      templateId: templateIdStart + 1,
      name: "Slagkracht",
      description:
        "Training gericht op slagkracht en bovenlichaamskracht. Bouwt schouder-, rug- en core-kracht voor harde volleyballsmashes.",
      targetMuscleGroups: "Schouders, Rug, Core",
      estimatedTime: 40,
      exercises: [
        { exerciseName: "Weighted Plate Shoulder Raise", sortOrder: 0, defaultSets: 3, defaultReps: 10, defaultWeight: null },
        { exerciseName: "Pull-Up Negatives", sortOrder: 1, defaultSets: 3, defaultReps: 6, defaultWeight: null },
        { exerciseName: "Lat Pull Down", sortOrder: 2, defaultSets: 3, defaultReps: 10, defaultWeight: null },
        { exerciseName: "Cable Shoulder Rotation", sortOrder: 3, defaultSets: 2, defaultReps: 10, defaultWeight: null },
        { exerciseName: "Russian Twist", sortOrder: 4, defaultSets: 3, defaultReps: 30, defaultWeight: null },
      ],
    },
    {
      templateId: templateIdStart + 2,
      name: "Volleybal Conditie",
      description:
        "Full-body conditietraining die alle spiergroepen aanspreekt die essentieel zijn voor volleyballers. Combineert beenkracht, bovenlichaam en core voor een complete workout.",
      targetMuscleGroups: "Full Body, Core",
      estimatedTime: 50,
      exercises: [
        { exerciseName: "Standard Back Squat", sortOrder: 0, defaultSets: 3, defaultReps: 8, defaultWeight: null },
        { exerciseName: "Bulgarian Split Squat", sortOrder: 1, defaultSets: 3, defaultReps: 8, defaultWeight: null },
        { exerciseName: "Weighted Plate Shoulder Raise", sortOrder: 2, defaultSets: 3, defaultReps: 10, defaultWeight: null },
        { exerciseName: "Lat Pull Down", sortOrder: 3, defaultSets: 3, defaultReps: 10, defaultWeight: null },
        { exerciseName: "Single-Leg Calf Raise", sortOrder: 4, defaultSets: 3, defaultReps: 12, defaultWeight: null },
        { exerciseName: "Russian Twist", sortOrder: 5, defaultSets: 3, defaultReps: 30, defaultWeight: null },
      ],
    },
  ];

  for (const t of templates) {
    db.insert(workoutTemplates).values({
      templateId: t.templateId,
      name: t.name,
      description: t.description,
      targetMuscleGroups: t.targetMuscleGroups,
      estimatedTime: t.estimatedTime,
    }).run();

    for (const ex of t.exercises) {
      db.insert(templateExercises).values({
        templateId: t.templateId,
        exerciseName: ex.exerciseName,
        sortOrder: ex.sortOrder,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        defaultWeight: ex.defaultWeight,
      }).run();
    }

    console.log(`  Created "${t.name}" with ${t.exercises.length} exercises.`);
  }

  console.log("Workout seeding complete.");
}

seedWorkouts();
