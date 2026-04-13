export type ModePreference = "auto" | "chaos" | "steady";
export type EnergyLevel = "low" | "medium" | "high";
export type WorkoutDuration = "MED" | "30" | "60" | "75";

export type PlanInput = {
  minutes: number;
  energy: EnergyLevel;
  modePreference: ModePreference;
  lastWorkout?: string;
  sessionsLast7Days: number;
};

export type PlanResult = {
  mode: "CHAOS" | "STEADY";
  workoutCode: string;
  duration: WorkoutDuration;
  reason: string;
  template?: {
    id: number;
    code: string;
    title: string;
    mode: "CHAOS" | "STEADY";
    duration: WorkoutDuration;
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
};

function getDuration(minutes: number, energy: EnergyLevel): WorkoutDuration {
  if (minutes < 30) return "MED";
  if (energy === "low") return "30";
  if (minutes >= 75) return "75";
  if (minutes >= 60) return "60";
  return "30";
}

function getMode(
  modePreference: ModePreference,
  sessionsLast7Days: number
): "CHAOS" | "STEADY" {
  if (modePreference === "chaos") return "CHAOS";
  if (modePreference === "steady") return "STEADY";
  return sessionsLast7Days >= 4 ? "STEADY" : "CHAOS";
}

function getNextChaosWorkout(lastWorkout?: string): string {
  if (lastWorkout === "A") return "B";
  if (lastWorkout === "B") return "C";
  if (lastWorkout === "C") return "A";
  return "A";
}

function getNextSteadyWorkout(lastWorkout?: string): string {
  if (lastWorkout === "LOWER1") return "PUSH";
  if (lastWorkout === "PUSH") return "LOWER2";
  if (lastWorkout === "LOWER2") return "PULL";
  if (lastWorkout === "PULL") return "LOWER1";
  return "LOWER1";
}

function buildReason(
  mode: "CHAOS" | "STEADY",
  duration: WorkoutDuration,
  sessionsLast7Days: number,
  energy: EnergyLevel
): string {
  const modeReason =
    mode === "CHAOS"
      ? `Using Chaos Mode because your recent frequency looks lower or less predictable (${sessionsLast7Days} session(s) in the last 7 days).`
      : `Using Steady State because your recent frequency supports a split (${sessionsLast7Days} session(s) in the last 7 days).`;

  const durationReason =
    duration === "MED"
      ? "You have under 30 minutes, so this is a minimum effective dose day."
      : duration === "30"
      ? "This is a short, high-value session that should still feel complete."
      : duration === "60"
      ? "This is your balanced default session."
      : "This is an expanded session with more complete volume.";

  const energyReason =
    energy === "low"
      ? "Energy is low, so the plan biases toward something more winnable."
      : energy === "medium"
      ? "Energy is moderate, so the plan keeps a solid training stimulus without overreaching."
      : "Energy is high, so the plan allows a fuller session if time supports it.";

  return `${modeReason} ${durationReason} ${energyReason}`;
}

export function planToday(input: PlanInput): PlanResult {
  const duration = getDuration(input.minutes, input.energy);
  const mode = getMode(input.modePreference, input.sessionsLast7Days);

  const workoutCode =
    mode === "CHAOS"
      ? getNextChaosWorkout(input.lastWorkout)
      : getNextSteadyWorkout(input.lastWorkout);

  const reason = buildReason(
    mode,
    duration,
    input.sessionsLast7Days,
    input.energy
  );

  return {
    mode,
    workoutCode,
    duration,
    reason,
  };
}