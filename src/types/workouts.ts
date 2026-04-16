export type WorkoutDuration = "MED" | "30" | "60" | "75";
export type WorkoutMode = "CHAOS" | "STEADY";

export type ResolvedTemplateExercise = {
  id: number;
  exercise_name: string;
  sort_order: number;
  sets: string;
  reps: string;
  notes: string;
  slot_type?: string;
  accessory_slot?: string;
  accessory_equipment?: string;
  tutorial_url?: string;
  was_rotated?: boolean;
  rotation_reason?: string;
};

export type ResolvedWorkoutTemplate = {
  id: number;
  code: string;
  title: string;
  mode: WorkoutMode;
  duration: WorkoutDuration;
  focus: string;
  exercises: ResolvedTemplateExercise[];
};