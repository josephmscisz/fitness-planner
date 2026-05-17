import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { ExerciseRecord } from "./db";

export type ExerciseCsvExportResult =
  | { status: "canceled" }
  | { status: "saved"; path: string; rows: number }
  | { status: "downloaded"; fileName: string; rows: number };

export type ExerciseCsvExportOptions = {
  customOnly?: boolean;
};

// Matches the seeded defaults in initDb.
const SEEDED_EXERCISE_NAMES = new Set([
  "Back Squat",
  "Bench Press",
  "Deadlift",
  "Overhead Press",
  "Pull-Up",
  "Barbell Row",
  "Bulgarian Split Squat",
  "Romanian Deadlift",
  "Lat Pulldown",
  "Leg Extension",
  "Triceps Pushdown",
  "Incline Press",
  "Face Pull",
  "Curl",
  "Front Squat",
  "Hamstring Curl",
  "Cable Fly",
  "Lateral Raise",
  "Calf Raise",
  "Rear Delt Raise",
  "Chest Supported Row",
  "Cable Row",
  "Overhead Cable Extension",
  "Single Arm Pushdown",
]);

const CSV_HEADERS = [
  "name",
  "category",
  "movement_pattern",
  "primary_muscles",
  "equipment",
  "notes",
  "role_type",
  "accessory_priority",
  "tutorial_url",
  "accessory_slot",
  "module_name",
  "exercise_name",
  "exercise_url",
] as const;

function escapeCsvValue(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n") || text.includes("\r")) {
    return `"${text.replace(/\"/g, '""')}"`;
  }
  return text;
}

function toCsvRow(values: unknown[]): string {
  return values.map((value) => escapeCsvValue(value)).join(",");
}

export function buildExercisesCsv(exercises: ExerciseRecord[]): string {
  const lines: string[] = [toCsvRow([...CSV_HEADERS])];

  for (const ex of exercises) {
    lines.push(
      toCsvRow([
        ex.name,
        ex.category,
        ex.movement_pattern ?? "",
        ex.primary_muscles ?? "",
        ex.equipment ?? "",
        ex.notes ?? "",
        ex.role_type ?? "",
        ex.accessory_priority ?? "",
        ex.tutorial_url ?? "",
        ex.accessory_slot ?? "",
        ex.category,
        ex.name,
        ex.tutorial_url ?? "",
      ])
    );
  }

  return lines.join("\r\n");
}

function getCustomExercises(exercises: ExerciseRecord[]): ExerciseRecord[] {
  return exercises.filter((ex) => !SEEDED_EXERCISE_NAMES.has(ex.name));
}

function makeDefaultFileName(customOnly: boolean) {
  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  return customOnly
    ? `fitness-exercises-custom-${iso}.csv`
    : `fitness-exercises-${iso}.csv`;
}

function triggerBrowserDownload(csvText: string, fileName: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

export async function exportExercisesCsv(
  exercises: ExerciseRecord[],
  options?: ExerciseCsvExportOptions
): Promise<ExerciseCsvExportResult> {
  const customOnly = options?.customOnly ?? false;
  const sourceRows = customOnly ? getCustomExercises(exercises) : exercises;
  const csvText = buildExercisesCsv(sourceRows);
  const defaultPath = makeDefaultFileName(customOnly);
  const rows = sourceRows.length;

  try {
    const targetPath = await save({
      defaultPath,
      filters: [
        {
          name: "CSV",
          extensions: ["csv"],
        },
      ],
    });

    if (!targetPath) {
      return { status: "canceled" };
    }

    await writeTextFile(targetPath, csvText);
    return { status: "saved", path: targetPath, rows };
  } catch {
    // Browser fallback for non-Tauri environments.
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      triggerBrowserDownload(csvText, defaultPath);
      return { status: "downloaded", fileName: defaultPath, rows };
    }

    throw new Error("CSV export is unavailable in this runtime.");
  }
}
