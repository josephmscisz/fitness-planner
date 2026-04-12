import { useState } from "react";
import {
  planToday,
  type EnergyLevel,
  type ModePreference,
  type PlanResult,
} from "../planner/planToday";

export default function PlanToday() {
  const [minutes, setMinutes] = useState(30);
  const [energy, setEnergy] = useState<EnergyLevel>("medium");
  const [modePreference, setModePreference] =
    useState<ModePreference>("auto");
  const [sessionsLast7Days, setSessionsLast7Days] = useState(2);
  const [lastWorkout, setLastWorkout] = useState("");
  const [result, setResult] = useState<PlanResult | null>(null);

  function handlePlan() {
    const plan = planToday({
      minutes,
      energy,
      modePreference,
      sessionsLast7Days,
      lastWorkout: lastWorkout || undefined,
    });

    setResult(plan);
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 800 }}>
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
          style={{
            width: 160,
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          Plan Today
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
            <strong>Workout:</strong> {result.workout}
          </p>
          <p>
            <strong>Duration:</strong> {result.duration}
          </p>
          <p>
            <strong>Why:</strong> {result.reason}
          </p>
        </div>
      )}
    </div>
  );
}