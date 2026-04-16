import { upsertImportedExercise } from "./db";

export type ExerciseCsvRow = {
  module_name: string;
  exercise_name: string;
  exercise_url: string;
};

export type ExerciseImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function normalizeAccessorySlot(moduleName: string): string {
  return moduleName
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map((value) => value.trim());
}

function parseCsv(text: string): ExerciseCsvRow[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) =>
    h.trim().replace(/^"|"$/g, "")
  );

  const moduleIndex = headers.indexOf("module_name");
  const nameIndex = headers.indexOf("exercise_name");
  const urlIndex = headers.indexOf("exercise_url");

  if (moduleIndex === -1 || nameIndex === -1 || urlIndex === -1) {
    throw new Error(
      'CSV must contain headers: "module_name","exercise_name","exercise_url".'
    );
  }

  const rows: ExerciseCsvRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);

    rows.push({
      module_name: (cols[moduleIndex] ?? "").replace(/^"|"$/g, "").trim(),
      exercise_name: (cols[nameIndex] ?? "").replace(/^"|"$/g, "").trim(),
      exercise_url: (cols[urlIndex] ?? "").replace(/^"|"$/g, "").trim(),
    });
  }

  return rows;
}

export async function importExercisesCsvText(
  csvText: string
): Promise<ExerciseImportResult> {
  const rows = parseCsv(csvText);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const moduleName = row.module_name.trim();
    const exerciseName = row.exercise_name.trim();
    const exerciseUrl = row.exercise_url.trim();

    if (!moduleName || !exerciseName) {
      skipped += 1;
      errors.push(`Skipped row with missing module_name or exercise_name.`);
      continue;
    }

    try {
      const result = await upsertImportedExercise({
        name: exerciseName,
        category: moduleName,
        primaryMuscles: moduleName,
        accessorySlot: normalizeAccessorySlot(moduleName),
        tutorialUrl: exerciseUrl,
      });

      if (result.action === "created") {
        created += 1;
      } else {
        updated += 1;
      }
    } catch (err) {
      skipped += 1;
      errors.push(
        `Failed to import "${exerciseName}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return {
    created,
    updated,
    skipped,
    errors,
  };
}