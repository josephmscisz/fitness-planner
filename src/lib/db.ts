import type { ResolvedWorkoutTemplate } from "../types/workouts";
import { chooseAccessoryCandidate } from "../planner/accessoryRotation";
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
      notes TEXT,
      slot_type TEXT,
      accessory_slot TEXT,
      accessory_equipment TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS whoop_daily_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_date TEXT NOT NULL UNIQUE,
      recovery_score INTEGER,
      sleep_performance INTEGER,
      sleep_duration_mins INTEGER,
      hrv REAL,
      resting_hr INTEGER,
      raw_json TEXT,
      synced_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS whoop_workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whoop_workout_id TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      sport_name TEXT,
      strain REAL,
      average_hr INTEGER,
      max_hr INTEGER,
      raw_json TEXT,
      synced_at TEXT NOT NULL
    )
  `);

  // Exercise table migrations
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
    await db.execute(`ALTER TABLE exercises ADD COLUMN accessory_slot TEXT`);
  } catch {}

  // Template exercise table migrations
  try {
    await db.execute(`ALTER TABLE workout_template_exercises ADD COLUMN slot_type TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_template_exercises ADD COLUMN accessory_slot TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_template_exercises ADD COLUMN accessory_equipment TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN selected_energy TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_recovery_score INTEGER`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_sleep_performance INTEGER`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_alignment_bucket TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN matched_whoop_workout_id TEXT`);
  } catch {}

  // Workout session snapshot fields
  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN selected_energy TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_recovery_score INTEGER`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_sleep_performance INTEGER`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_alignment_bucket TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN matched_whoop_workout_id TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN selected_energy TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_recovery_score INTEGER`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_sleep_performance INTEGER`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN whoop_alignment_bucket TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE workout_sessions ADD COLUMN matched_whoop_workout_id TEXT`);
  } catch {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS whoop_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_user_id TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      scope TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS whoop_daily_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_date TEXT NOT NULL UNIQUE,
      recovery_score INTEGER,
      sleep_performance INTEGER,
      sleep_duration_mins INTEGER,
      hrv REAL,
      resting_hr INTEGER,
      raw_json TEXT,
      synced_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS whoop_workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whoop_workout_id TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      sport_name TEXT,
      strain REAL,
      average_hr INTEGER,
      max_hr INTEGER,
      raw_json TEXT,
      synced_at TEXT NOT NULL
    )
  `);

  // WHOOP connection/token storage
  await db.execute(`
    CREATE TABLE IF NOT EXISTS whoop_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_user_id TEXT,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      scope TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // WHOOP daily readiness/sleep snapshot
  await db.execute(`
    CREATE TABLE IF NOT EXISTS whoop_daily_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_date TEXT NOT NULL UNIQUE,
      recovery_score INTEGER,
      sleep_performance INTEGER,
      sleep_duration_mins INTEGER,
      hrv REAL,
      resting_hr INTEGER,
      raw_json TEXT,
      synced_at TEXT NOT NULL
    )
  `);

  // WHOOP workouts
  await db.execute(`
    CREATE TABLE IF NOT EXISTS whoop_workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whoop_workout_id TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      sport_name TEXT,
      strain REAL,
      average_hr INTEGER,
      max_hr INTEGER,
      raw_json TEXT,
      synced_at TEXT NOT NULL
    )
  `);

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

    const templateExercises: Array<
      [string, string, number, string, string, string, string, string, string]
    > = [
      ["A-30", "Back Squat", 1, "5", "3", "", "fixed_foundation", "", ""],
      ["A-30", "Bench Press", 2, "5", "3", "", "fixed_foundation", "", ""],

      ["A-60", "Back Squat", 1, "4", "5", "", "fixed_foundation", "", ""],
      ["A-60", "Bench Press", 2, "4", "5", "", "fixed_foundation", "", ""],
      ["A-60", "", 3, "3", "8", "", "rotating_accessory", "upper_back", ""],
      ["A-60", "Triceps Pushdown", 4, "3", "12", "", "fixed_accessory", "triceps", "Cable"],

      ["B-30", "Deadlift", 1, "5", "3", "", "fixed_foundation", "", ""],
      ["B-30", "", 2, "5", "5", "", "rotating_accessory", "lats", ""],

      ["B-60", "Deadlift", 1, "4", "4", "", "fixed_foundation", "", ""],
      ["B-60", "", 2, "4", "6-8", "", "rotating_accessory", "lats", ""],
      ["B-60", "Overhead Press", 3, "3", "6", "", "fixed_foundation", "", ""],
      ["B-60", "", 4, "3", "8", "", "rotating_accessory", "upper_back", ""],

      ["LOWER1-30", "Back Squat", 1, "5", "3", "", "fixed_foundation", "", ""],
      ["LOWER1-30", "", 2, "3", "10", "", "rotating_accessory", "quads_iso", ""],

      ["LOWER1-60", "Back Squat", 1, "4", "5", "", "fixed_foundation", "", ""],
      ["LOWER1-60", "Romanian Deadlift", 2, "3", "8", "", "fixed_foundation", "", ""],
      ["LOWER1-60", "", 3, "3", "12", "", "rotating_accessory", "quads_iso", ""],

      ["PUSH-30", "Bench Press", 1, "5", "3", "", "fixed_foundation", "", ""],
      ["PUSH-30", "Overhead Press", 2, "3", "6", "", "fixed_foundation", "", ""],

      ["PUSH-60", "Bench Press", 1, "4", "5", "", "fixed_foundation", "", ""],
      ["PUSH-60", "Overhead Press", 2, "3", "6-8", "", "fixed_foundation", "", ""],
      ["PUSH-60", "", 3, "3", "8", "", "rotating_accessory", "chest_accessory", ""],
      ["PUSH-60", "", 4, "3", "12", "", "rotating_accessory", "triceps", ""],
    ];

    for (const [
      code,
      exerciseName,
      sortOrder,
      sets,
      reps,
      notes,
      slotType,
      accessorySlot,
      accessoryEquipment,
    ] of templateExercises) {
      const templateId = templateMap[code];
      if (!templateId) continue;

      await db.execute(
        `INSERT INTO workout_template_exercises
          (template_id, exercise_name, sort_order, sets, reps, notes, slot_type, accessory_slot, accessory_equipment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateId,
          exerciseName,
          sortOrder,
          sets,
          reps,
          notes,
          slotType,
          accessorySlot,
          accessoryEquipment,
        ]
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
      ["Face Pull", "Upper", "Isolation", "Rear Delts/Upper Back", "Cable", ""],
      ["Curl", "Upper", "Isolation", "Biceps", "Dumbbell/Cable", ""],
      ["Front Squat", "Lower", "Squat", "Quads/Core", "Barbell", ""],
      ["Hamstring Curl", "Lower", "Isolation", "Hamstrings", "Machine", ""],
      ["Cable Fly", "Upper", "Isolation", "Chest", "Cable", ""],
      ["Lateral Raise", "Upper", "Isolation", "Shoulders", "Dumbbell/Cable", ""],
      ["Calf Raise", "Lower", "Isolation", "Calves", "Machine/Bodyweight", ""],
      ["Rear Delt Raise", "Upper", "Isolation", "Rear Delts", "Dumbbell", ""],
      ["Chest Supported Row", "Upper", "Horizontal Pull", "Upper Back", "Machine", ""],
      ["Cable Row", "Upper", "Horizontal Pull", "Upper Back", "Cable", ""],
      ["Overhead Cable Extension", "Upper", "Isolation", "Triceps", "Cable", ""],
      ["Single Arm Pushdown", "Upper", "Isolation", "Triceps", "Cable", ""],
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
  role_type?: string | null;
  accessory_priority?: number | null;
  tutorial_url?: string | null;
  accessory_slot?: string | null;
};

export async function getExercises(): Promise<Exercise[]> {
  const db = await getDb();

  return db.select<Exercise[]>(
    `SELECT
      id,
      name,
      category,
      movement_pattern,
      primary_muscles,
      equipment,
      notes,
      role_type,
      accessory_priority,
      tutorial_url,
      accessory_slot
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
  selectedEnergy?: string;
  whoopRecoveryScore?: number | null;
  whoopSleepPerformance?: number | null;
  whoopAlignmentBucket?: string | null;
  matchedWhoopWorkoutId?: string | null;
};

export async function createWorkoutSession(input: CreateSessionInput): Promise<number> {
  const db = await getDb();

  await db.execute(
    `INSERT INTO workout_sessions
      (
        started_at,
        mode,
        workout_code,
        duration,
        title,
        reason,
        selected_energy,
        whoop_recovery_score,
        whoop_sleep_performance,
        whoop_alignment_bucket,
        matched_whoop_workout_id
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      input.mode,
      input.workoutCode,
      input.duration,
      input.title,
      input.reason,
      input.selectedEnergy ?? "",
      input.whoopRecoveryScore ?? null,
      input.whoopSleepPerformance ?? null,
      input.whoopAlignmentBucket ?? "",
      input.matchedWhoopWorkoutId ?? null,
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
  selected_energy?: string | null;
  whoop_recovery_score?: number | null;
  whoop_sleep_performance?: number | null;
  whoop_alignment_bucket?: string | null;
  matched_whoop_workout_id?: string | null;
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
  accessory_slot?: string | null;
};

export async function createExercise(input: {
  name: string;
  category: string;
  movementPattern?: string;
  primaryMuscles?: string;
  equipment?: string;
  notes?: string;
  roleType?: string;
  accessoryPriority?: number;
  tutorialUrl?: string;
  accessorySlot?: string;
}) {
  const db = await getDb();

  await db.execute(
    `INSERT INTO exercises
      (name, category, movement_pattern, primary_muscles, equipment, notes, role_type, accessory_priority, tutorial_url, accessory_slot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.category,
      input.movementPattern ?? "",
      input.primaryMuscles ?? "",
      input.equipment ?? "",
      input.notes ?? "",
      input.roleType ?? "",
      input.accessoryPriority ?? 5,
      input.tutorialUrl ?? "",
      input.accessorySlot ?? "",
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
  roleType?: string;
  accessoryPriority?: number;
  tutorialUrl?: string;
  accessorySlot?: string;
}) {
  const db = await getDb();

  await db.execute(
    `UPDATE exercises
     SET name = ?, category = ?, movement_pattern = ?, primary_muscles = ?, equipment = ?, notes = ?, role_type = ?, accessory_priority = ?, tutorial_url = ?, accessory_slot = ?
     WHERE id = ?`,
    [
      input.name,
      input.category,
      input.movementPattern ?? "",
      input.primaryMuscles ?? "",
      input.equipment ?? "",
      input.notes ?? "",
      input.roleType ?? "",
      input.accessoryPriority ?? 5,
      input.tutorialUrl ?? "",
      input.accessorySlot ?? "",
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
    SELECT
      id,
      name,
      category,
      movement_pattern,
      primary_muscles,
      equipment,
      notes,
      role_type,
      accessory_priority,
      tutorial_url,
      accessory_slot
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
  slot_type?: string | null;
  accessory_slot?: string | null;
  accessory_equipment?: string | null;
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
    `SELECT
        id,
        template_id,
        exercise_name,
        sort_order,
        sets,
        reps,
        notes,
        slot_type,
        accessory_slot,
        accessory_equipment
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
  slotType?: string;
  accessorySlot?: string;
  accessoryEquipment?: string;
}) {
  const db = await getDb();

  await db.execute(
    `UPDATE workout_template_exercises
     SET exercise_name = ?, sets = ?, reps = ?, notes = ?, sort_order = ?, slot_type = ?, accessory_slot = ?, accessory_equipment = ?
     WHERE id = ?`,
    [
      input.exerciseName,
      input.sets ?? "",
      input.reps ?? "",
      input.notes ?? "",
      input.sortOrder,
      input.slotType ?? "",
      input.accessorySlot ?? "",
      input.accessoryEquipment ?? "",
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
  slotType?: string;
  accessorySlot?: string;
  accessoryEquipment?: string;
}) {
  const db = await getDb();

  await db.execute(
    `INSERT INTO workout_template_exercises
      (template_id, exercise_name, sort_order, sets, reps, notes, slot_type, accessory_slot, accessory_equipment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.templateId,
      input.exerciseName,
      input.sortOrder,
      input.sets ?? "",
      input.reps ?? "",
      input.notes ?? "",
      input.slotType ?? "",
      input.accessorySlot ?? "",
      input.accessoryEquipment ?? "",
    ]
  );
}

export async function deleteWorkoutTemplateExercise(id: number) {
  const db = await getDb();
  await db.execute(`DELETE FROM workout_template_exercises WHERE id = ?`, [id]);
}

export type AccessoryCandidate = {
  id: number;
  name: string;
  category: string;
  equipment?: string | null;
  accessory_priority?: number | null;
  accessory_slot?: string | null;
  tutorial_url?: string | null;
  last_used_at?: string | null;
};

export async function getAccessoryCandidates(filters: {
  accessorySlot: string;
  equipment?: string;
}): Promise<AccessoryCandidate[]> {
  const db = await getDb();

  let query = `
    SELECT
      e.id,
      e.name,
      e.category,
      e.equipment,
      e.accessory_priority,
      e.accessory_slot,
      e.tutorial_url,
      MAX(ws.started_at) as last_used_at
    FROM exercises e
    LEFT JOIN exercise_logs el ON el.exercise_name = e.name
    LEFT JOIN workout_sessions ws ON ws.id = el.session_id
    WHERE e.role_type = 'accessory'
      AND e.accessory_slot = ?
  `;

  const params: string[] = [filters.accessorySlot];

  if (filters.equipment) {
    query += ` AND e.equipment = ?`;
    params.push(filters.equipment);
  }

  query += `
    GROUP BY
      e.id,
      e.name,
      e.category,
      e.equipment,
      e.accessory_priority,
      e.accessory_slot,
      e.tutorial_url
    ORDER BY e.name ASC
  `;

  return db.select<AccessoryCandidate[]>(query, params);
}

export async function getRecentlyUsedAccessoryNamesBySlot(
  accessorySlot: string,
  limit: number = 2
): Promise<string[]> {
  const db = await getDb();

  const rows = await db.select<{ exercise_name: string }[]>(
    `
    SELECT DISTINCT el.exercise_name
    FROM exercise_logs el
    INNER JOIN workout_sessions ws ON ws.id = el.session_id
    INNER JOIN exercises e ON e.name = el.exercise_name
    WHERE e.role_type = 'accessory'
      AND e.accessory_slot = ?
    ORDER BY ws.started_at DESC
    LIMIT ?
    `,
    [accessorySlot, limit]
  );

  return rows.map((row) => row.exercise_name);
}

export async function getWorkoutTemplateByCodeAndDuration(
  workoutCode: string,
  duration: "MED" | "30" | "60" | "75"
): Promise<ResolvedWorkoutTemplate | null> {
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
      slot_type?: string | null;
      accessory_slot?: string | null;
      accessory_equipment?: string | null;
    }>
  >(
    `SELECT
        id,
        exercise_name,
        sort_order,
        sets,
        reps,
        notes,
        slot_type,
        accessory_slot,
        accessory_equipment
     FROM workout_template_exercises
     WHERE template_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [template.id]
  );

  const resolvedExercises: ResolvedWorkoutTemplate["exercises"] = [];
  const alreadyChosenNames: string[] = [];

  for (const row of exerciseRows) {
    const slotType = row.slot_type ?? "";
    const accessorySlot = row.accessory_slot ?? "";
    const accessoryEquipment = row.accessory_equipment ?? "";

    if (slotType === "rotating_accessory" && accessorySlot) {
      const candidates = await getAccessoryCandidates({
        accessorySlot,
        equipment: accessoryEquipment || undefined,
      });

      const recentlyUsedNames = await getRecentlyUsedAccessoryNamesBySlot(
        accessorySlot,
        2
      );

      const { candidate, reason } = chooseAccessoryCandidate(
        candidates,
        [...alreadyChosenNames, ...recentlyUsedNames]
      );

      if (candidate) {
        alreadyChosenNames.push(candidate.name);

        resolvedExercises.push({
          id: row.id,
          exercise_name: candidate.name,
          sort_order: row.sort_order,
          sets: row.sets ?? "",
          reps: row.reps ?? "",
          notes: row.notes ?? "",
          slot_type: slotType,
          accessory_slot: accessorySlot,
          accessory_equipment: accessoryEquipment,
          tutorial_url: candidate.tutorial_url ?? "",
          was_rotated: true,
          rotation_reason: reason,
        });

        continue;
      }
    }

    if (row.exercise_name) {
      alreadyChosenNames.push(row.exercise_name);
    }

    resolvedExercises.push({
      id: row.id,
      exercise_name: row.exercise_name ?? "",
      sort_order: row.sort_order,
      sets: row.sets ?? "",
      reps: row.reps ?? "",
      notes: row.notes ?? "",
      slot_type: slotType,
      accessory_slot: accessorySlot,
      accessory_equipment: accessoryEquipment,
      tutorial_url: "",
      was_rotated: false,
      rotation_reason: "",
    });
  }

  return {
    ...template,
    focus: template.focus ?? "",
    exercises: resolvedExercises,
  };
}

export async function getSessionsLast7DaysCount(): Promise<number> {
  const db = await getDb();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count
     FROM workout_sessions
     WHERE started_at >= ?`,
    [sevenDaysAgo.toISOString()]
  );

  return rows[0]?.count ?? 0;
}

export async function getMostRecentWorkoutCode(): Promise<string> {
  const db = await getDb();

  const rows = await db.select<{ workout_code: string }[]>(
    `SELECT workout_code
     FROM workout_sessions
     ORDER BY started_at DESC
     LIMIT 1`
  );

  return rows[0]?.workout_code ?? "";
}

export async function updateExerciseLog(input: {
  id: number;
  weight?: string;
  actualSets?: string;
  actualReps?: string;
  notes?: string;
}) {
  const db = await getDb();

  await db.execute(
    `UPDATE exercise_logs
     SET weight = ?, actual_sets = ?, actual_reps = ?, notes = ?
     WHERE id = ?`,
    [
      input.weight ?? "",
      input.actualSets ?? "",
      input.actualReps ?? "",
      input.notes ?? "",
      input.id,
    ]
  );
}

export async function deleteExerciseLog(id: number) {
  const db = await getDb();

  await db.execute(`DELETE FROM exercise_logs WHERE id = ?`, [id]);
}

export async function deleteWorkoutSession(sessionId: number) {
  const db = await getDb();

  await db.execute(`DELETE FROM exercise_logs WHERE session_id = ?`, [sessionId]);
  await db.execute(`DELETE FROM workout_sessions WHERE id = ?`, [sessionId]);
}

export async function getExerciseByName(
  name: string
): Promise<ExerciseRecord | null> {
  const db = await getDb();

  const rows = await db.select<ExerciseRecord[]>(
    `SELECT
      id,
      name,
      category,
      movement_pattern,
      primary_muscles,
      equipment,
      notes,
      role_type,
      accessory_priority,
      tutorial_url,
      accessory_slot
     FROM exercises
     WHERE LOWER(name) = LOWER(?)
     LIMIT 1`,
    [name]
  );

  return rows[0] ?? null;
}

export async function upsertImportedExercise(input: {
  name: string;
  category: string;
  primaryMuscles: string;
  accessorySlot: string;
  tutorialUrl: string;
}) {
  const existing = await getExerciseByName(input.name);

  if (existing) {
    await updateExercise({
      id: existing.id,
      name: input.name,
      category: input.category,
      movementPattern: existing.movement_pattern ?? "",
      primaryMuscles: input.primaryMuscles,
      equipment: existing.equipment ?? "",
      notes: existing.notes ?? "",
      roleType: existing.role_type ?? "accessory",
      accessoryPriority: existing.accessory_priority ?? 5,
      tutorialUrl: input.tutorialUrl,
      accessorySlot: input.accessorySlot,
    });

    return { action: "updated" as const, id: existing.id };
  }

  await createExercise({
    name: input.name,
    category: input.category,
    movementPattern: "",
    primaryMuscles: input.primaryMuscles,
    equipment: "",
    notes: "",
    roleType: "accessory",
    accessoryPriority: 5,
    tutorialUrl: input.tutorialUrl,
    accessorySlot: input.accessorySlot,
  });

  return { action: "created" as const };
}

export type WhoopDailyMetric = {
  id: number;
  metric_date: string;
  recovery_score?: number | null;
  sleep_performance?: number | null;
  sleep_duration_mins?: number | null;
  hrv?: number | null;
  resting_hr?: number | null;
  raw_json?: string | null;
  synced_at: string;
};

export type WhoopWorkout = {
  id: number;
  whoop_workout_id: string;
  start_time: string;
  end_time?: string | null;
  sport_name?: string | null;
  strain?: number | null;
  average_hr?: number | null;
  max_hr?: number | null;
  raw_json?: string | null;
  synced_at: string;
};

export async function upsertWhoopDailyMetric(input: {
  metricDate: string;
  recoveryScore?: number | null;
  sleepPerformance?: number | null;
  sleepDurationMins?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  rawJson?: string;
}) {
  const db = await getDb();

  await db.execute(
    `INSERT INTO whoop_daily_metrics
      (metric_date, recovery_score, sleep_performance, sleep_duration_mins, hrv, resting_hr, raw_json, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(metric_date) DO UPDATE SET
       recovery_score = excluded.recovery_score,
       sleep_performance = excluded.sleep_performance,
       sleep_duration_mins = excluded.sleep_duration_mins,
       hrv = excluded.hrv,
       resting_hr = excluded.resting_hr,
       raw_json = excluded.raw_json,
       synced_at = excluded.synced_at`,
    [
      input.metricDate,
      input.recoveryScore ?? null,
      input.sleepPerformance ?? null,
      input.sleepDurationMins ?? null,
      input.hrv ?? null,
      input.restingHr ?? null,
      input.rawJson ?? "",
      new Date().toISOString(),
    ]
  );
}

export async function upsertWhoopWorkout(input: {
  whoopWorkoutId: string;
  startTime: string;
  endTime?: string | null;
  sportName?: string | null;
  strain?: number | null;
  averageHr?: number | null;
  maxHr?: number | null;
  rawJson?: string;
}) {
  const db = await getDb();

  await db.execute(
    `INSERT INTO whoop_workouts
      (whoop_workout_id, start_time, end_time, sport_name, strain, average_hr, max_hr, raw_json, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(whoop_workout_id) DO UPDATE SET
       start_time = excluded.start_time,
       end_time = excluded.end_time,
       sport_name = excluded.sport_name,
       strain = excluded.strain,
       average_hr = excluded.average_hr,
       max_hr = excluded.max_hr,
       raw_json = excluded.raw_json,
       synced_at = excluded.synced_at`,
    [
      input.whoopWorkoutId,
      input.startTime,
      input.endTime ?? null,
      input.sportName ?? null,
      input.strain ?? null,
      input.averageHr ?? null,
      input.maxHr ?? null,
      input.rawJson ?? "",
      new Date().toISOString(),
    ]
  );
}

export async function getLatestWhoopDailyMetric(): Promise<WhoopDailyMetric | null> {
  const db = await getDb();

  const rows = await db.select<WhoopDailyMetric[]>(
    `SELECT *
     FROM whoop_daily_metrics
     ORDER BY metric_date DESC
     LIMIT 1`
  );

  return rows[0] ?? null;
}

export async function getRecentWhoopWorkouts(limit: number = 10): Promise<WhoopWorkout[]> {
  const db = await getDb();

  return db.select<WhoopWorkout[]>(
    `SELECT *
     FROM whoop_workouts
     ORDER BY start_time DESC
     LIMIT ?`,
    [limit]
  );
}

export type WhoopConnection = {
  id: number;
  provider_user_id?: string | null;
  access_token: string;
  refresh_token?: string | null;
  scope?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
};

export async function saveWhoopConnection(input: {
  providerUserId?: string;
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  expiresAt?: string;
}) {
  const db = await getDb();

  const existing = await db.select<{ id: number }[]>(
    `SELECT id FROM whoop_connections ORDER BY id DESC LIMIT 1`
  );

  const now = new Date().toISOString();

  if (existing[0]?.id) {
    await db.execute(
      `UPDATE whoop_connections
       SET provider_user_id = ?, access_token = ?, refresh_token = ?, scope = ?, expires_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        input.providerUserId ?? null,
        input.accessToken,
        input.refreshToken ?? null,
        input.scope ?? null,
        input.expiresAt ?? null,
        now,
        existing[0].id,
      ]
    );
    return existing[0].id;
  }

  await db.execute(
    `INSERT INTO whoop_connections
      (provider_user_id, access_token, refresh_token, scope, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.providerUserId ?? null,
      input.accessToken,
      input.refreshToken ?? null,
      input.scope ?? null,
      input.expiresAt ?? null,
      now,
      now,
    ]
  );

  const rows = await db.select<{ id: number }[]>(
    `SELECT id FROM whoop_connections ORDER BY id DESC LIMIT 1`
  );

  return rows[0]?.id ?? null;
}

export async function getWhoopConnection(): Promise<WhoopConnection | null> {
  const db = await getDb();

  const rows = await db.select<WhoopConnection[]>(
    `SELECT *
     FROM whoop_connections
     ORDER BY id DESC
     LIMIT 1`
  );

  return rows[0] ?? null;
}

function recoveryToBucket(recoveryScore?: number | null): "low" | "medium" | "high" | null {
  if (recoveryScore == null) return null;
  if (recoveryScore < 34) return "low";
  if (recoveryScore < 67) return "medium";
  return "high";
}

export async function computeWhoopAlignment30d(): Promise<{
  percent: number | null;
  matchedDays: number;
  totalDays: number;
  latestBucket: "low" | "medium" | "high" | null;
}> {
  const db = await getDb();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db.select<
    Array<{
      selected_energy?: string | null;
      whoop_recovery_score?: number | null;
    }>
  >(
    `SELECT selected_energy, whoop_recovery_score
     FROM workout_sessions
     WHERE started_at >= ?
       AND selected_energy IS NOT NULL
       AND selected_energy != ''
       AND whoop_recovery_score IS NOT NULL`,
    [thirtyDaysAgo.toISOString()]
  );

  let matchedDays = 0;
  let totalDays = 0;

  for (const row of rows) {
    const energy = (row.selected_energy ?? "").toLowerCase();
    const bucket = recoveryToBucket(row.whoop_recovery_score);

    if (!bucket) continue;
    if (!["low", "medium", "high"].includes(energy)) continue;

    totalDays += 1;
    if (energy === bucket) {
      matchedDays += 1;
    }
  }

  const latest = await getLatestWhoopDailyMetric();
  const latestBucket = recoveryToBucket(latest?.recovery_score ?? null);

  return {
    percent: totalDays > 0 ? Math.round((matchedDays / totalDays) * 100) : null,
    matchedDays,
    totalDays,
    latestBucket,
  };
}

export async function matchWhoopWorkoutToSession(
  sessionStartedAt: string,
  windowHours: number = 6
): Promise<string | null> {
  const workouts = await getRecentWhoopWorkouts(100);

  const sessionTs = new Date(sessionStartedAt).getTime();
  const sessionDate = new Date(sessionStartedAt).toISOString().slice(0, 10);
  const maxDiffMs = windowHours * 60 * 60 * 1000;

  let bestId: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const workout of workouts) {
    const workoutTs = new Date(workout.start_time).getTime();
    const diffMs = Math.abs(sessionTs - workoutTs);

    if (diffMs > maxDiffMs) continue;

    const workoutDate = new Date(workout.start_time).toISOString().slice(0, 10);

    let score = 0;

    // closer in time is better
    score += Math.max(0, 100 - diffMs / (1000 * 60 * 10)); // lose 1 point per 10 min

    // same calendar day bonus
    if (workoutDate === sessionDate) {
      score += 25;
    }

    // slight preference for actual workout-like records
    if (workout.sport_name && String(workout.sport_name).trim().length > 0) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = workout.whoop_workout_id;
    }
  }

  return bestId;
}

export async function getWhoopWorkoutById(
  whoopWorkoutId: string
): Promise<WhoopWorkout | null> {
  const db = await getDb();

  const rows = await db.select<WhoopWorkout[]>(
    `SELECT *
     FROM whoop_workouts
     WHERE whoop_workout_id = ?
     LIMIT 1`,
    [whoopWorkoutId]
  );

  return rows[0] ?? null;
}

export async function getLastWhoopSyncTime(): Promise<string | null> {
  const db = await getDb();

  const metricRows = await db.select<{ synced_at: string }[]>(
    `SELECT synced_at
     FROM whoop_daily_metrics
     ORDER BY synced_at DESC
     LIMIT 1`
  );

  const workoutRows = await db.select<{ synced_at: string }[]>(
    `SELECT synced_at
     FROM whoop_workouts
     ORDER BY synced_at DESC
     LIMIT 1`
  );

  const times = [
    metricRows[0]?.synced_at,
    workoutRows[0]?.synced_at,
  ].filter(Boolean) as string[];

  if (times.length === 0) return null;

  return times.sort().reverse()[0];
}