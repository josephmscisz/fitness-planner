import { useState, useEffect } from "react";
import {
  completeWorkoutSession,
  createWorkoutSession,
  insertExerciseLog,
  getLastExerciseLog,
} from "../lib/db";
import { getProgressionDecision } from "../planner/progression";
import type { PlanResult } from "../planner/planToday";

type Props = {
  plan: PlanResult;
  onDone: () => void;
};

type ExerciseForm = {
  exerciseName: string;
  plannedSets: string;
  plannedReps: string;
  weight: string;
  actualSets: string;
  actualReps: string;
  notes: string;
  progressionReason: string;
};

export default function SessionLogger({ plan, onDone }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ExerciseForm[]>([]);

  useEffect(() => {
    async function loadWithSuggestions() {
      if (!plan.template) return;

      const newEntries: ExerciseForm[] = [];

      for (const exercise of plan.template.exercises) {
        const lastLog = await getLastExerciseLog(exercise.name);
        const decision = getProgressionDecision(exercise.name, lastLog);

        newEntries.push({
          exerciseName: exercise.name,
          plannedSets: exercise.sets,
          plannedReps: exercise.reps,
          weight: decision.suggestedWeight,
          actualSets: exercise.sets,
          actualReps: exercise.reps,
          notes: exercise.notes ?? "",
          progressionReason: decision.reason,
   });
      }

      setEntries(newEntries);
    }

    loadWithSuggestions();
  }, [plan]);

  function updateEntry(index: number, field: keyof ExerciseForm, value: string) {
    setEntries((current) =>
      current.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      )
    );
  }

  async function handleSaveSession() {
    if (!plan.template) {
      setError("No workout template found.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const sessionId = await createWorkoutSession({
        mode: plan.mode,
        workoutCode: plan.workoutCode,
        duration: plan.duration,
        title: plan.template.title,
        reason: plan.reason,
      });

      for (const entry of entries) {
        await insertExerciseLog({
          sessionId,
          exerciseName: entry.exerciseName,
          plannedSets: entry.plannedSets,
          plannedReps: entry.plannedReps,
          weight: entry.weight,
          actualSets: entry.actualSets,
          actualReps: entry.actualReps,
          notes: entry.notes,
        });
      }

      await completeWorkoutSession(sessionId);
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError(`Failed to save session: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 1000 }}>
      <h1>Log Session</h1>

      <p>
        <strong>{plan.template?.title}</strong>
      </p>
      <p>{plan.reason}</p>

      {error && <p>{error}</p>}
      {saved && <p>Session saved successfully.</p>}

      <table
        border={1}
        cellPadding={8}
        style={{ borderCollapse: "collapse", minWidth: 950, marginTop: 16 }}
      >
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Planned Sets</th>
            <th>Planned Reps</th>
            <th>Weight</th>
            <th>Actual Sets</th>
            <th>Actual Reps</th>
            <th>Notes</th>
            <th>Suggestion</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.exerciseName}-${index}`}>
              <td>{entry.exerciseName}</td>
              <td>{entry.plannedSets}</td>
              <td>{entry.plannedReps}</td>
              <td>
                <input
                  value={entry.weight}
                  onChange={(e) => updateEntry(index, "weight", e.target.value)}
                />
              </td>
              <td>
                <input
                  value={entry.actualSets}
                  onChange={(e) => updateEntry(index, "actualSets", e.target.value)}
                />
              </td>
              <td>
                <input
                  value={entry.actualReps}
                  onChange={(e) => updateEntry(index, "actualReps", e.target.value)}
                />
              </td>
              <td>
                <input
                  value={entry.notes}
                  onChange={(e) => updateEntry(index, "notes", e.target.value)}
                />
              </td>
              <td>{entry.progressionReason}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={handleSaveSession} disabled={saving || saved}>
          {saving ? "Saving..." : "Save Session"}
        </button>

        <button onClick={onDone}>Back to Planner</button>
      </div>
    </div>
  );
}