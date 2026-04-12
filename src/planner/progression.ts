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

function setsMatch(planned?: string, actual?: string): boolean {
  const p = parseNumber(planned);
  const a = parseNumber(actual);

  if (p === null || a === null) return false;
  return p === a;
}

type RepTarget =
  | { kind: "exact"; value: number }
  | { kind: "range"; min: number; max: number };

function cleanRepText(value?: string): string {
  return normalizeText(value)
    .replace("/leg", "")
    .replace("per leg", "")
    .replace(/\s+/g, "");
}

function parseRepTarget(value?: string): RepTarget | null {
  const text = cleanRepText(value);
  if (!text) return null;

  if (text.includes("-")) {
    const [minStr, maxStr] = text.split("-");
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);

    if (Number.isNaN(min) || Number.isNaN(max)) return null;

    return { kind: "range", min, max };
  }

  const exact = parseFloat(text);
  if (Number.isNaN(exact)) return null;

  return { kind: "exact", value: exact };
}

function getActualRepNumber(value?: string): number | null {
  const text = cleanRepText(value);
  if (!text) return null;

  if (text.includes("-")) {
    const [, maxStr] = text.split("-");
    const max = parseFloat(maxStr);
    return Number.isNaN(max) ? null : max;
  }

  const n = parseFloat(text);
  return Number.isNaN(n) ? null : n;
}

type RepPerformance =
  | "top"
  | "within"
  | "below"
  | "unknown";

function evaluateRepPerformance(
  plannedReps?: string,
  actualReps?: string
): RepPerformance {
  const planned = parseRepTarget(plannedReps);
  const actual = getActualRepNumber(actualReps);

  if (!planned || actual === null) return "unknown";

  if (planned.kind === "exact") {
    if (actual >= planned.value) return "top";
    return "below";
  }

  if (actual > planned.max) return "top";
  if (actual === planned.max) return "top";
  if (actual >= planned.min) return "within";
  return "below";
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
  const repPerformance = evaluateRepPerformance(
    lastLog.planned_reps,
    lastLog.actual_reps
  );

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

  if (!plannedSetsOk) {
    return {
      suggestedWeight: String(currentWeight),
      outcome: "hold",
      reason: "You did not match the planned sets, so hold weight.",
    };
  }

  if (repPerformance === "top" && !hard) {
    const nextWeight = currentWeight + getIncrement(exerciseName);
    return {
      suggestedWeight: String(nextWeight),
      outcome: "increase",
      reason: "You hit the top of the rep target cleanly, so increase weight.",
    };
  }

  if (repPerformance === "top" && hard) {
    return {
      suggestedWeight: String(currentWeight),
      outcome: "hold",
      reason: "You hit the top of the rep target, but it sounded hard, so hold weight.",
    };
  }

  if (repPerformance === "within") {
    return {
      suggestedWeight: String(currentWeight),
      outcome: "hold",
      reason: "You were within the rep range, but not at the top yet, so hold weight.",
    };
  }

  if (repPerformance === "below") {
    const nextWeight = hard
      ? Math.max(0, currentWeight - getDecrease(exerciseName))
      : currentWeight;

    return {
      suggestedWeight: String(nextWeight),
      outcome: hard ? "decrease" : "hold",
      reason: hard
        ? "You missed the rep target and notes suggest it was hard, so reduce weight."
        : "You were below the rep target, so hold weight.",
    };
  }

  return {
    suggestedWeight: String(currentWeight),
    outcome: "hold",
    reason: "Not enough rep data to progress confidently, so hold weight.",
  };
}