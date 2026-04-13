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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      mode TEXT NOT NULL,
      duration TEXT NOT NULL,
      focus TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workout_template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      sets TEXT,
      reps TEXT,
      notes TEXT
    )
  `);

  try {
    await db.execute(`ALTER TABLE exercises ADD COLUMN role_type TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE exercises ADD COLUMN accessory_priority INTEGER DEFAULT 5`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE exercises ADD COLUMN tutorial_url TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_template_exercises ADD COLUMN slot_type TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_template_exercises ADD COLUMN accessory_category TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_template_exercises ADD COLUMN accessory_equipment TEXT`);
  } catch {}

  const templateCountRows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM workout_templates"
  );

  const templateCount = templateCountRows[0]?.count ?? 0;

  if (templateCount === 0) {
    const templates = [
      ["A-30", "Chaos A - 30 Minutes", "CHAOS", "30", "Squat + Push anchor"],
      ["A-60", "Chaos A - 60 Minutes", "CHAOS", "60", "Squat + Push balanced"],
      ["B-30", "Chaos B - 30 Minutes", "CHAOS", "30", "Hinge + Pull anchor"],
      ["B-60", "Chaos B - 60 Minutes", "CHAOS", "60", "Hinge + Pull balanced"],
      ["LOWER1-30", "Steady Lower 1 - 30 Minutes", "STEADY", "30", "Squat focus"],
      ["LOWER1-60", "Steady Lower 1 - 60 Minutes", "STEADY", "60", "Squat focus"],
      ["PUSH-30", "Steady Push - 30 Minutes", "STEADY", "30", "Upper push focus"],
      ["PUSH-60", "Steady Push - 60 Minutes", "STEADY", "60", "Upper push balanced"],
    ];

    for (const template of templates) {
      await db.execute(
        `INSERT INTO workout_templates (code, title, mode, duration, focus)
         VALUES (?, ?, ?, ?, ?)`,
        template
      );
    }

    const insertedTemplates = await db.select<{ id: number; code: string }[]>(
      `SELECT id, code FROM workout_templates`
    );

    const templateMap = Object.fromEntries(
      insertedTemplates.map((t) => [t.code, t.id])
    );

    const templateExercises: Array<[string, string, number, string, string, string]> = [
      ["A-30", "Back Squat", 1, "5", "3", ""],
      ["A-30", "Bench Press", 2, "5", "3", ""],

      ["A-60", "Back Squat", 1, "4", "5", ""],
      ["A-60", "Bench Press", 2, "4", "5", ""],
      ["A-60", "Pull-Up", 3, "3", "8", ""],
      ["A-60", "Triceps Pushdown", 4, "3", "12", ""],

      ["B-30", "Deadlift", 1, "5", "3", ""],
      ["B-30", "Pull-Up", 2, "5", "5", ""],

      ["B-60", "Deadlift", 1, "4", "4", ""],
      ["B-60", "Pull-Up", 2, "4", "6-8", ""],
      ["B-60", "Overhead Press", 3, "3", "6", ""],
      ["B-60", "Barbell Row", 4, "3", "8", ""],

      ["LOWER1-30", "Back Squat", 1, "5", "3", ""],
      ["LOWER1-30", "Leg Extension", 2, "3", "10", ""],

      ["LOWER1-60", "Back Squat", 1, "4", "5", ""],
      ["LOWER1-60", "Romanian Deadlift", 2, "3", "8", ""],
      ["LOWER1-60", "Leg Extension", 3, "3", "12", ""],

      ["PUSH-30", "Bench Press", 1, "5", "3", ""],
      ["PUSH-30", "Overhead Press", 2, "3", "6", ""],

      ["PUSH-60", "Bench Press", 1, "4", "5", ""],
      ["PUSH-60", "Overhead Press", 2, "3", "6-8", ""],
      ["PUSH-60", "Incline Press", 3, "3", "8", ""],
      ["PUSH-60", "Triceps Pushdown", 4, "3", "12", ""],
    ];

    for (const [code, exerciseName, sortOrder, sets, reps, notes] of templateExercises) {
      const templateId = templateMap[code];
      if (!templateId) continue;

      await db.execute(
        `INSERT INTO workout_template_exercises
          (template_id, exercise_name, sort_order, sets, reps, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [templateId, exerciseName, sortOrder, sets, reps, notes]
      );
    }
  }
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

export type ExerciseRecord = {
  id: number;
  name: string;
  category: string;
  movement_pattern?: string | null;
  primary_muscles?: string | null;
  equipment?: string | null;
  notes?: string | null;
  role_type?: string | null;
  accessory_priority?: number | null;
  tutorial_url?: string | null; 
};

export async function createExercise(input: {
  name: string;
  category: string;
  movementPattern?: string;
  primaryMuscles?: string;
  equipment?: string;
  notes?: string;
}) {
  const db = await getDb();

  await db.execute(
    `INSERT INTO exercises
      (name, category, movement_pattern, primary_muscles, equipment, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.category,
      input.movementPattern ?? "",
      input.primaryMuscles ?? "",
      input.equipment ?? "",
      input.notes ?? "",
    ]
  );
}

export async function updateExercise(input: {
  id: number;
  name: string;
  category: string;
  movementPattern?: string;
  primaryMuscles?: string;
  equipment?: string;
  notes?: string;
}) {
  const db = await getDb();

  await db.execute(
    `UPDATE exercises
     SET name = ?, category = ?, movement_pattern = ?, primary_muscles = ?, equipment = ?, notes = ?
     WHERE id = ?`,
    [
      input.name,
      input.category,
      input.movementPattern ?? "",
      input.primaryMuscles ?? "",
      input.equipment ?? "",
      input.notes ?? "",
      input.id,
    ]
  );
}

export async function deleteExercise(id: number) {
  const db = await getDb();

  await db.execute(`DELETE FROM exercises WHERE id = ?`, [id]);
}

export async function getExercisesFiltered(filters?: {
  category?: string;
  equipment?: string;
  search?: string;
}): Promise<ExerciseRecord[]> {
  const db = await getDb();

  let query = `
    SELECT id, name, category, movement_pattern, primary_muscles, equipment, notes
    FROM exercises
    WHERE 1=1
  `;
  const params: string[] = [];

  if (filters?.category) {
    query += ` AND category = ?`;
    params.push(filters.category);
  }

  if (filters?.equipment) {
    query += ` AND equipment = ?`;
    params.push(filters.equipment);
  }

  if (filters?.search) {
    query += ` AND LOWER(name) LIKE ?`;
    params.push(`%${filters.search.toLowerCase()}%`);
  }

  query += ` ORDER BY name ASC`;

  return db.select<ExerciseRecord[]>(query, params);
}

export async function getDistinctExerciseCategories(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ category: string }[]>(
    `SELECT DISTINCT category FROM exercises WHERE category != '' ORDER BY category ASC`
  );
  return rows.map((r) => r.category);
}

