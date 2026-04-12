import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:fitness.db");
  }
  return dbPromise;
}

export async function initDb() {
  const db = await getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      movement_pattern TEXT,
      primary_muscles TEXT,
      equipment TEXT,
      notes TEXT
    )
  `);

  const result = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM exercises"
  );

  const count = result[0]?.count ?? 0;

  if (count === 0) {
    const starterExercises = [
      ["Back Squat", "Lower", "Squat", "Quads/Glutes", "Barbell", ""],
      ["Bench Press", "Upper", "Horizontal Push", "Chest/Triceps", "Barbell", ""],
      ["Deadlift", "Lower", "Hinge", "Posterior Chain", "Barbell", ""],
      ["Overhead Press", "Upper", "Vertical Push", "Shoulders/Triceps", "Barbell", ""],
      ["Pull-Up", "Upper", "Vertical Pull", "Lats/Biceps", "Bodyweight", ""],
      ["Barbell Row", "Upper", "Horizontal Pull", "Upper Back/Lats", "Barbell", ""],
      ["Bulgarian Split Squat", "Lower", "Single Leg", "Quads/Glutes", "Dumbbell/Barbell", ""],
      ["Romanian Deadlift", "Lower", "Hinge", "Hamstrings/Glutes", "Barbell", ""],
      ["Lat Pulldown", "Upper", "Vertical Pull", "Lats", "Cable", ""],
      ["Leg Extension", "Lower", "Isolation", "Quads", "Machine", ""],
    ];

    for (const ex of starterExercises) {
      await db.execute(
        `INSERT INTO exercises
          (name, category, movement_pattern, primary_muscles, equipment, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ex
      );
    }
  }
}

export type Exercise = {
  id: number;
  name: string;
  category: string;
  movement_pattern?: string | null;
  primary_muscles?: string | null;
  equipment?: string | null;
  notes?: string | null;
};

export async function getExercises(): Promise<Exercise[]> {
  const db = await getDb();

  return db.select<Exercise[]>(
    `SELECT id, name, category, movement_pattern, primary_muscles, equipment, notes
     FROM exercises
     ORDER BY name ASC`
  );
}