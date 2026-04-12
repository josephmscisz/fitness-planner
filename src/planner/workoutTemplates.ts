export type WorkoutExercise = {
  name: string;
  sets: string;
  reps: string;
  notes?: string;
};

export type WorkoutTemplate = {
  code: string;
  title: string;
  mode: "CHAOS" | "STEADY";
  duration: "MED" | "30" | "60" | "75";
  focus: string;
  exercises: WorkoutExercise[];
};

export const workoutTemplates: WorkoutTemplate[] = [
  // CHAOS MODE
  {
    code: "A-MED",
    title: "Chaos A - Minimum Effective Dose",
    mode: "CHAOS",
    duration: "MED",
    focus: "Squat + Push anchor",
    exercises: [
      { name: "Back Squat", sets: "5", reps: "3-5", notes: "Heavy but smooth" },
    ],
  },
  {
    code: "A-30",
    title: "Chaos A - 30 Minutes",
    mode: "CHAOS",
    duration: "30",
    focus: "Squat + Push anchor",
    exercises: [
      { name: "Back Squat", sets: "5", reps: "3" },
      { name: "Bench Press", sets: "5", reps: "3" },
    ],
  },
  {
    code: "A-60",
    title: "Chaos A - 60 Minutes",
    mode: "CHAOS",
    duration: "60",
    focus: "Squat + Push balanced",
    exercises: [
      { name: "Back Squat", sets: "4", reps: "5" },
      { name: "Bench Press", sets: "4", reps: "5" },
      { name: "Pull-Up", sets: "3", reps: "8" },
      { name: "Triceps Pushdown", sets: "3", reps: "12" },
    ],
  },
  {
    code: "A-75",
    title: "Chaos A - 75 Minutes",
    mode: "CHAOS",
    duration: "75",
    focus: "Squat + Push expanded",
    exercises: [
      { name: "Back Squat", sets: "4", reps: "5" },
      { name: "Bench Press", sets: "4", reps: "6" },
      { name: "Incline Press", sets: "3", reps: "8" },
      { name: "Lat Pulldown", sets: "3", reps: "10" },
      { name: "Triceps Pushdown", sets: "3", reps: "12-15" },
    ],
  },

  {
    code: "B-MED",
    title: "Chaos B - Minimum Effective Dose",
    mode: "CHAOS",
    duration: "MED",
    focus: "Hinge + Pull anchor",
    exercises: [
      { name: "Deadlift", sets: "5", reps: "3-5", notes: "Heavy but crisp" },
    ],
  },
  {
    code: "B-30",
    title: "Chaos B - 30 Minutes",
    mode: "CHAOS",
    duration: "30",
    focus: "Hinge + Pull anchor",
    exercises: [
      { name: "Deadlift", sets: "5", reps: "3" },
      { name: "Pull-Up", sets: "5", reps: "5" },
    ],
  },
  {
    code: "B-60",
    title: "Chaos B - 60 Minutes",
    mode: "CHAOS",
    duration: "60",
    focus: "Hinge + Pull balanced",
    exercises: [
      { name: "Deadlift", sets: "4", reps: "4" },
      { name: "Pull-Up", sets: "4", reps: "6-8" },
      { name: "Overhead Press", sets: "3", reps: "6" },
      { name: "Barbell Row", sets: "3", reps: "8" },
    ],
  },
  {
    code: "B-75",
    title: "Chaos B - 75 Minutes",
    mode: "CHAOS",
    duration: "75",
    focus: "Hinge + Pull expanded",
    exercises: [
      { name: "Deadlift", sets: "4", reps: "4" },
      { name: "Pull-Up", sets: "4", reps: "6-8" },
      { name: "Overhead Press", sets: "4", reps: "6" },
      { name: "Barbell Row", sets: "3", reps: "10" },
      { name: "Face Pull", sets: "3", reps: "15" },
      { name: "Curl", sets: "3", reps: "12" },
    ],
  },

  {
    code: "C-MED",
    title: "Chaos C - Minimum Effective Dose",
    mode: "CHAOS",
    duration: "MED",
    focus: "Single-leg + press anchor",
    exercises: [
      { name: "Overhead Press", sets: "5", reps: "3-5", notes: "Strong clean reps" },
    ],
  },
  {
    code: "C-30",
    title: "Chaos C - 30 Minutes",
    mode: "CHAOS",
    duration: "30",
    focus: "Single-leg + press anchor",
    exercises: [
      { name: "Bulgarian Split Squat", sets: "4", reps: "5/leg" },
      { name: "Overhead Press", sets: "5", reps: "3" },
    ],
  },
  {
    code: "C-60",
    title: "Chaos C - 60 Minutes",
    mode: "CHAOS",
    duration: "60",
    focus: "Single-leg + upper balanced",
    exercises: [
      { name: "Bulgarian Split Squat", sets: "3", reps: "8/leg" },
      { name: "Overhead Press", sets: "4", reps: "5" },
      { name: "Incline Press", sets: "3", reps: "8" },
      { name: "Barbell Row", sets: "3", reps: "10" },
    ],
  },
  {
    code: "C-75",
    title: "Chaos C - 75 Minutes",
    mode: "CHAOS",
    duration: "75",
    focus: "Single-leg + upper expanded",
    exercises: [
      { name: "Bulgarian Split Squat", sets: "3", reps: "8/leg" },
      { name: "Overhead Press", sets: "4", reps: "6" },
      { name: "Incline Press", sets: "4", reps: "8" },
      { name: "Barbell Row", sets: "3", reps: "10" },
      { name: "Leg Extension", sets: "3", reps: "12-15" },
      { name: "Lateral Raise", sets: "3", reps: "15" },
    ],
  },

  // STEADY MODE
  {
    code: "LOWER1-MED",
    title: "Steady Lower 1 - Minimum Effective Dose",
    mode: "STEADY",
    duration: "MED",
    focus: "Squat focus",
    exercises: [
      { name: "Back Squat", sets: "5", reps: "3-5" },
    ],
  },
  {
    code: "LOWER1-30",
    title: "Steady Lower 1 - 30 Minutes",
    mode: "STEADY",
    duration: "30",
    focus: "Squat focus",
    exercises: [
      { name: "Back Squat", sets: "5", reps: "3" },
      { name: "Leg Extension", sets: "3", reps: "10" },
    ],
  },
  {
    code: "LOWER1-60",
    title: "Steady Lower 1 - 60 Minutes",
    mode: "STEADY",
    duration: "60",
    focus: "Squat focus",
    exercises: [
      { name: "Back Squat", sets: "4", reps: "5" },
      { name: "Romanian Deadlift", sets: "3", reps: "8" },
      { name: "Leg Extension", sets: "3", reps: "12" },
    ],
  },
  {
    code: "LOWER1-75",
    title: "Steady Lower 1 - 75 Minutes",
    mode: "STEADY",
    duration: "75",
    focus: "Squat expanded",
    exercises: [
      { name: "Back Squat", sets: "4", reps: "5" },
      { name: "Romanian Deadlift", sets: "4", reps: "8" },
      { name: "Leg Extension", sets: "3", reps: "12" },
      { name: "Calf Raise", sets: "3", reps: "12-15" },
    ],
  },

  {
    code: "PUSH-MED",
    title: "Steady Push - Minimum Effective Dose",
    mode: "STEADY",
    duration: "MED",
    focus: "Upper push focus",
    exercises: [
      { name: "Bench Press", sets: "5", reps: "3-5" },
    ],
  },
  {
    code: "PUSH-30",
    title: "Steady Push - 30 Minutes",
    mode: "STEADY",
    duration: "30",
    focus: "Upper push focus",
    exercises: [
      { name: "Bench Press", sets: "5", reps: "3" },
      { name: "Overhead Press", sets: "3", reps: "6" },
    ],
  },
  {
    code: "PUSH-60",
    title: "Steady Push - 60 Minutes",
    mode: "STEADY",
    duration: "60",
    focus: "Upper push balanced",
    exercises: [
      { name: "Bench Press", sets: "4", reps: "5" },
      { name: "Overhead Press", sets: "3", reps: "6-8" },
      { name: "Incline Press", sets: "3", reps: "8" },
      { name: "Triceps Pushdown", sets: "3", reps: "12" },
    ],
  },
  {
    code: "PUSH-75",
    title: "Steady Push - 75 Minutes",
    mode: "STEADY",
    duration: "75",
    focus: "Upper push expanded",
    exercises: [
      { name: "Bench Press", sets: "4", reps: "5" },
      { name: "Overhead Press", sets: "4", reps: "6" },
      { name: "Incline Press", sets: "4", reps: "8" },
      { name: "Cable Fly", sets: "3", reps: "12" },
      { name: "Lateral Raise", sets: "3", reps: "15" },
    ],
  },

  {
    code: "LOWER2-MED",
    title: "Steady Lower 2 - Minimum Effective Dose",
    mode: "STEADY",
    duration: "MED",
    focus: "Hinge focus",
    exercises: [
      { name: "Deadlift", sets: "5", reps: "3-5" },
    ],
  },
  {
    code: "LOWER2-30",
    title: "Steady Lower 2 - 30 Minutes",
    mode: "STEADY",
    duration: "30",
    focus: "Hinge focus",
    exercises: [
      { name: "Deadlift", sets: "5", reps: "3" },
      { name: "Hamstring Curl", sets: "3", reps: "10" },
    ],
  },
  {
    code: "LOWER2-60",
    title: "Steady Lower 2 - 60 Minutes",
    mode: "STEADY",
    duration: "60",
    focus: "Hinge balanced",
    exercises: [
      { name: "Deadlift", sets: "4", reps: "4" },
      { name: "Front Squat", sets: "3", reps: "6" },
      { name: "Hamstring Curl", sets: "3", reps: "12" },
    ],
  },
  {
    code: "LOWER2-75",
    title: "Steady Lower 2 - 75 Minutes",
    mode: "STEADY",
    duration: "75",
    focus: "Hinge expanded",
    exercises: [
      { name: "Deadlift", sets: "4", reps: "4" },
      { name: "Front Squat", sets: "4", reps: "6" },
      { name: "Hamstring Curl", sets: "3", reps: "12" },
      { name: "Leg Extension", sets: "3", reps: "12" },
    ],
  },

  {
    code: "PULL-MED",
    title: "Steady Pull - Minimum Effective Dose",
    mode: "STEADY",
    duration: "MED",
    focus: "Upper pull focus",
    exercises: [
      { name: "Pull-Up", sets: "5", reps: "5" },
    ],
  },
  {
    code: "PULL-30",
    title: "Steady Pull - 30 Minutes",
    mode: "STEADY",
    duration: "30",
    focus: "Upper pull focus",
    exercises: [
      { name: "Pull-Up", sets: "5", reps: "5" },
      { name: "Barbell Row", sets: "3", reps: "8" },
    ],
  },
  {
    code: "PULL-60",
    title: "Steady Pull - 60 Minutes",
    mode: "STEADY",
    duration: "60",
    focus: "Upper pull balanced",
    exercises: [
      { name: "Pull-Up", sets: "4", reps: "6-8" },
      { name: "Barbell Row", sets: "4", reps: "8" },
      { name: "Face Pull", sets: "3", reps: "12-15" },
      { name: "Curl", sets: "3", reps: "10-12" },
    ],
  },
  {
    code: "PULL-75",
    title: "Steady Pull - 75 Minutes",
    mode: "STEADY",
    duration: "75",
    focus: "Upper pull expanded",
    exercises: [
      { name: "Pull-Up", sets: "4", reps: "6-8" },
      { name: "Barbell Row", sets: "4", reps: "8" },
      { name: "Face Pull", sets: "3", reps: "15" },
      { name: "Rear Delt Raise", sets: "3", reps: "15" },
      { name: "Curl", sets: "3", reps: "12" },
    ],
  },
];

export function getWorkoutTemplate(code: string, duration: "MED" | "30" | "60" | "75") {
  return workoutTemplates.find((template) => template.code === `${code}-${duration}`);
}