export async function getDistinctExerciseEquipment(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ equipment: string }[]>(
    `SELECT DISTINCT equipment FROM exercises WHERE equipment != '' ORDER BY equipment ASC`
  );
  return rows.map((r) => r.equipment);
}

export type WorkoutTemplateRecord = {
  id: number;
  code: string;
  title: string;
  mode: string;
  duration: string;
  focus?: string | null;
};

export type WorkoutTemplateExerciseRecord = {
  id: number;
  template_id: number;
  exercise_name: string;
  sort_order: number;
  sets?: string | null;
  reps?: string | null;
  notes?: string | null;
};

export async function getWorkoutTemplates(): Promise<WorkoutTemplateRecord[]> {
  const db = await getDb();

  return db.select<WorkoutTemplateRecord[]>(
    `SELECT *
     FROM workout_templates
     ORDER BY mode ASC, duration ASC, title ASC`
  );
}

export async function getWorkoutTemplateExercises(
  templateId: number
): Promise<WorkoutTemplateExerciseRecord[]> {
  const db = await getDb();

  return db.select<WorkoutTemplateExerciseRecord[]>(
    `SELECT *
     FROM workout_template_exercises
     WHERE template_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [templateId]
  );
}

export async function updateWorkoutTemplate(input: {
  id: number;
  title: string;
  focus?: string;
}) {
  const db = await getDb();

  await db.execute(
    `UPDATE workout_templates
     SET title = ?, focus = ?
     WHERE id = ?`,
    [input.title, input.focus ?? "", input.id]
  );
}

export async function updateWorkoutTemplateExercise(input: {
  id: number;
  exerciseName: string;
  sets?: string;
  reps?: string;
  notes?: string;
  sortOrder: number;
}) {
  const db = await getDb();

  await db.execute(
    `UPDATE workout_template_exercises
     SET exercise_name = ?, sets = ?, reps = ?, notes = ?, sort_order = ?
     WHERE id = ?`,
    [
      input.exerciseName,
      input.sets ?? "",
      input.reps ?? "",
      input.notes ?? "",
      input.sortOrder,
      input.id,
    ]
  );
}

export async function addWorkoutTemplateExercise(input: {
  templateId: number;
  exerciseName: string;
  sets?: string;
  reps?: string;
  notes?: string;
  sortOrder: number;
}) {
  const db = await getDb();

  await db.execute(
    `INSERT INTO workout_template_exercises
      (template_id, exercise_name, sort_order, sets, reps, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.templateId,
      input.exerciseName,
      input.sortOrder,
      input.sets ?? "",
      input.reps ?? "",
      input.notes ?? "",
    ]
  );
}

