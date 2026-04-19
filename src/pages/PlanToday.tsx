import { useEffect, useState } from "react";
import {
  planToday,
  type EnergyLevel,
  type ModePreference,
  type PlanResult,
} from "../planner/planToday";
import {
  computeWhoopAlignment30d,
  getLatestWhoopDailyMetric,
  getMostRecentWorkoutCode,
  getSessionsLast7DaysCount,
  getWhoopConnection,
  getWorkoutTemplateByCodeAndDuration,
  initDb,
  saveWhoopConnection,
  upsertWhoopDailyMetric,
  upsertWhoopWorkout,
} from "../lib/db";
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
import { open } from "@tauri-apps/plugin-shell";
import { getWhoopConnectUrl, syncWhoopFromBackend } from "../lib/whoopClient";

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
  const [whoopSleepPerformance, setWhoopSleepPerformance] = useState<number | null>(null);
  const [whoopAlignmentPercent, setWhoopAlignmentPercent] = useState<number | null>(null);
  const [whoopAlignmentBucket, setWhoopAlignmentBucket] = useState<"low" | "medium" | "high" | null>(null);
  const [syncingWhoop, setSyncingWhoop] = useState(false);
  const [whoopSyncMessage, setWhoopSyncMessage] = useState("");
  const [whoopSyncError, setWhoopSyncError] = useState("");

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

      await loadWhoopStatus();
    }

    loadPlannerDefaults();
  }, []);

  async function handlePlan() {
    setLoading(true);

    try {
      await initDb();

      const basePlan = planToday({
        minutes,
        energy,
        modePreference,
        sessionsLast7Days,
        lastWorkout: lastWorkout || undefined,
      });

      const template = await getWorkoutTemplateByCodeAndDuration(
        basePlan.workoutCode,
        basePlan.duration
      );

      setResult({
        ...basePlan,
        template: template ?? undefined,
      });

      setStarted(false);
    } catch (err) {
      console.error("PLAN LOAD ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadWhoopStatus() {
    const [connection, latestMetric, alignment] = await Promise.all([
      getWhoopConnection(),
      getLatestWhoopDailyMetric(),
      computeWhoopAlignment30d(),
    ]);

    setWhoopConnected(!!connection);
    setWhoopRecovery(latestMetric?.recovery_score ?? null);
    setWhoopSleepPerformance(latestMetric?.sleep_performance ?? null);
    setWhoopAlignmentPercent(alignment.percent);
    setWhoopAlignmentBucket(alignment.latestBucket);
  }

  async function handleConnectWhoop() {
    try {
      await open(getWhoopConnectUrl());
    } catch (err) {
      console.error("WHOOP CONNECT ERROR:", err);
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
        `WHOOP sync complete.${payload.latestMetric ? " Latest recovery/sleep loaded." : ""}${
          payload.workouts?.length ? ` Workouts imported: ${payload.workouts.length}.` : ""
        }`
      );
    } catch (err) {
      console.error("WHOOP SYNC ERROR:", err);
      setWhoopSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingWhoop(false);
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
            onChange={(e) => setModePreference(e.target.value as ModePreference)}
          >
            <option value="auto">Auto</option>
            <option value="chaos">Chaos</option>
            <option value="steady">Steady</option>
          </select>
        </label>

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
            Auto: {autoSessionsLast7Days} session(s) in last 7 days · last workout{" "}
            {autoLastWorkout || "none"}
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
                  onChange={(e) => setSessionsLast7Days(Number(e.target.value))}
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
                  onChange={(e) => setLastWorkout(e.target.value.toUpperCase())}
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
            <div style={{ fontWeight: 600 }}>WHOOP Status</div>

            <div style={{ display: "flex", gap: 8 }}>
              {!whoopConnected && (
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
              )}

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

          <div style={smallMutedTextStyle(theme)}>
            {whoopConnected
              ? "WHOOP connected"
              : "WHOOP not connected yet"}
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
              <div style={{ fontSize: 20, fontWeight: 700 }}>
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
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {whoopSleepPerformance != null ? `${whoopSleepPerformance}%` : "—"}
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
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                {whoopAlignmentPercent != null ? `${whoopAlignmentPercent}%` : "—"}
              </div>
            </div>
          </div>

          <div style={{ ...smallMutedTextStyle(theme), marginTop: 10 }}>
            WHOOP readiness bucket: {whoopAlignmentBucket ?? "—"}

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