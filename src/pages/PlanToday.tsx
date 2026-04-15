import { useEffect, useState } from "react";
import {
  planToday,
  type EnergyLevel,
  type ModePreference,
  type PlanResult,
} from "../planner/planToday";
import {
  getMostRecentWorkoutCode,
  getSessionsLast7DaysCount,
  getWorkoutTemplateByCodeAndDuration,
  initDb,
} from "../lib/db";
import SessionLogger from "./SessionLogger";

function getRotationBadgeStyle(reason?: string) {
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
      backgroundColor: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fca5a5",
    };
  }

  if (text.includes("recently avoided")) {
    return {
      ...base,
      backgroundColor: "#dbeafe",
      color: "#1d4ed8",
      border: "1px solid #93c5fd",
    };
  }

  return {
    ...base,
    backgroundColor: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
  };
}

function getRotationBadgeLabel(reason?: string) {
  const text = (reason ?? "").toLowerCase();

  if (text.includes("fallback used")) return "Fallback Used";
  if (text.includes("recently avoided")) return "Recently Avoided";
  return "Rotated";
}

export default function PlanToday() {
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

  function resetOverridesToAuto() {
    setSessionsLast7Days(autoSessionsLast7Days);
    setLastWorkout(autoLastWorkout);
    setOverrideHistoryInputs(false);
  }

  if (started && result) {
    return <SessionLogger plan={result} onDone={() => setStarted(false)} />;
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 950 }}>
      <h1>Plan Today</h1>
      <p>
        Choose your available time and current situation, then get a recommended
        workout.
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
        <label>
          <div style={{ marginBottom: 6 }}>Minutes available</div>
          <select
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
          <div style={{ marginBottom: 6 }}>Energy</div>
          <select
            value={energy}
            onChange={(e) => setEnergy(e.target.value as EnergyLevel)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Mode preference</div>
          <select
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
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 14,
            backgroundColor: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Training history defaults
          </div>

          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
            Autofilled from your saved sessions. Turn on override if you want to
            change them manually for today.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <div
              style={{
                padding: "6px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 999,
                fontSize: 12,
                color: "#374151",
                backgroundColor: "white",
              }}
            >
              Auto sessions last 7 days: {autoSessionsLast7Days}
            </div>

            <div
              style={{
                padding: "6px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 999,
                fontSize: 12,
                color: "#374151",
                backgroundColor: "white",
              }}
            >
              Auto last workout: {autoLastWorkout || "None"}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
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

          <div style={{ display: "grid", gap: 12 }}>
            <label>
              <div style={{ marginBottom: 6 }}>Sessions in the last 7 days</div>
              <input
                type="number"
                min={0}
                max={14}
                disabled={!overrideHistoryInputs}
                value={sessionsLast7Days}
                onChange={(e) => setSessionsLast7Days(Number(e.target.value))}
              />
            </label>

            <label>
              <div style={{ marginBottom: 6 }}>Last workout</div>
              <input
                type="text"
                disabled={!overrideHistoryInputs}
                placeholder="Examples: A, B, C, LOWER1, PUSH, LOWER2, PULL"
                value={lastWorkout}
                onChange={(e) => setLastWorkout(e.target.value.toUpperCase())}
              />
            </label>
          </div>

          {overrideHistoryInputs && (
            <div style={{ marginTop: 12 }}>
              <button type="button" onClick={resetOverridesToAuto}>
                Reset to Autofill
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handlePlan}
          disabled={loading}
          style={{
            width: 160,
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          {loading ? "Loading..." : "Plan Today"}
        </button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        >
          <h2>Recommendation</h2>
          <p>
            <strong>Mode:</strong> {result.mode}
          </p>
          <p>
            <strong>Workout Code:</strong> {result.workoutCode}
          </p>
          <p>
            <strong>Duration:</strong> {result.duration}
          </p>
          <p>
            <strong>Why:</strong> {result.reason}
          </p>

          {result.template ? (
            <div style={{ marginTop: 20 }}>
              <h3>{result.template.title}</h3>
              <p>
                <strong>Focus:</strong> {result.template.focus}
              </p>

              <table
                border={1}
                cellPadding={8}
                style={{ borderCollapse: "collapse", minWidth: 760, marginTop: 12 }}
              >
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th>Sets</th>
                    <th>Reps</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {result.template.exercises.map((exercise, index) => (
                    <tr key={`${exercise.exercise_name}-${index}`}>
                      <td>
                        <div>{exercise.exercise_name}</div>

                        {exercise.was_rotated && (
                          <div style={{ marginTop: 4 }}>
                            <div style={getRotationBadgeStyle(exercise.rotation_reason)}>
                              {getRotationBadgeLabel(exercise.rotation_reason)}
                            </div>

                            <div style={{ fontSize: 12, color: "#2563eb", marginTop: 4 }}>
                              Rotated from slot: {exercise.accessory_slot}
                            </div>

                            {exercise.rotation_reason && (
                              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                                {exercise.rotation_reason}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>{exercise.sets}</td>
                      <td>{exercise.reps}</td>
                      <td>{exercise.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={() => setStarted(true)}
                style={{ marginTop: 16 }}
              >
                Start Session
              </button>
            </div>
          ) : (
            <p style={{ marginTop: 16 }}>
              No template found in the database for this workout. Check Template
              Manager.
            </p>
          )}
        </div>
      )}
    </div>
  );
}