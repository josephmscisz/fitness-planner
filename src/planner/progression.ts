type LastLog = {
  weight?: string;
  planned_sets?: string;
  planned_reps?: string;
  actual_sets?: string;
  actual_reps?: string;
  notes?: string;
};

function parseNumber(value?: string): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function normalizeText(value?: string): string {
  return (value ?? "").trim().toLowerCase();
}

function repsMatch(planned?: string, actual?: string): boolean {
  const p = normalizeText(planned);
  const a = normalizeText(actual);

  if (!p || !a) return false;
  return p === a;
}

function setsMatch(planned?: string, actual?: string): boolean {
  const p = parseNumber(planned);
  const a = parseNumber(actual);

  if (p === null || a === null) return false;
  return p === a;
}

function notesSuggestFailure(notes?: string): boolean {
  const text = normalizeText(notes);

  const failureWords = ["fail", "failed", "miss", "missed", "grind", "ugly", "form broke"];
  return failureWords.some((word) => text.includes(word));
}

function notesSuggestHard(notes?: string): boolean {
  const text = normalizeText(notes);

  const hardWords = ["hard", "tough", "slow", "heavy", "rough"];
  return hardWords.some((word) => text.includes(word));
}

function getIncrement(exerciseName: string): number {
  const name = exerciseName.toLowerCase();

  if (name.includes("deadlift")) return 10;
  if (name.includes("squat")) return 10;
  if (name.includes("bench")) return 5;
  if (name.includes("press")) return 5;

  return 5;
}

function getDecrease(exerciseName: string): number {
  const name = exerciseName.toLowerCase();

  if (name.includes("deadlift")) return 20;
  if (name.includes("squat")) return 15;
  if (name.includes("bench")) return 10;
  if (name.includes("press")) return 10;

  return 5;
}

export type ProgressionDecision = {
  suggestedWeight: string;
  outcome: "increase" | "hold" | "decrease" | "none";
  reason: string;
};

export function getProgressionDecision(
  exerciseName: string,
  lastLog: LastLog | null
): ProgressionDecision {
  if (!lastLog || !lastLog.weight) {
    return {
      suggestedWeight: "",
      outcome: "none",
      reason: "No previous weight found.",
    };
  }

  const currentWeight = parseNumber(lastLog.weight);

  if (currentWeight === null) {
    return {
      suggestedWeight: "",
      outcome: "none",
      reason: "Previous weight could not be parsed.",
    };
  }

  const plannedSetsOk = setsMatch(lastLog.planned_sets, lastLog.actual_sets);
  const plannedRepsOk = repsMatch(lastLog.planned_reps, lastLog.actual_reps);
  const failed = notesSuggestFailure(lastLog.notes);
  const hard = notesSuggestHard(lastLog.notes);

  if (failed) {
    const nextWeight = Math.max(0, currentWeight - getDecrease(exerciseName));

    return {
      suggestedWeight: String(nextWeight),
      outcome: "decrease",
      reason: "Last session notes suggest a miss or breakdown, so reduce weight.",
    };
  }

  if (plannedSetsOk && plannedRepsOk && !hard) {
    const nextWeight = currentWeight + getIncrement(exerciseName);

    return {
      suggestedWeight: String(nextWeight),
      outcome: "increase",
      reason: "You matched the planned work cleanly, so increase weight.",
    };
  }

  if (plannedSetsOk && plannedRepsOk && hard) {
    return {
      suggestedWeight: String(currentWeight),
      outcome: "hold",
      reason: "You completed the plan, but notes suggest it was hard, so hold weight.",
    };
  }

  return {
    suggestedWeight: String(currentWeight),
    outcome: "hold",
    reason: "Last session did not clearly beat the plan, so hold weight.",
  };
}