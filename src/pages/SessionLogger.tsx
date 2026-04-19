import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import {
  completeWorkoutSession,
  createWorkoutSession,
  getDistinctExerciseCategories,
  getDistinctExerciseEquipment,
  getExercisesFiltered,
  getLastExerciseLog,
  insertExerciseLog,
  matchWhoopWorkoutToSession,
  type ExerciseRecord,
} from "../lib/db";
import { getProgressionDecision } from "../planner/progression";
import type { PlanResult } from "../planner/planToday";
import type { AppTheme } from "../theme";
import {
  cardStyle,
  inputStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  smallMutedTextStyle,
  tableCellStyle,
  tableHeaderStyle,
} from "../themeStyles";

type Props = {
  plan: PlanResult;
  onDone: () => void;
  theme: AppTheme;
  whoopRecovery: number | null;
  whoopSleepPerformance: number | null;
  whoopAlignmentBucket: "low" | "medium" | "high" | null;
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
  tutorialUrl: string;
};

function getBadgeStyle(theme: AppTheme, outcome: ExerciseForm["progressionOutcome"]) {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    border: `1px solid ${theme.borderStrong}`,
  };

  switch (outcome) {
    case "increase":
      return { ...base, backgroundColor: theme.successBg, color: theme.successText };
    case "hold":
      return { ...base, backgroundColor: theme.warningBg, color: theme.warningText };
    case "decrease":
      return { ...base, backgroundColor: theme.dangerBg, color: theme.dangerText };
    default:
      return { ...base, backgroundColor: theme.surfaceElevated, color: theme.textMuted };
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

const labelStyle = (theme: AppTheme): React.CSSProperties => ({
  fontSize: 12,
  color: theme.textSoft,
  marginBottom: 4,
});

function Field({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: AppTheme;
}) {
  return (
    <div>
      <div style={labelStyle(theme)}>{label}</div>
      {children}
    </div>
  );
}

function StatusToggle({
  status,
  onChange,
  theme,
}: {
  status: ExerciseStatus;
  onChange: (status: ExerciseStatus) => void;
  theme: AppTheme;
}) {
  const buttonBase: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${theme.borderStrong}`,
    backgroundColor: theme.surfaceElevated,
    color: theme.text,
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={() => onChange("completed")}
        style={{
          ...buttonBase,
          backgroundColor: status === "completed" ? theme.successBg : theme.surfaceElevated,
          color: status === "completed" ? theme.successText : theme.text,
        }}
      >
        Completed
      </button>

      <button
        type="button"
        onClick={() => onChange("partial")}
        style={{
          ...buttonBase,
          backgroundColor: status === "partial" ? theme.accentSoft : theme.surfaceElevated,
          color: status === "partial" ? theme.accent : theme.text,
        }}
      >
        Partial
      </button>

      <button
        type="button"
        onClick={() => onChange("skipped")}
        style={{
          ...buttonBase,
          backgroundColor: status === "skipped" ? theme.dangerBg : theme.surfaceElevated,
          color: status === "skipped" ? theme.dangerText : theme.text,
        }}
      >
        Skipped
      </button>
    </div>
  );
}

export default function SessionLogger({
  plan,
  onDone,
  theme,
  whoopRecovery,
  whoopSleepPerformance,
  whoopAlignmentBucket,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ExerciseForm[]>([]);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1100);

  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseCategory, setExerciseCategory] = useState("");
  const [exerciseEquipment, setExerciseEquipment] = useState("");
  const [availableExercises, setAvailableExercises] = useState<ExerciseRecord[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);

  useEffect(() => {
    function handleResize() {
      setIsCompact(window.innerWidth < 1100);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function loadFilterOptions() {
      const categories = await getDistinctExerciseCategories();
      const equipment = await getDistinctExerciseEquipment();
      setAvailableCategories(categories);
      setAvailableEquipment(equipment);
    }

    loadFilterOptions();
  }, []);

  useEffect(() => {
    async function loadWithSuggestions() {
      if (!plan.template) return;

      const newEntries: ExerciseForm[] = [];

      for (const exercise of plan.template.exercises) {
        const lastLog = await getLastExerciseLog(exercise.exercise_name);
        const decision = getProgressionDecision(exercise.exercise_name, lastLog);

        newEntries.push({
          exerciseName: exercise.exercise_name,
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
          tutorialUrl: exercise.tutorial_url ?? "",
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

  async function searchExercisesForAdd() {
    const rows = await getExercisesFiltered({
      category: exerciseCategory || undefined,
      equipment: exerciseEquipment || undefined,
      search: exerciseSearch || undefined,
    });

    setAvailableExercises(rows);
  }

  async function addExerciseToSession(exercise: ExerciseRecord) {
    const lastLog = await getLastExerciseLog(exercise.name);
    const decision = getProgressionDecision(exercise.name, lastLog);

    const newEntry: ExerciseForm = {
      exerciseName: exercise.name,
      plannedSets: "",
      plannedReps: "",
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
      tutorialUrl: exercise.tutorial_url ?? "",
    };

    setEntries((current) => [...current, newEntry]);
    setShowAddExercise(false);
    setAvailableExercises([]);
    setExerciseSearch("");
    setExerciseCategory("");
    setExerciseEquipment("");
  }

  async function handleSaveSession() {
    if (!plan.template) {
      setError("No workout template found.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const startedAt = new Date().toISOString();
      const matchedWhoopWorkoutId = await matchWhoopWorkoutToSession(startedAt, 4);

      const sessionId = await createWorkoutSession({
        mode: plan.mode,
        workoutCode: plan.workoutCode,
        duration: plan.duration,
        title: plan.template.title,
        reason: plan.reason,
        selectedEnergy: plan.selectedEnergy ?? "",
        whoopRecoveryScore: whoopRecovery,
        whoopSleepPerformance: whoopSleepPerformance,
        whoopAlignmentBucket: whoopAlignmentBucket,
        matchedWhoopWorkoutId,
      });

      for (const entry of entries) {
        if (entry.status === "skipped") continue;

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
      <div style={smallMutedTextStyle(theme)}>
        <div><strong>Weight:</strong> {entry.lastWeight || "-"}</div>
        <div><strong>Sets:</strong> {entry.lastActualSets || "-"}</div>
        <div><strong>Reps:</strong> {entry.lastActualReps || "-"}</div>
        <div><strong>Notes:</strong> {entry.lastNotes || "-"}</div>
      </div>
    ) : (
      <span style={smallMutedTextStyle(theme)}>No prior log</span>
    );
  }

  function renderProgression(entry: ExerciseForm) {
    return (
      <div>
        <div style={getBadgeStyle(theme, entry.progressionOutcome)}>
          {getBadgeLabel(entry.progressionOutcome)}
        </div>
        <div style={smallMutedTextStyle(theme)}>{entry.progressionReason}</div>
      </div>
    );
  }

  const completedCount = entries.filter((entry) => entry.status === "completed").length;
  const partialCount = entries.filter((entry) => entry.status === "partial").length;
  const skippedCount = entries.filter((entry) => entry.status === "skipped").length;
  const totalCount = entries.length;

  return (
    <div style={pageStyle(theme)}>
      <h1 style={{ marginBottom: 8 }}>Log Session</h1>

      <div style={{ ...cardStyle(theme), marginBottom: 20, padding: 16, backgroundColor: theme.surface }}>
        <p style={{ margin: "0 0 6px 0" }}>
          <strong>{plan.template?.title}</strong>
        </p>
        <p style={{ margin: 0, color: theme.textMuted }}>{plan.reason}</p>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          <div
            style={{
              backgroundColor: theme.surfaceElevated,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 12,
            }}
          >
            Energy: <strong>{plan.selectedEnergy ?? "—"}</strong>
          </div>

          <div
            style={{
              backgroundColor: theme.surfaceElevated,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 12,
            }}
          >
            WHOOP Recovery: <strong>{whoopRecovery ?? "—"}</strong>
          </div>

          <div
            style={{
              backgroundColor: theme.surfaceElevated,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: 12,
            }}
          >
            WHOOP Sleep: <strong>{whoopSleepPerformance != null ? `${whoopSleepPerformance}%` : "—"}</strong>
          </div>
        </div>
      </div>

      {error && <p style={{ color: theme.dangerText, marginBottom: 12 }}>{error}</p>}
      {saved && <p style={{ color: theme.successText, marginBottom: 12 }}>Session saved successfully.</p>}

      {!isCompact ? (
        <div style={{ ...cardStyle(theme), overflowX: "auto", backgroundColor: theme.surface }}>
          <table cellPadding={10} style={{ borderCollapse: "collapse", width: "100%", minWidth: 1500 }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle(theme)}>Exercise</th>
                <th style={tableHeaderStyle(theme)}>Tutorial</th>
                <th style={tableHeaderStyle(theme)}>Status</th>
                <th style={tableHeaderStyle(theme)}>Plan</th>
                <th style={tableHeaderStyle(theme)}>Suggested Weight</th>
                <th style={tableHeaderStyle(theme)}>Actual Sets</th>
                <th style={tableHeaderStyle(theme)}>Actual Reps</th>
                <th style={tableHeaderStyle(theme)}>Notes</th>
                <th style={tableHeaderStyle(theme)}>Last Session</th>
                <th style={tableHeaderStyle(theme)}>Progression</th>
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
                        ? theme.surfaceMuted
                        : isPartial
                        ? theme.accentSoft
                        : theme.surface,
                    }}
                  >
                    <td style={tableCellStyle(theme)}><strong>{entry.exerciseName}</strong></td>

                    <td style={tableCellStyle(theme)}>
                      {entry.tutorialUrl ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await open(entry.tutorialUrl);
                            } catch (err) {
                              console.error("TUTORIAL OPEN ERROR:", err);
                            }
                          }}
                          style={{ ...secondaryButtonStyle(theme), padding: "6px 10px", fontSize: 14 }}
                          title="Open tutorial"
                        >
                          📺
                        </button>
                      ) : (
                        <span style={smallMutedTextStyle(theme)}>—</span>
                      )}
                    </td>

                    <td style={tableCellStyle(theme)}>
                      <StatusToggle status={entry.status} onChange={(status) => updateStatus(index, status)} theme={theme} />
                    </td>

                    <td style={tableCellStyle(theme)}>
                      <div>{entry.plannedSets} sets</div>
                      <div style={smallMutedTextStyle(theme)}>{entry.plannedReps} reps</div>
                    </td>

                    <td style={tableCellStyle(theme)}>
                      <input
                        style={inputStyle(theme)}
                        disabled={isSkipped}
                        value={entry.weight}
                        onChange={(e) => updateEntry(index, "weight", e.target.value)}
                      />
                    </td>

                    <td style={tableCellStyle(theme)}>
                      <input
                        style={inputStyle(theme)}
                        disabled={isSkipped}
                        placeholder={entry.plannedSets}
                        value={entry.actualSets}
                        onChange={(e) => updateEntry(index, "actualSets", e.target.value)}
                      />
                    </td>

                    <td style={tableCellStyle(theme)}>
                      <input
                        style={inputStyle(theme)}
                        disabled={isSkipped}
                        placeholder={entry.plannedReps}
                        value={entry.actualReps}
                        onChange={(e) => updateEntry(index, "actualReps", e.target.value)}
                      />
                    </td>

                    <td style={tableCellStyle(theme)}>
                      <input
                        style={inputStyle(theme)}
                        disabled={isSkipped}
                        placeholder={isPartial ? "what was modified?" : "optional notes"}
                        value={entry.notes}
                        onChange={(e) => updateEntry(index, "notes", e.target.value)}
                      />
                    </td>

                    <td style={tableCellStyle(theme)}>{renderLastSession(entry)}</td>
                    <td style={tableCellStyle(theme)}>{renderProgression(entry)}</td>
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
                  ...cardStyle(theme),
                  padding: 16,
                  backgroundColor: isSkipped
                    ? theme.surfaceMuted
                    : isPartial
                    ? theme.accentSoft
                    : theme.surface,
                  opacity: isSkipped ? 0.7 : 1,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{entry.exerciseName}</div>

                    {entry.tutorialUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await open(entry.tutorialUrl);
                          } catch (err) {
                            console.error("TUTORIAL OPEN ERROR:", err);
                          }
                        }}
                        style={{ ...secondaryButtonStyle(theme), padding: "6px 10px", fontSize: 14 }}
                        title="Open tutorial"
                      >
                        📺
                      </button>
                    )}
                  </div>

                  <div style={smallMutedTextStyle(theme)}>
                    Plan: {entry.plannedSets} sets · {entry.plannedReps} reps
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Field label="Status" theme={theme}>
                    <StatusToggle status={entry.status} onChange={(status) => updateStatus(index, status)} theme={theme} />
                  </Field>
                </div>

                <div style={{ marginBottom: 12 }}>{renderProgression(entry)}</div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <Field label="Suggested Weight" theme={theme}>
                    <input
                      style={inputStyle(theme)}
                      disabled={isSkipped}
                      value={entry.weight}
                      onChange={(e) => updateEntry(index, "weight", e.target.value)}
                    />
                  </Field>

                  <Field label="Actual Sets" theme={theme}>
                    <input
                      style={inputStyle(theme)}
                      disabled={isSkipped}
                      placeholder={entry.plannedSets}
                      value={entry.actualSets}
                      onChange={(e) => updateEntry(index, "actualSets", e.target.value)}
                    />
                  </Field>

                  <Field label="Actual Reps" theme={theme}>
                    <input
                      style={inputStyle(theme)}
                      disabled={isSkipped}
                      placeholder={entry.plannedReps}
                      value={entry.actualReps}
                      onChange={(e) => updateEntry(index, "actualReps", e.target.value)}
                    />
                  </Field>

                  <Field label="Notes" theme={theme}>
                    <input
                      style={inputStyle(theme)}
                      disabled={isSkipped}
                      placeholder={isPartial ? "what was modified?" : "optional notes"}
                      value={entry.notes}
                      onChange={(e) => updateEntry(index, "notes", e.target.value)}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 8, paddingTop: 12, borderTop: `1px solid ${theme.border}` }}>
                  <div style={{ ...labelStyle(theme), marginBottom: 6 }}>Last Session</div>
                  {renderLastSession(entry)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button type="button" onClick={() => setShowAddExercise((v) => !v)} style={secondaryButtonStyle(theme)}>
          {showAddExercise ? "Close Add Exercise" : "Add Exercise"}
        </button>
      </div>

      {showAddExercise && (
        <div style={{ ...cardStyle(theme), marginTop: 16, padding: 16, backgroundColor: theme.surface }}>
          <h3 style={{ marginTop: 0 }}>Add Exercise</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr auto",
              gap: 12,
              alignItems: "end",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={labelStyle(theme)}>Search</div>
              <input
                style={inputStyle(theme)}
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                placeholder="Exercise name"
              />
            </div>

            <div>
              <div style={labelStyle(theme)}>Category</div>
              <select style={inputStyle(theme)} value={exerciseCategory} onChange={(e) => setExerciseCategory(e.target.value)}>
                <option value="">All</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <div style={labelStyle(theme)}>Equipment</div>
              <select style={inputStyle(theme)} value={exerciseEquipment} onChange={(e) => setExerciseEquipment(e.target.value)}>
                <option value="">All</option>
                {availableEquipment.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <button type="button" onClick={searchExercisesForAdd} style={primaryButtonStyle(theme)}>
              Search
            </button>
          </div>

          {availableExercises.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {availableExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  style={{
                    ...cardStyle(theme),
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 12,
                    backgroundColor: theme.surfaceElevated,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{exercise.name}</div>
                    <div style={smallMutedTextStyle(theme)}>
                      {exercise.category}
                      {exercise.equipment ? ` · ${exercise.equipment}` : ""}
                    </div>
                  </div>

                  <button type="button" onClick={() => addExerciseToSession(exercise)} style={secondaryButtonStyle(theme)}>
                    Add
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={smallMutedTextStyle(theme)}>Run a search to choose an exercise.</div>
          )}
        </div>
      )}

      <div style={{ ...cardStyle(theme), marginTop: 20, padding: 16, backgroundColor: theme.surface }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Session Summary</div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ padding: "6px 10px", borderRadius: 999, backgroundColor: theme.successBg, color: theme.successText, border: `1px solid ${theme.borderStrong}`, fontSize: 12, fontWeight: 600 }}>
            Completed: {completedCount}
          </div>

          <div style={{ padding: "6px 10px", borderRadius: 999, backgroundColor: theme.accentSoft, color: theme.accent, border: `1px solid ${theme.borderStrong}`, fontSize: 12, fontWeight: 600 }}>
            Partial: {partialCount}
          </div>

          <div style={{ padding: "6px 10px", borderRadius: 999, backgroundColor: theme.dangerBg, color: theme.dangerText, border: `1px solid ${theme.borderStrong}`, fontSize: 12, fontWeight: 600 }}>
            Skipped: {skippedCount}
          </div>

          <div style={{ padding: "6px 10px", borderRadius: 999, backgroundColor: theme.surfaceElevated, color: theme.textMuted, border: `1px solid ${theme.borderStrong}`, fontSize: 12, fontWeight: 600 }}>
            Total Planned: {totalCount}
          </div>
        </div>

        {skippedCount === totalCount && totalCount > 0 && (
          <div style={{ fontSize: 12, color: theme.dangerText }}>
            Everything is marked skipped. Saving is disabled until at least one exercise is completed or partial.
          </div>
        )}

        {partialCount > 0 && (
          <div style={{ fontSize: 12, color: theme.accent }}>
            Partial exercises will be saved with a partial note so you can review them later.
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
        <button
          onClick={handleSaveSession}
          disabled={saving || saved || (totalCount > 0 && skippedCount === totalCount)}
          style={{
            ...primaryButtonStyle(theme),
            opacity: saving || saved || (totalCount > 0 && skippedCount === totalCount) ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Session"}
        </button>

        <button onClick={onDone} style={secondaryButtonStyle(theme)}>
          Back to Planner
        </button>
      </div>
    </div>
  );
}