export async function deleteWorkoutTemplateExercise(id: number) {
  const db = await getDb();
  await db.execute(`DELETE FROM workout_template_exercises WHERE id = ?`, [id]);
}

export type FullWorkoutTemplate = {
  id: number;
  code: string;
  title: string;
  mode: "CHAOS" | "STEADY";
  duration: "MED" | "30" | "60" | "75";
  focus: string;
  exercises: Array<{
    id: number;
    exercise_name: string;
    sort_order: number;
    sets: string;
    reps: string;
    notes: string;
  }>;
};

export async function getWorkoutTemplateByCodeAndDuration(
  workoutCode: string,
  duration: "MED" | "30" | "60" | "75"
): Promise<FullWorkoutTemplate | null> {
  const db = await getDb();

  const templateRows = await db.select<
    Array<{
      id: number;
      code: string;
      title: string;
      mode: "CHAOS" | "STEADY";
      duration: "MED" | "30" | "60" | "75";
      focus: string;
    }>
  >(
    `SELECT id, code, title, mode, duration, focus
     FROM workout_templates
     WHERE code = ?
     LIMIT 1`,
    [`${workoutCode}-${duration}`]
  );

  const template = templateRows[0];
  if (!template) return null;

  const exerciseRows = await db.select<
    Array<{
      id: number;
      exercise_name: string;
      sort_order: number;
      sets: string;
      reps: string;
      notes: string;
    }>
  >(
    `SELECT id, exercise_name, sort_order, sets, reps, notes
     FROM workout_template_exercises
     WHERE template_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [template.id]
  );

  return {
    ...template,
    focus: template.focus ?? "",
    exercises: exerciseRows.map((row) => ({
      ...row,
      sets: row.sets ?? "",
      reps: row.reps ?? "",
      notes: row.notes ?? "",
    })),
  };
}

export async function getAccessoryCandidates(filters?: {
  category?: string;
  equipment?: string;
}): Promise<
  Array<{
    id: number;
    name: string;
    category: string;
    equipment?: string | null;
    accessory_priority?: number | null;
    last_used_at?: string | null;
  }>
> {
  const db = await getDb();

  let query = `
    SELECT
      e.id,
      e.name,
      e.category,
      e.equipment,
      e.accessory_priority,
      MAX(ws.started_at) as last_used_at
    FROM exercises e
    LEFT JOIN exercise_logs el ON el.exercise_name = e.name
    LEFT JOIN workout_sessions ws ON ws.id = el.session_id
    WHERE e.role_type = 'accessory'
  `;

  const params: string[] = [];

  if (filters?.category) {
    query += ` AND e.category = ?`;
    params.push(filters.category);
  }

  if (filters?.equipment) {
    query += ` AND e.equipment = ?`;
    params.push(filters.equipment);
  }

  query += `
    GROUP BY e.id, e.name, e.category, e.equipment, e.accessory_priority
  `;

  return db.select(query, params);
}