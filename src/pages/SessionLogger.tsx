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

type ExerciseStatus = "completed" | "partial" | "skipped";

type ExerciseForm = {
  exerciseName: string;
  plannedSets: string;
  plannedReps: string;
  weight: string;
  actualSets: string;
  actualReps: string;
  notes: string;
  progressionReason: string;
  progressionOutcome: "increase" | "hold" | "decrease" | "none";
  lastWeight: string;
  lastActualSets: string;
  lastActualReps: string;
  lastNotes: string;
  status: ExerciseStatus;
};

function getBadgeStyle(outcome: ExerciseForm["progressionOutcome"]) {
  const base = {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600 as const,
    marginBottom: 6,
  };

  switch (outcome) {
    case "increase":
      return {
        ...base,
        backgroundColor: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    case "hold":
      return {
        ...base,
        backgroundColor: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fcd34d",
      };
    case "decrease":
      return {
        ...base,
        backgroundColor: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fca5a5",
      };
    default:
      return {
        ...base,
        backgroundColor: "#e5e7eb",
        color: "#374151",
        border: "1px solid #d1d5db",
      };
    }
}

function getBadgeLabel(outcome: ExerciseForm["progressionOutcome"]) {
  switch (outcome) {
    case "increase":
      return "Increase";
    case "hold":
      return "Hold";
    case "decrease":
      return "Decrease";
    default:
      return "No Data";
  }
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

const smallMutedText: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  lineHeight: 1.45,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 4,
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function StatusToggle({
  status,
  onChange,
}: {
  status: ExerciseStatus;
  onChange: (status: ExerciseStatus) => void;
}) {
  const buttonBase: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={() => onChange("completed")}
        style={{
          ...buttonBase,
          border: status === "completed" ? "1px solid #86efac" : "1px solid #d1d5db",
          backgroundColor: status === "completed" ? "#dcfce7" : "white",
          color: status === "completed" ? "#166534" : "#374151",
        }}
      >
        Completed
      </button>

      <button
        type="button"
        onClick={() => onChange("partial")}
        style={{
          ...buttonBase,
          border: status === "partial" ? "1px solid #93c5fd" : "1px solid #d1d5db",
          backgroundColor: status === "partial" ? "#dbeafe" : "white",
          color: status === "partial" ? "#1d4ed8" : "#374151",
        }}
      >
        Partial
      </button>

      <button
        type="button"
        onClick={() => onChange("skipped")}
        style={{
          ...buttonBase,
          border: status === "skipped" ? "1px solid #fca5a5" : "1px solid #d1d5db",
          backgroundColor: status === "skipped" ? "#fee2e2" : "white",
          color: status === "skipped" ? "#991b1b" : "#374151",
        }}
      >
        Skipped
      </button>
    </div>
  );
}

export default function SessionLogger({ plan, onDone }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ExerciseForm[]>([]);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1100);

  useEffect(() => {
    function handleResize() {
      setIsCompact(window.innerWidth < 1100);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
          actualSets: "",
          actualReps: "",
          notes: "",
          progressionReason: decision.reason,
          progressionOutcome: decision.outcome,
          lastWeight: lastLog?.weight ?? "",
          lastActualSets: lastLog?.actual_sets ?? "",
          lastActualReps: lastLog?.actual_reps ?? "",
          lastNotes: lastLog?.notes ?? "",
          status: "completed",
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

  function updateStatus(index: number, status: ExerciseStatus) {
    setEntries((current) =>
      current.map((entry, i) =>
        i === index ? { ...entry, status } : entry
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
        if (entry.status === "skipped") {
          continue;
        }

        const statusNote =
          entry.status === "partial"
            ? entry.notes
              ? `[PARTIAL] ${entry.notes}`
              : "[PARTIAL]"
            : entry.notes;

        await insertExerciseLog({
          sessionId,
          exerciseName: entry.exerciseName,
          plannedSets: entry.plannedSets,
          plannedReps: entry.plannedReps,
          weight: entry.weight,
          actualSets: entry.actualSets,
          actualReps: entry.actualReps,
          notes: statusNote,
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

  function renderLastSession(entry: ExerciseForm) {
    return entry.lastWeight || entry.lastActualSets || entry.lastActualReps || entry.lastNotes ? (
      <div style={smallMutedText}>
        <div><strong>Weight:</strong> {entry.lastWeight || "-"}</div>
        <div><strong>Sets:</strong> {entry.lastActualSets || "-"}</div>
        <div><strong>Reps:</strong> {entry.lastActualReps || "-"}</div>
        <div><strong>Notes:</strong> {entry.lastNotes || "-"}</div>
      </div>
    ) : (
      <span style={smallMutedText}>No prior log</span>
    );
  }

  function renderProgression(entry: ExerciseForm) {
    return (
      <div>
        <div style={getBadgeStyle(entry.progressionOutcome)}>
          {getBadgeLabel(entry.progressionOutcome)}
        </div>
        <div style={smallMutedText}>{entry.progressionReason}</div>
      </div>
    );
  }

  const completedCount = entries.filter((entry) => entry.status === "completed").length;
  const partialCount = entries.filter((entry) => entry.status === "partial").length;
  const skippedCount = entries.filter((entry) => entry.status === "skipped").length;
  const totalCount = entries.length;

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 1280, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Log Session</h1>

      <div
        style={{
          marginBottom: 20,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          backgroundColor: "#fafafa",
        }}
      >
        <p style={{ margin: "0 0 6px 0" }}>
          <strong>{plan.template?.title}</strong>
        </p>
        <p style={{ margin: 0, color: "#4b5563" }}>{plan.reason}</p>
      </div>

      {error && <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>}
      {saved && <p style={{ color: "#166534", marginBottom: 12 }}>Session saved successfully.</p>}

      {!isCompact ? (
        <div style={{ overflowX: "auto" }}>
          <table
            cellPadding={10}
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: 1400,
              border: "1px solid #e5e7eb",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Exercise</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Plan</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Suggested Weight</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Actual Sets</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Actual Reps</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Notes</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Last Session</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Progression</th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry, index) => {
                const isSkipped = entry.status === "skipped";
                const isPartial = entry.status === "partial";

                return (
                  <tr
                    key={`${entry.exerciseName}-${index}`}
                    style={{
                      opacity: isSkipped ? 0.6 : 1,
                      backgroundColor: isSkipped
                        ? "#fafafa"
                        : isPartial
                        ? "#eff6ff"
                        : "white",
                    }}
                  >
                    <td style={{ borderBottom: "1px solid #f1f5f9", fontWeight: 600 }}>
                      {entry.exerciseName}
                    </td>

                    <td style={{ borderBottom: "1px solid #f1f5f9", minWidth: 190 }}>
                      <StatusToggle
                        status={entry.status}
                        onChange={(status) => updateStatus(index, status)}
                      />
                    </td>

                    <td style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <div>{entry.plannedSets} sets</div>
                      <div style={smallMutedText}>{entry.plannedReps} reps</div>
                    </td>

                    <td style={{ borderBottom: "1px solid #f1f5f9", minWidth: 130 }}>
                      <input
                        style={inputStyle}
                        disabled={isSkipped}
                        value={entry.weight}
                        onChange={(e) => updateEntry(index, "weight", e.target.value)}
                      />
                    </td>

                    <td style={{ borderBottom: "1px solid #f1f5f9", minWidth: 120 }}>
                      <input
                        style={inputStyle}
                        disabled={isSkipped}
                        placeholder={entry.plannedSets}
                        value={entry.actualSets}
                        onChange={(e) => updateEntry(index, "actualSets", e.target.value)}
                      />
                    </td>

                    <td style={{ borderBottom: "1px solid #f1f5f9", minWidth: 150 }}>
                      <input
                        style={inputStyle}
                        disabled={isSkipped}
                        placeholder={entry.plannedReps}
                        value={entry.actualReps}
                        onChange={(e) => updateEntry(index, "actualReps", e.target.value)}
                      />
                    </td>

                    <td style={{ borderBottom: "1px solid #f1f5f9", minWidth: 180 }}>
                      <input
                        style={inputStyle}
                        disabled={isSkipped}
                        placeholder={isPartial ? "what was modified?" : "optional notes"}
                        value={entry.notes}
                        onChange={(e) => updateEntry(index, "notes", e.target.value)}
                      />
                    </td>

                    <td style={{ borderBottom: "1px solid #f1f5f9", minWidth: 220 }}>
                      {renderLastSession(entry)}
                    </td>

                    <td style={{ borderBottom: "1px solid #f1f5f9", minWidth: 260, verticalAlign: "top" }}>
                      {renderProgression(entry)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {entries.map((entry, index) => {
            const isSkipped = entry.status === "skipped";
            const isPartial = entry.status === "partial";

            return (
              <div
                key={`${entry.exerciseName}-${index}`}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  backgroundColor: isSkipped
                    ? "#fafafa"
                    : isPartial
                    ? "#eff6ff"
                    : "white",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  opacity: isSkipped ? 0.7 : 1,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{entry.exerciseName}</div>
                  <div style={smallMutedText}>
                    Plan: {entry.plannedSets} sets · {entry.plannedReps} reps
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Field label="Status">
                    <StatusToggle
                      status={entry.status}
                      onChange={(status) => updateStatus(index, status)}
                    />
                  </Field>
                </div>

                <div style={{ marginBottom: 12 }}>
                  {renderProgression(entry)}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <Field label="Suggested Weight">
                    <input
                      style={inputStyle}
                      disabled={isSkipped}
                      value={entry.weight}
                      onChange={(e) => updateEntry(index, "weight", e.target.value)}
                    />
                  </Field>

                  <Field label="Actual Sets">
                    <input
                      style={inputStyle}
                      disabled={isSkipped}
                      placeholder={entry.plannedSets}
                      value={entry.actualSets}
                      onChange={(e) => updateEntry(index, "actualSets", e.target.value)}
                    />
                  </Field>

                  <Field label="Actual Reps">
                    <input
                      style={inputStyle}
                      disabled={isSkipped}
                      placeholder={entry.plannedReps}
                      value={entry.actualReps}
                      onChange={(e) => updateEntry(index, "actualReps", e.target.value)}
                    />
                  </Field>

                  <Field label="Notes">
                    <input
                      style={inputStyle}
                      disabled={isSkipped}
                      placeholder={isPartial ? "what was modified?" : "optional notes"}
                      value={entry.notes}
                      onChange={(e) => updateEntry(index, "notes", e.target.value)}
                    />
                  </Field>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 12,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ ...labelStyle, marginBottom: 6 }}>Last Session</div>
                  {renderLastSession(entry)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          backgroundColor: "#f8fafc",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Session Summary</div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              backgroundColor: "#dcfce7",
              color: "#166534",
              border: "1px solid #86efac",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Completed: {completedCount}
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              backgroundColor: "#dbeafe",
              color: "#1d4ed8",
              border: "1px solid #93c5fd",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Partial: {partialCount}
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Skipped: {skippedCount}
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              backgroundColor: "#e5e7eb",
              color: "#374151",
              border: "1px solid #d1d5db",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Total Planned: {totalCount}
          </div>
        </div>

        {skippedCount === totalCount && totalCount > 0 && (
          <div style={{ fontSize: 12, color: "#991b1b" }}>
            Everything is marked skipped. Saving is disabled until at least one exercise is completed or partial.
          </div>
        )}

        {partialCount > 0 && (
          <div style={{ fontSize: 12, color: "#1d4ed8" }}>
            Partial exercises will be saved with a partial note so you can review them later.
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <button
          onClick={handleSaveSession}
          disabled={saving || saved || (totalCount > 0 && skippedCount === totalCount)}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            backgroundColor: "#111827",
            color: "white",
            cursor: "pointer",
            opacity: saving || saved || (totalCount > 0 && skippedCount === totalCount) ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Session"}
        </button>

        <button
          onClick={onDone}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            backgroundColor: "white",
            cursor: "pointer",
          }}
        >
          Back to Planner
        </button>
      </div>
    </div>
  );
}