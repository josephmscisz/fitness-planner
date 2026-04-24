import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import {
  planToday,
  type AccessoryProgressionCue,
  type ChallengeLevel,
  type ChallengeSuggestion,
  type EnergyLevel,
  type ModePreference,
  type PlanResult,
} from "../planner/planToday";
import {
  computeWhoopAlignment30d,
  getExercises,
  getLastWhoopSyncTime,
  getLatestWhoopDailyMetric,
  getMostRecentWorkoutCode,
  getConsecutiveCompletedSessionsWithReasonToken,
  getRecentCompletedSessionsWithReasonToken,
  getRecentExercisePerformance,
  getSessionsLast7DaysCount,
  getWorkoutSessions,
  getWhoopConnection,
  getWorkoutTemplateByCodeAndDuration,
  initDb,
  saveWhoopConnection,
  upsertWhoopDailyMetric,
  upsertWhoopWorkout,
} from "../lib/db";
import {
  getWhoopConnectUrl,
  getWhoopStatusFromBackend,
  syncWhoopFromBackend,
} from "../lib/whoopClient";
import type { AppTheme } from "../theme";
import {
  cardStyle,
  inputStyle,
  pageStyle,
  primaryButtonStyle,
  smallMutedTextStyle,
  tableCellStyle,
  tableHeaderStyle,
} from "../themeStyles";
import SessionLogger from "./SessionLogger";

const GETTING_GOING_AGAIN_TOKEN = "[gga]";
const GETTING_GOING_AGAIN_TOTAL_SESSIONS = 3;
const GETTING_GOING_AGAIN_LOCKOUT_DAYS = 30;
const ABS_PLANNED_TOKEN = "[abs:planned]";
const ABS_SKIPPED_TOKEN = "[abs:skipped]";
const ABS_DONE_TOKEN = "[abs:done]";
const ABS_MAX_SESSIONS_WITHOUT = 4;

type AbsScheduleState = {
  includeAbs: boolean;
  forcedUntilCompleted: boolean;
};

type ParsedRecentSet = {
  weight: number;
  reps: number;
  plannedReps: number | null;
  notes: string;
  estimatedOneRepMax: number;
};

function isObliqueExerciseName(name: string): boolean {
  const text = name.toLowerCase();
  return (
    text.includes("oblique") ||
    text.includes("side bend") ||
    text.includes("woodchop") ||
    text.includes("pallof") ||
    text.includes("twist") ||
    text.includes("russian twist")
  );
}

function isAbsExerciseRecord(exercise: {
  name?: string | null;
  category?: string | null;
  movement_pattern?: string | null;
  primary_muscles?: string | null;
}): boolean {
  const combined = [
    exercise.name ?? "",
    exercise.category ?? "",
    exercise.movement_pattern ?? "",
    exercise.primary_muscles ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    combined.includes("abs") ||
    combined.includes("abdom") ||
    combined.includes("core") ||
    combined.includes("oblique")
  );
}

function chooseRandomDistinct<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];

  while (pool.length > 0 && chosen.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    const [next] = pool.splice(index, 1);
    chosen.push(next);
  }

  return chosen;
}

function getAbsScheduleState(reasonsNewestFirst: Array<string | null | undefined>): AbsScheduleState {
  const normalized = reasonsNewestFirst.map((reason) => (reason ?? "").toLowerCase());

  const latestSkipIndex = normalized.findIndex((reason) => reason.includes(ABS_SKIPPED_TOKEN));
  const latestDoneIndex = normalized.findIndex((reason) => reason.includes(ABS_DONE_TOKEN));

  const forcedUntilCompleted =
    latestSkipIndex !== -1 &&
    (latestDoneIndex === -1 || latestSkipIndex < latestDoneIndex);

  if (forcedUntilCompleted) {
    return { includeAbs: true, forcedUntilCompleted: true };
  }

  const lastHadAbs = normalized.length > 0 && normalized[0].includes(ABS_PLANNED_TOKEN);
  if (lastHadAbs) {
    return { includeAbs: false, forcedUntilCompleted: false };
  }

  const latestAbsIndex = normalized.findIndex((reason) => reason.includes(ABS_PLANNED_TOKEN));
  const sessionsWithoutAbs = latestAbsIndex === -1 ? normalized.length : latestAbsIndex;

  if (sessionsWithoutAbs >= ABS_MAX_SESSIONS_WITHOUT) {
    return { includeAbs: true, forcedUntilCompleted: false };
  }

  const randomInclude = Math.random() < 0.35;
  return { includeAbs: randomInclude, forcedUntilCompleted: false };
}

