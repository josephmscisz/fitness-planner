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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      mode TEXT NOT NULL,
      workout_code TEXT NOT NULL,
      duration TEXT NOT NULL,
      title TEXT NOT NULL,
      reason TEXT,
      completed_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS exercise_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      planned_sets TEXT,
      planned_reps TEXT,
      weight TEXT,
      actual_sets TEXT,
      actual_reps TEXT,
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
      ["Triceps Pushdown", "Upper", "Isolation", "Triceps", "Cable", ""],
      ["Incline Press", "Upper", "Push", "Chest/Shoulders", "Barbell/Dumbbell", ""],
      ["Face Pull", "Upper", "Pull", "Rear Delts/Upper Back", "Cable", ""],
      ["Curl", "Upper", "Isolation", "Biceps", "Dumbbell/Cable", ""],
      ["Front Squat", "Lower", "Squat", "Quads/Core", "Barbell", ""],
      ["Hamstring Curl", "Lower", "Isolation", "Hamstrings", "Machine", ""],
      ["Cable Fly", "Upper", "Isolation", "Chest", "Cable", ""],
      ["Lateral Raise", "Upper", "Isolation", "Shoulders", "Dumbbell/Cable", ""],
      ["Calf Raise", "Lower", "Isolation", "Calves", "Machine/Bodyweight", ""],
      ["Rear Delt Raise", "Upper", "Isolation", "Rear Delts", "Dumbbell", ""],
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

export type CreateSessionInput = {
  mode: string;
  workoutCode: string;
  duration: string;
  title: string;
  reason: string;
};

export async function createWorkoutSession(input: CreateSessionInput): Promise<number> {
  const db = await getDb();

  await db.execute(
    `INSERT INTO workout_sessions
      (started_at, mode, workout_code, duration, title, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      input.mode,
      input.workoutCode,
      input.duration,
      input.title,
      input.reason,
    ]
  );

  const rows = await db.select<{ id: number }[]>(
    `SELECT id FROM workout_sessions ORDER BY id DESC LIMIT 1`
  );

  return rows[0].id;
}

export type ExerciseLogInput = {
  sessionId: number;
  exerciseName: string;
  plannedSets?: string;
  plannedReps?: string;
  weight?: string;
  actualSets?: string;
  actualReps?: string;
  notes?: string;
};

export async function insertExerciseLog(input: ExerciseLogInput) {
  const db = await getDb();

  await db.execute(
    `INSERT INTO exercise_logs
      (session_id, exercise_name, planned_sets, planned_reps, weight, actual_sets, actual_reps, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.sessionId,
      input.exerciseName,
      input.plannedSets ?? "",
      input.plannedReps ?? "",
      input.weight ?? "",
      input.actualSets ?? "",
      input.actualReps ?? "",
      input.notes ?? "",
    ]
  );
}

export async function completeWorkoutSession(sessionId: number) {
  const db = await getDb();

  await db.execute(
    `UPDATE workout_sessions
     SET completed_at = ?
     WHERE id = ?`,
    [new Date().toISOString(), sessionId]
  );
}

export type WorkoutSession = {
  id: number;
  started_at: string;
  completed_at?: string | null;
  mode: string;
  workout_code: string;
  duration: string;
  title: string;
  reason?: string | null;
};

export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  const db = await getDb();

  return db.select<WorkoutSession[]>(
    `SELECT *
     FROM workout_sessions
     ORDER BY started_at DESC`
  );
}

export type ExerciseLog = {
  id: number;
  session_id: number;
  exercise_name: string;
  planned_sets?: string;
  planned_reps?: string;
  weight?: string;
  actual_sets?: string;
  actual_reps?: string;
  notes?: string;
};

export async function getExerciseLogs(sessionId: number): Promise<ExerciseLog[]> {
  const db = await getDb();

  return db.select<ExerciseLog[]>(
    `SELECT *
     FROM exercise_logs
     WHERE session_id = ?
     ORDER BY id ASC`,
    [sessionId]
  );
}

export async function getLastExerciseLog(exerciseName: string) {
  const db = await getDb();

  const rows = await db.select<any[]>(
    `SELECT *
     FROM exercise_logs
     WHERE exercise_name = ?
     ORDER BY id DESC
     LIMIT 1`,
    [exerciseName]
  );

  return rows[0] ?? null;
}