import { useState } from "react";
import {
  planToday,
  type EnergyLevel,
  type ModePreference,
  type PlanResult,
} from "../planner/planToday";
import { getWorkoutTemplateByCodeAndDuration, initDb } from "../lib/db";
import SessionLogger from "./SessionLogger";

export default function PlanToday() {
  const [minutes, setMinutes] = useState(30);
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [modePreference, setModePreference] =
    useState<ModePreference>("auto");
  const [sessionsLast7Days, setSessionsLast7Days] = useState(2);
  const [lastWorkout, setLastWorkout] = useState("");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);

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

  if (started && result) {
    return <SessionLogger plan={result} onDone={() => setStarted(false)} />;
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 900 }}>
      <h1>Plan Today</h1>
      <p>Choose your available time and current situation, then get a recommended workout.</p>

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

        <label>
          <div style={{ marginBottom: 6 }}>Sessions in the last 7 days</div>
          <input
            type="number"
            min={0}
            max={14}
            value={sessionsLast7Days}
            onChange={(e) => setSessionsLast7Days(Number(e.target.value))}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Last workout</div>
          <input
            type="text"
            placeholder="Examples: A, B, C, LOWER1, PUSH, LOWER2, PULL"
            value={lastWorkout}
            onChange={(e) => setLastWorkout(e.target.value.toUpperCase())}
          />
        </label>

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
          <p><strong>Mode:</strong> {result.mode}</p>
          <p><strong>Workout Code:</strong> {result.workoutCode}</p>
          <p><strong>Duration:</strong> {result.duration}</p>
          <p><strong>Why:</strong> {result.reason}</p>

          {result.template ? (
            <div style={{ marginTop: 20 }}>
              <h3>{result.template.title}</h3>
              <p><strong>Focus:</strong> {result.template.focus}</p>

              <table
                border={1}
                cellPadding={8}
                style={{ borderCollapse: "collapse", minWidth: 700, marginTop: 12 }}
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
                      <td>{exercise.exercise_name}</td>
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
              No template found in the database for this workout. Check Template Manager.
            </p>
          )}
        </div>
      )}
    </div>
  );
}