function parseFirstNumber(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function chooseChallengeReps(plannedReps?: string): number {
  if (!plannedReps) return 8;
  const numbers = (plannedReps.match(/\d+/g) ?? []).map((n) => Number(n));
  if (numbers.length === 0) return 8;
  const highest = Math.max(...numbers);
  if (highest >= 12) return 8;
  if (highest >= 9) return 6;
  return 5;
}

function getLoadStep(exerciseName: string): number {
  const text = exerciseName.toLowerCase();
  if (text.includes("deadlift") || text.includes("squat")) return 10;
  return 5;
}

function roundToLoadStep(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

function isPrimaryLift(exerciseName: string, slotType?: string): boolean {
  if ((slotType ?? "") === "fixed_foundation") return true;

  const text = exerciseName.toLowerCase();
  return (
    text.includes("squat") ||
    text.includes("bench") ||
    text.includes("deadlift") ||
    text.includes("overhead press") ||
    text.includes("press") ||
    text.includes("row")
  );
}

function parseRecentSets(
  recent: Array<{
    weight?: string | null;
    actual_reps?: string | null;
    planned_reps?: string | null;
    notes?: string | null;
  }>
): ParsedRecentSet[] {
  return recent
    .map((row) => {
      const weight = parseFirstNumber(row.weight);
      const reps = parseFirstNumber(row.actual_reps);
      if (weight == null || reps == null) return null;

      return {
        weight,
        reps,
        plannedReps: parseFirstNumber(row.planned_reps),
        notes: (row.notes ?? "").toLowerCase(),
        estimatedOneRepMax: weight * (1 + reps / 30),
      };
    })
    .filter((row): row is ParsedRecentSet => row != null);
}

function calculateTrendPerSessionPct(parsed: ParsedRecentSet[]): number | null {
  if (parsed.length < 2) return null;

  const newest = parsed[0].estimatedOneRepMax;
  const oldest = parsed[parsed.length - 1].estimatedOneRepMax;
  if (oldest <= 0) return null;

  const jumps = parsed.length - 1;
  return ((newest - oldest) / oldest / jumps) * 100;
}

function recentSetSuggestsOverreach(parsed: ParsedRecentSet[]): boolean {
  if (parsed.length === 0) return false;

  const latest = parsed[0];
  const failureWords = ["fail", "failed", "miss", "missed", "grind", "ugly", "form broke", "partial"];
  const noteFlag = failureWords.some((word) => latest.notes.includes(word));

  if (noteFlag) return true;
  if (latest.plannedReps == null) return false;
  return latest.reps + 0.1 < latest.plannedReps;
}

function getRotationBadgeStyle(theme: AppTheme, reason?: string) {
  const text = (reason ?? "").toLowerCase();

  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    marginTop: 4,
    marginRight: 6,
  };

  if (text.includes("fallback used")) {
    return {
      ...base,
      backgroundColor: theme.dangerBg,
      color: theme.dangerText,
      border: `1px solid ${theme.borderStrong}`,
    };
  }

  if (text.includes("recently avoided")) {
    return {
      ...base,
      backgroundColor: theme.accentSoft,
      color: theme.accent,
      border: `1px solid ${theme.borderStrong}`,
    };
  }

  return {
    ...base,
    backgroundColor: theme.surfaceElevated,
    color: theme.textMuted,
    border: `1px solid ${theme.borderStrong}`,
  };
}

function getRotationBadgeLabel(reason?: string) {
  const text = (reason ?? "").toLowerCase();

  if (text.includes("fallback used")) return "Fallback Used";
  if (text.includes("recently avoided")) return "Recently Avoided";
  return "Rotated";
}

export default function PlanToday({ theme }: { theme: AppTheme }) {
  const [minutes, setMinutes] = useState(30);
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [modePreference, setModePreference] =
    useState<ModePreference>("auto");

  const [sessionsLast7Days, setSessionsLast7Days] = useState(0);
  const [lastWorkout, setLastWorkout] = useState("");

  const [autoSessionsLast7Days, setAutoSessionsLast7Days] = useState(0);
  const [autoLastWorkout, setAutoLastWorkout] = useState("");

  const [overrideHistoryInputs, setOverrideHistoryInputs] = useState(false);

  const [result, setResult] = useState<PlanResult | null>(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [whoopConnected, setWhoopConnected] = useState(false);
  const [whoopRecovery, setWhoopRecovery] = useState<number | null>(null);
  const [whoopSleepPerformance, setWhoopSleepPerformance] = useState<
    number | null
  >(null);
  const [whoopAlignmentPercent, setWhoopAlignmentPercent] = useState<
    number | null
  >(null);
  const [whoopAlignmentBucket, setWhoopAlignmentBucket] = useState<
    "low" | "medium" | "high" | null
  >(null);
  const [whoopLastSync, setWhoopLastSync] = useState<string | null>(null);
  const [syncingWhoop, setSyncingWhoop] = useState(false);
  const [whoopSyncMessage, setWhoopSyncMessage] = useState("");
  const [whoopSyncError, setWhoopSyncError] = useState("");
  const [challengeLevel, setChallengeLevel] = useState<ChallengeLevel>("off");
  const [challengeSuggestions, setChallengeSuggestions] = useState<
    ChallengeSuggestion[]
  >([]);
  const [accessoryProgressionCues, setAccessoryProgressionCues] = useState<
    AccessoryProgressionCue[]
  >([]);
  const [gettingGoingAgainSelectionLocked, setGettingGoingAgainSelectionLocked] =
    useState(false);
  const [gettingGoingAgainLockedUntil, setGettingGoingAgainLockedUntil] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function loadPlannerDefaults() {
      await initDb();

      const [sessionCount, recentWorkoutCode] = await Promise.all([
        getSessionsLast7DaysCount(),
        getMostRecentWorkoutCode(),
      ]);

      setAutoSessionsLast7Days(sessionCount);
      setAutoLastWorkout(recentWorkoutCode);

      setSessionsLast7Days(sessionCount);
      setLastWorkout(recentWorkoutCode);

      await refreshGettingGoingAgainLockout();
      await loadWhoopStatus();
    }

    loadPlannerDefaults();
  }, []);

  async function refreshGettingGoingAgainLockout(): Promise<{
    locked: boolean;
    lockedUntil: string | null;
  }> {
    const recentRampSessions = await getRecentCompletedSessionsWithReasonToken(
      GETTING_GOING_AGAIN_TOKEN,
      GETTING_GOING_AGAIN_TOTAL_SESSIONS
    );

    if (recentRampSessions.length < GETTING_GOING_AGAIN_TOTAL_SESSIONS) {
      setGettingGoingAgainSelectionLocked(false);
      setGettingGoingAgainLockedUntil(null);
      return { locked: false, lockedUntil: null };
    }

    const firstRampSessionStartedAt = recentRampSessions[recentRampSessions.length - 1].started_at;
    const firstRampDate = new Date(firstRampSessionStartedAt);

    if (Number.isNaN(firstRampDate.getTime())) {
      setGettingGoingAgainSelectionLocked(false);
      setGettingGoingAgainLockedUntil(null);
      return { locked: false, lockedUntil: null };
    }

    const lockoutUntil = new Date(firstRampDate);
    lockoutUntil.setDate(lockoutUntil.getDate() + GETTING_GOING_AGAIN_LOCKOUT_DAYS);

    if (Date.now() < lockoutUntil.getTime()) {
      setGettingGoingAgainSelectionLocked(true);
      setGettingGoingAgainLockedUntil(lockoutUntil.toISOString());
      return { locked: true, lockedUntil: lockoutUntil.toISOString() };
    }

    setGettingGoingAgainSelectionLocked(false);
    setGettingGoingAgainLockedUntil(null);
    return { locked: false, lockedUntil: null };
  }

  useEffect(() => {
    if (
      gettingGoingAgainSelectionLocked &&
      challengeLevel === "getting_going_again"
    ) {
      setChallengeLevel("off");
    }
  }, [gettingGoingAgainSelectionLocked, challengeLevel]);

  async function loadWhoopStatus() {
    let backendConnected = false;

    try {
      const backendStatus = await getWhoopStatusFromBackend();
      backendConnected = backendStatus.connected;
    } catch {
      const localConnection = await getWhoopConnection();
      backendConnected = !!localConnection;
    }

    const [latestMetric, alignment, lastSync] = await Promise.all([
      getLatestWhoopDailyMetric(),
      computeWhoopAlignment30d(),
      getLastWhoopSyncTime(),
    ]);

    setWhoopConnected(backendConnected);
    setWhoopRecovery(latestMetric?.recovery_score ?? null);
    setWhoopSleepPerformance(latestMetric?.sleep_performance ?? null);
    setWhoopAlignmentPercent(alignment.percent);
    setWhoopAlignmentBucket(alignment.latestBucket);
    setWhoopLastSync(lastSync);
  }

  async function handleConnectWhoop() {
    try {
      setWhoopSyncError("");
      await open(getWhoopConnectUrl());
    } catch (err) {
      setWhoopSyncError(
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  async function handleSyncWhoop() {
    try {
      setSyncingWhoop(true);
      setWhoopSyncMessage("");
      setWhoopSyncError("");

      const payload = await syncWhoopFromBackend();

      if (!payload.connected) {
        throw new Error(payload.error || "WHOOP is not connected.");
      }

      if (payload.connection) {
        await saveWhoopConnection({
          providerUserId: payload.connection.providerUserId ?? undefined,
          accessToken: "__backend_managed__",
          refreshToken: "__backend_managed__",
          scope: payload.connection.scope ?? undefined,
          expiresAt: payload.connection.expiresAt ?? undefined,
        });
      }

      if (payload.latestMetric) {
        await upsertWhoopDailyMetric({
          metricDate: payload.latestMetric.metricDate,
          recoveryScore: payload.latestMetric.recoveryScore ?? null,
          sleepPerformance: payload.latestMetric.sleepPerformance ?? null,
          sleepDurationMins: payload.latestMetric.sleepDurationMins ?? null,
          hrv: payload.latestMetric.hrv ?? null,
          restingHr: payload.latestMetric.restingHr ?? null,
          rawJson: payload.latestMetric.rawJson ?? "",
        });
      }

      for (const workout of payload.workouts ?? []) {
        if (!workout.whoopWorkoutId || !workout.startTime) continue;

        await upsertWhoopWorkout({
          whoopWorkoutId: workout.whoopWorkoutId,
          startTime: workout.startTime,
          endTime: workout.endTime ?? null,
          sportName: workout.sportName ?? null,
          strain: workout.strain ?? null,
          averageHr: workout.averageHr ?? null,
          maxHr: workout.maxHr ?? null,
          rawJson: workout.rawJson ?? "",
        });
      }

      await loadWhoopStatus();

      setWhoopSyncMessage(
        `WHOOP sync complete.${
          payload.latestMetric ? " Recovery/sleep loaded." : ""
        }${
          payload.workouts?.length
            ? ` Workouts imported: ${payload.workouts.length}.`
            : ""
        }`
      );
    } catch (err) {
      console.error("WHOOP SYNC ERROR:", err);
      setWhoopSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingWhoop(false);
    }
  }

  async function handlePlan() {
    setLoading(true);

    try {
      await initDb();
      const ggaLockout = await refreshGettingGoingAgainLockout();
      const effectiveChallengeLevel: ChallengeLevel =
        challengeLevel === "getting_going_again" && ggaLockout.locked
          ? "off"
          : challengeLevel;

      if (
        challengeLevel === "getting_going_again" &&
        ggaLockout.locked
      ) {
        setChallengeLevel("off");
      }

      const basePlan = planToday({
        minutes,
        energy,
        modePreference,
        sessionsLast7Days,
        lastWorkout: lastWorkout || undefined,
      });

      let adjustedReason = basePlan.reason;
      let adjustedDuration = basePlan.duration;

      if (whoopRecovery != null || whoopSleepPerformance != null) {
        const lowRecovery = whoopRecovery != null && whoopRecovery < 34;
        const lowSleep =
          whoopSleepPerformance != null && whoopSleepPerformance < 70;
        const highRecovery = whoopRecovery != null && whoopRecovery >= 67;
        const highSleep =
          whoopSleepPerformance != null && whoopSleepPerformance >= 85;

        if (lowRecovery || lowSleep) {
          adjustedReason +=
            " WHOOP suggests reduced readiness today, so this recommendation is intentionally conservative.";

          if (basePlan.duration === "75") adjustedDuration = "60";
          else if (basePlan.duration === "60") adjustedDuration = "30";
        } else if (highRecovery && highSleep) {
          adjustedReason +=
            " WHOOP suggests strong readiness today, so you are well-positioned to push a bit if desired.";
        }
      }

      const template = await getWorkoutTemplateByCodeAndDuration(
        basePlan.workoutCode,
        adjustedDuration
      );
      const recentSessions = await getWorkoutSessions();
      const recentReasons = recentSessions
        .filter((session) => !!session.completed_at)
        .slice(0, 12)
        .map((session) => session.reason);
      const absSchedule = getAbsScheduleState(recentReasons);

      let resolvedTemplate = template;
      let absBlockIncluded = false;
      let absExerciseNames: string[] = [];

      if (template && absSchedule.includeAbs) {
        const allExercises = await getExercises();
        const coreCandidates = allExercises.filter((exercise) => isAbsExerciseRecord(exercise));
        const obliqueCandidates = coreCandidates.filter((exercise) =>
          isObliqueExerciseName(exercise.name)
        );
        const abCandidates = coreCandidates.filter(
          (exercise) => !isObliqueExerciseName(exercise.name)
        );

        const selectedAbs = chooseRandomDistinct(abCandidates, 2);
        const selectedOblique = chooseRandomDistinct(
          obliqueCandidates.filter(
            (exercise) => !selectedAbs.some((abs) => abs.id === exercise.id)
          ),
          1
        );

        const selectedCore = [...selectedAbs, ...selectedOblique];

        if (selectedCore.length === 3) {
          const nextSortOrder =
            template.exercises.length > 0
              ? Math.max(...template.exercises.map((exercise) => exercise.sort_order)) + 1
              : 1;

          const absExercises = selectedCore.map((exercise, index) => ({
            id: 500000 + exercise.id,
            exercise_name: exercise.name,
            sort_order: nextSortOrder + index,
            sets: "3",
            reps: isObliqueExerciseName(exercise.name) ? "10-12/side" : "12-15",
            notes: isObliqueExerciseName(exercise.name)
              ? "Random core add-on (oblique)"
              : "Random core add-on (abs)",
            slot_type: "abs_bonus",
            accessory_slot: "",
            accessory_equipment: "",
            tutorial_url: exercise.tutorial_url ?? "",
            was_rotated: false,
            rotation_reason: "",
          }));

          resolvedTemplate = {
            ...template,
            exercises: [...template.exercises, ...absExercises],
          };
          absBlockIncluded = true;
          absExerciseNames = absExercises.map((exercise) => exercise.exercise_name);
        }
      }

      let suggestions: ChallengeSuggestion[] = [];
      let accessoryCues: AccessoryProgressionCue[] = [];
      let averagePrimaryTrend: number | null = null;

      const challengeMode = effectiveChallengeLevel !== "off";
      const gettingGoingAgainMode =
        effectiveChallengeLevel === "getting_going_again";
      const priorGettingGoingAgainSessions = gettingGoingAgainMode
        ? await getConsecutiveCompletedSessionsWithReasonToken(
            GETTING_GOING_AGAIN_TOKEN,
            8
          )
        : 0;
      const gettingGoingAgainSessionsRemaining = gettingGoingAgainMode
        ? Math.max(
            0,
            GETTING_GOING_AGAIN_TOTAL_SESSIONS - priorGettingGoingAgainSessions
          )
        : 0;
      const gettingGoingAgainActive =
        gettingGoingAgainMode && gettingGoingAgainSessionsRemaining > 0;

      if (resolvedTemplate) {
        const primaryTrendValues: number[] = [];

        const suggestionCandidates = await Promise.all(
          resolvedTemplate.exercises.map(async (exercise) => {
            if (!exercise.exercise_name) return null;

            const recent = await getRecentExercisePerformance(
              exercise.exercise_name,
              6
            );
            const parsed = parseRecentSets(recent);

            if (isPrimaryLift(exercise.exercise_name, exercise.slot_type)) {
              if (parsed.length < 2) return null;

              const step = getLoadStep(exercise.exercise_name);
              const trendPerSessionPct = calculateTrendPerSessionPct(parsed);
              const overreached = recentSetSuggestsOverreach(parsed);
              const targetReps = chooseChallengeReps(exercise.reps);
              const bestEstimate = Math.max(
                ...parsed.map((row) => row.estimatedOneRepMax)
              );
              const latestWeight = parsed[0].weight;

              if (trendPerSessionPct != null) {
                primaryTrendValues.push(trendPerSessionPct);
              }

              let targetWeight: number;

              if (overreached) {
                // Keep challenge intent but throttle load after a likely overshoot.
                targetWeight = roundToLoadStep(
                  Math.max(step, latestWeight - step),
                  step
                );
              } else {
                const baseBoost = effectiveChallengeLevel === "conservative"
                  ? 0.015
                  : effectiveChallengeLevel === "aggressive"
                  ? 0.04
                  : effectiveChallengeLevel === "very_aggressive"
                  ? 0.065
                  : 0.015;
                const trendBoostCap = effectiveChallengeLevel === "conservative"
                  ? 0.03
                  : effectiveChallengeLevel === "aggressive"
                  ? 0.06
                  : effectiveChallengeLevel === "very_aggressive"
                  ? 0.1
                  : 0.03;
                const aggressiveBoost = trendPerSessionPct != null && trendPerSessionPct > 0
                  ? Math.min(trendBoostCap, trendPerSessionPct / 100)
                  : baseBoost;

                const boostedEstimate = bestEstimate * (1 + aggressiveBoost);
                const projectedWeight = roundToLoadStep(
                  boostedEstimate / (1 + targetReps / 30),
                  step
                );

                targetWeight = Math.max(
                  projectedWeight,
                  roundToLoadStep(latestWeight + step, step)
                );
              }

              if (gettingGoingAgainActive) {
                targetWeight = roundToLoadStep(
                  Math.max(step, targetWeight * 0.75),
                  step
                );
              }

              const evidence = parsed
                .slice(0, 2)
                .map((row) => `${row.reps} reps at ${row.weight}`)
                .join(" and ");

              return {
                exerciseName: exercise.exercise_name,
                targetReps: overreached ? targetReps + 1 : targetReps,
                targetWeight,
                evidence,
                trendPerSessionPct,
                throttled: overreached,
              } satisfies ChallengeSuggestion;
            }

            if (parsed.length > 0) {
              const overreached = recentSetSuggestsOverreach(parsed);
              const latest = parsed[0];
              const cue = overreached
                ? "Hold or reduce load slightly next time and rebuild clean reps before pushing load."
                : latest.plannedReps != null && latest.reps >= latest.plannedReps
                ? "Accessories are progressing well; add 1-2 reps first, then add a small load bump."
                : "Keep accessory load stable and aim to beat rep quality before adding weight.";

              accessoryCues.push({
                exerciseName: exercise.exercise_name,
                cue,
              });
            }

            return null;
          })
        );

        averagePrimaryTrend =
          primaryTrendValues.length > 0
            ? primaryTrendValues.reduce((sum, v) => sum + v, 0) /
              primaryTrendValues.length
            : null;

        suggestions = suggestionCandidates.filter(
          (item): item is ChallengeSuggestion => item != null
        );
      }

      if (averagePrimaryTrend != null) {
        const trendText = `${averagePrimaryTrend >= 0 ? "+" : ""}${averagePrimaryTrend.toFixed(2)}%/session`;

        if (averagePrimaryTrend < -0.5) {
          adjustedReason += ` Recent primary-lift trend is ${trendText}, so the base recommendation favors controlled progression.`;
        } else if (averagePrimaryTrend > 0.5) {
          adjustedReason += ` Recent primary-lift trend is ${trendText}, indicating momentum you can leverage.`;
        }
      }

      setChallengeSuggestions(suggestions);
      setAccessoryProgressionCues(accessoryCues);

      if (absBlockIncluded) {
        adjustedReason += absSchedule.forcedUntilCompleted
          ? " Core add-on was forced because a previous abs block was skipped."
          : " Random core add-on included today (2 abs + 1 oblique).";
      }

      const absPlanToken = absBlockIncluded
        ? ` ${ABS_PLANNED_TOKEN}${absSchedule.forcedUntilCompleted ? " [abs:forced]" : ""}`
        : "";

      setResult({
        ...basePlan,
        duration: adjustedDuration,
        reason: challengeMode
          ? `${adjustedReason} Challenge Mode (${effectiveChallengeLevel.replace("_", " ")}) applies primary-lift progression with automatic throttle-back when recent logs show overshoot.${
              gettingGoingAgainActive
                ? ` ${GETTING_GOING_AGAIN_TOKEN.toUpperCase()} Recovery ramp active: use ~75% training loads and hold increases for ${gettingGoingAgainSessionsRemaining} more session(s).`
                : ""
            }${absPlanToken}`
          : `${adjustedReason}${absPlanToken}`,
        selectedEnergy: energy,
        template: resolvedTemplate ?? undefined,
        challengeMode,
        challengeLevel: effectiveChallengeLevel,
        challengeSuggestions: suggestions,
        accessoryProgressionCues: accessoryCues,
        gettingGoingAgainSessionsRemaining,
        absBlockIncluded,
        absExerciseNames,
        absForcedUntilCompleted: absSchedule.forcedUntilCompleted,
      });

      setStarted(false);
    } catch (err) {
      console.error("PLAN LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  if (started && result) {
    return (
      <SessionLogger
        plan={result}
        onDone={() => setStarted(false)}
        theme={theme}
        whoopRecovery={whoopRecovery}
        whoopSleepPerformance={whoopSleepPerformance}
        whoopAlignmentBucket={whoopAlignmentBucket}
      />
    );
  }

  return (
    <div style={pageStyle(theme)}>
      <h1 style={{ marginBottom: 8 }}>Plan Today</h1>
      <p style={smallMutedTextStyle(theme)}>
        Choose your available time and current situation, then get a recommended
        workout.
      </p>

      <div
        style={{
          ...cardStyle(theme),
          padding: 20,
          marginTop: 20,
          display: "grid",
          gap: 16,
          backgroundColor: theme.surface,
        }}
      >
        <label>
          <div style={{ marginBottom: 6, color: theme.textMuted }}>
            Minutes available
          </div>
          <select
            style={inputStyle(theme)}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
            <option value={75}>75</option>
          </select>
        </label>

        <label>
          <div style={{ marginBottom: 6, color: theme.textMuted }}>Energy</div>
          <select
            style={inputStyle(theme)}
            value={energy}
            onChange={(e) => setEnergy(e.target.value as EnergyLevel)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          <div style={{ marginBottom: 6, color: theme.textMuted }}>
            Mode preference
          </div>
          <select
            style={inputStyle(theme)}
            value={modePreference}
            onChange={(e) =>
              setModePreference(e.target.value as ModePreference)
            }
          >
            <option value="auto">Auto</option>
            <option value="chaos">Chaos</option>
            <option value="steady">Steady</option>
          </select>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: theme.text,
          }}
        >
          <span style={{ marginRight: 4 }}>Challenge Mode:</span>
          <select
            value={challengeLevel}
            onChange={(e) => setChallengeLevel(e.target.value as ChallengeLevel)}
            style={{ background: theme.surface, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "4px 8px" }}
          >
            <option value="off">Off</option>
            <option value="conservative">Conservative</option>
            <option value="aggressive">Aggressive</option>
            <option value="very_aggressive">Very Aggressive</option>
            <option
              value="getting_going_again"
              disabled={gettingGoingAgainSelectionLocked}
            >
              Getting Going Again
            </option>
          </select>
          <span style={{ color: theme.textMuted, fontSize: 12 }}>(primary lifts + auto-throttle)</span>
        </label>

        {gettingGoingAgainSelectionLocked && gettingGoingAgainLockedUntil && (
          <div style={{ ...smallMutedTextStyle(theme), marginTop: -4, marginBottom: 8 }}>
            Getting Going Again is temporarily unavailable until {new Date(gettingGoingAgainLockedUntil).toLocaleDateString()} because the prior 3-session ramp started within the last 30 days.
          </div>
        )}

        <div
          style={{
            backgroundColor: theme.surfaceMuted,
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            padding: 14,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
              color: theme.text,
            }}
          >
            <input
              type="checkbox"
              checked={overrideHistoryInputs}
              onChange={(e) => {
                const checked = e.target.checked;
                setOverrideHistoryInputs(checked);

                if (!checked) {
                  setSessionsLast7Days(autoSessionsLast7Days);
                  setLastWorkout(autoLastWorkout);
                }
              }}
            />
            Override autofilled history inputs
          </label>

          <div style={smallMutedTextStyle(theme)}>
            Auto: {autoSessionsLast7Days} session(s) in last 7 days · last
            workout {autoLastWorkout || "none"}
          </div>

          {overrideHistoryInputs && (
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <label>
                <div style={{ marginBottom: 6, color: theme.textMuted }}>
                  Sessions in the last 7 days
                </div>
                <input
                  style={inputStyle(theme)}
                  type="number"
                  min={0}
                  max={14}
                  value={sessionsLast7Days}
                  onChange={(e) =>
                    setSessionsLast7Days(Number(e.target.value))
                  }
                />
              </label>

              <label>
                <div style={{ marginBottom: 6, color: theme.textMuted }}>
                  Last workout
                </div>
                <input
                  style={inputStyle(theme)}
                  type="text"
                  placeholder="Examples: A, B, C, LOWER1, PUSH, LOWER2, PULL"
                  value={lastWorkout}
                  onChange={(e) =>
                    setLastWorkout(e.target.value.toUpperCase())
                  }
                />
              </label>
            </div>
          )}
        </div>

        <div
          style={{
            backgroundColor: theme.surfaceMuted,
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>WHOOP Status</div>
              <div style={smallMutedTextStyle(theme)}>
                {whoopConnected
                  ? "WHOOP connected"
                  : "WHOOP not connected yet"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleConnectWhoop}
                style={{
                  ...primaryButtonStyle(theme),
                  padding: "8px 12px",
                }}
              >
                Connect WHOOP
              </button>

              <button
                type="button"
                onClick={handleSyncWhoop}
                disabled={syncingWhoop}
                style={{
                  ...primaryButtonStyle(theme),
                  padding: "8px 12px",
                  opacity: syncingWhoop ? 0.7 : 1,
                }}
              >
                {syncingWhoop ? "Syncing..." : "Sync WHOOP"}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(120px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div
              style={{
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={smallMutedTextStyle(theme)}>Recovery</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>
                {whoopRecovery ?? "—"}
              </div>
            </div>

            <div
              style={{
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={smallMutedTextStyle(theme)}>Sleep Performance</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>
                {whoopSleepPerformance != null
                  ? `${whoopSleepPerformance}%`
                  : "—"}
              </div>
            </div>

            <div
              style={{
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <div style={smallMutedTextStyle(theme)}>30-Day Alignment</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>
                {whoopAlignmentPercent != null
                  ? `${whoopAlignmentPercent}%`
                  : "—"}
              </div>
              <div style={smallMutedTextStyle(theme)}>
                Subjective energy vs WHOOP recovery.
              </div>
            </div>
          </div>

          <div style={{ ...smallMutedTextStyle(theme), marginTop: 10 }}>
            WHOOP readiness bucket: {whoopAlignmentBucket ?? "—"}
          </div>

          <div style={{ ...smallMutedTextStyle(theme), marginTop: 6 }}>
            Last sync:{" "}
            {whoopLastSync ? new Date(whoopLastSync).toLocaleString() : "—"}
          </div>

          {whoopSyncMessage && (
            <div
              style={{
                ...smallMutedTextStyle(theme),
                marginTop: 10,
                color: theme.successText,
              }}
            >
              {whoopSyncMessage}
            </div>
          )}

          {whoopSyncError && (
            <div
              style={{
                ...smallMutedTextStyle(theme),
                marginTop: 10,
                color: theme.dangerText,
              }}
            >
              Sync failed: {whoopSyncError}
            </div>
          )}
        </div>

        <button
          onClick={handlePlan}
          disabled={loading}
          style={{
            ...primaryButtonStyle(theme),
            width: 180,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Loading..." : "Plan Today"}
        </button>
      </div>

      {result && (
        <div
          style={{
            ...cardStyle(theme),
            marginTop: 24,
            padding: 20,
            backgroundColor: theme.surface,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Recommendation</h2>

          {result.absBlockIncluded && (
            <div
              style={{
                display: "inline-block",
                marginBottom: 10,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
                border: `1px solid ${theme.borderStrong}`,
                backgroundColor: result.absForcedUntilCompleted
                  ? theme.warningBg
                  : theme.accentSoft,
                color: result.absForcedUntilCompleted
                  ? theme.warningText
                  : theme.accent,
              }}
            >
              {result.absForcedUntilCompleted
                ? "Abs Active (Forced Until Done)"
                : "Abs Active"}
            </div>
          )}

          <p>
            <strong>Mode:</strong> {result.mode}
          </p>
          <p>
            <strong>Workout Code:</strong> {result.workoutCode}
          </p>
          <p>
            <strong>Duration:</strong> {result.duration}
          </p>
          <p style={{ color: theme.textMuted }}>
            <strong>Why:</strong> {result.reason}
          </p>

          {result.template ? (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ marginBottom: 8 }}>{result.template.title}</h3>
              <p style={{ color: theme.textMuted }}>
                <strong>Focus:</strong> {result.template.focus}
              </p>

              <div
                style={{
                  overflowX: "auto",
                  marginTop: 12,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                }}
              >
                <table
                  cellPadding={10}
                  style={{
                    borderCollapse: "collapse",
                    minWidth: 760,
                    width: "100%",
                    backgroundColor: theme.surface,
                  }}
                >
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle(theme)}>Exercise</th>
                      <th style={tableHeaderStyle(theme)}>Sets</th>
                      <th style={tableHeaderStyle(theme)}>Reps</th>
                      <th style={tableHeaderStyle(theme)}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.template.exercises.map((exercise, index) => (
                      <tr key={`${exercise.exercise_name}-${index}`}>
                        <td style={tableCellStyle(theme)}>
                          <div>{exercise.exercise_name}</div>

                          {exercise.was_rotated && (
                            <div style={{ marginTop: 4 }}>
                              <div
                                style={getRotationBadgeStyle(
                                  theme,
                                  exercise.rotation_reason
                                )}
                              >
                                {getRotationBadgeLabel(
                                  exercise.rotation_reason
                                )}
                              </div>

                              <div
                                style={{
                                  fontSize: 12,
                                  color: theme.accent,
                                  marginTop: 4,
                                }}
                              >
                                Rotated from slot: {exercise.accessory_slot}
                              </div>

                              {exercise.rotation_reason && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: theme.textSoft,
                                    marginTop: 4,
                                  }}
                                >
                                  {exercise.rotation_reason}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={tableCellStyle(theme)}>{exercise.sets}</td>
                        <td style={tableCellStyle(theme)}>{exercise.reps}</td>
                        <td style={tableCellStyle(theme)}>
                          {exercise.notes ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => setStarted(true)}
                style={{
                  ...primaryButtonStyle(theme),
                  marginTop: 16,
                }}
              >
                Start Session
              </button>

              {result.challengeMode && (
                <div
                  style={{
                    ...cardStyle(theme),
                    marginTop: 16,
                    backgroundColor: theme.surfaceMuted,
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  <h4 style={{ marginTop: 0, marginBottom: 8 }}>
                    Challenge Suggestions (Primary Lifts)
                  </h4>

                  {challengeSuggestions.length === 0 ? (
                    <p style={{ ...smallMutedTextStyle(theme), margin: 0 }}>
                      Not enough primary-lift logs yet to generate challenge suggestions.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: 10 }}>
                      {challengeSuggestions.map((suggestion, index) => (
                        <div
                          key={`${suggestion.exerciseName}-${index}`}
                          style={{
                            border: `1px solid ${theme.border}`,
                            borderRadius: 10,
                            padding: 10,
                            backgroundColor: theme.surface,
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>
                            {suggestion.exerciseName}
                          </div>
                          <div style={smallMutedTextStyle(theme)}>
                            {suggestion.throttled
                              ? `Throttle applied after a likely overshoot: try ${suggestion.targetWeight} for ${suggestion.targetReps} to recover momentum.`
                              : `Aggressive target from recent work (${suggestion.evidence}): try about ${suggestion.targetWeight} for ${suggestion.targetReps}.`}
                          </div>
                          <div style={{ ...smallMutedTextStyle(theme), marginTop: 4 }}>
                            Trend: {suggestion.trendPerSessionPct != null
                              ? `${suggestion.trendPerSessionPct >= 0 ? "+" : ""}${suggestion.trendPerSessionPct.toFixed(2)}% est 1RM per session`
                              : "insufficient trend data"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <h4 style={{ marginTop: 16, marginBottom: 8 }}>
                    Accessory Progression Cues
                  </h4>

                  {accessoryProgressionCues.length === 0 ? (
                    <p style={{ ...smallMutedTextStyle(theme), margin: 0 }}>
                      Accessory cues will appear as accessory logs accumulate.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {accessoryProgressionCues.map((cue, index) => (
                        <div key={`${cue.exerciseName}-${index}`}>
                          <div style={{ fontWeight: 600 }}>{cue.exerciseName}</div>
                          <div style={smallMutedTextStyle(theme)}>{cue.cue}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p style={{ marginTop: 16, color: theme.textMuted }}>
              No template found in the database for this workout. Check Template
              Manager.
            </p>
          )}
        </div>
      )}
    </div>
  );
}