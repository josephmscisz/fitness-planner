import { useEffect, useState } from "react";
import {
  deleteExerciseLog,
  deleteWorkoutSession,
  getExerciseLogs,
  getWorkoutSessions,
  initDb,
  updateExerciseLog,
  type ExerciseLog,
  type WorkoutSession,
} from "../lib/db";
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

type EditableLog = ExerciseLog & {
  isDirty?: boolean;
};

export default function History({ theme }: { theme: AppTheme }) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selected, setSelected] = useState<WorkoutSession | null>(null);
  const [logs, setLogs] = useState<EditableLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    await initDb();
    const data = await getWorkoutSessions();
    setSessions(data);
    setLoading(false);
  }

  async function selectSession(session: WorkoutSession) {
    setSelected(session);
    const sessionLogs = await getExerciseLogs(session.id);
    setLogs(sessionLogs.map((log) => ({ ...log, isDirty: false })));
  }

  function updateLogField(
    id: number,
    field: "weight" | "actual_sets" | "actual_reps" | "notes",
    value: string
  ) {
    setLogs((current) =>
      current.map((log) =>
        log.id === id ? { ...log, [field]: value, isDirty: true } : log
      )
    );
  }

  async function saveLog(log: EditableLog) {
    await updateExerciseLog({
      id: log.id,
      weight: log.weight ?? "",
      actualSets: log.actual_sets ?? "",
      actualReps: log.actual_reps ?? "",
      notes: log.notes ?? "",
    });

    setLogs((current) =>
      current.map((row) =>
        row.id === log.id ? { ...row, isDirty: false } : row
      )
    );
  }

  async function removeLog(logId: number) {
    const confirmed = window.confirm("Delete this exercise log?");
    if (!confirmed) return;

    await deleteExerciseLog(logId);

    if (!selected) return;

    const sessionLogs = await getExerciseLogs(selected.id);
    setLogs(sessionLogs.map((log) => ({ ...log, isDirty: false })));
  }

  async function removeSession(sessionId: number) {
    const confirmed = window.confirm(
      "Delete this workout session and all of its logs?"
    );
    if (!confirmed) return;

    await deleteWorkoutSession(sessionId);

    if (selected?.id === sessionId) {
      setSelected(null);
      setLogs([]);
    }

    await loadSessions();
  }

  return (
    <div style={pageStyle(theme)}>
      <h1 style={{ marginBottom: 8 }}>Workout History</h1>
      <p style={smallMutedTextStyle(theme)}>
        Review past sessions, correct exercise logs, or delete sessions you do
        not want to keep.
      </p>

      {loading ? (
        <div
          style={{
            ...cardStyle(theme),
            padding: 20,
            marginTop: 20,
            backgroundColor: theme.surface,
          }}
        >
          Loading...
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: 24,
            alignItems: "start",
            marginTop: 20,
          }}
        >
          <div
            style={{
              ...cardStyle(theme),
              padding: 16,
              backgroundColor: theme.surface,
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Sessions</h3>

            {sessions.length === 0 && (
              <p style={smallMutedTextStyle(theme)}>No saved sessions yet.</p>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: `1px solid ${
                      selected?.id === s.id ? theme.borderStrong : theme.border
                    }`,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor:
                      selected?.id === s.id
                        ? theme.surfaceElevated
                        : theme.surfaceMuted,
                  }}
                >
                  <div
                    onClick={() => selectSession(s)}
                    style={{ cursor: "pointer", marginBottom: 10 }}
                  >
                    <div style={{ fontWeight: 700 }}>{s.title}</div>
                    <div style={smallMutedTextStyle(theme)}>
                      {new Date(s.started_at).toLocaleString()}
                    </div>
                    <div style={smallMutedTextStyle(theme)}>
                      {s.mode} · {s.duration}
                    </div>
                  </div>

                  <button
                    onClick={() => removeSession(s.id)}
                    style={{
                      ...secondaryButtonStyle(theme),
                      padding: "8px 10px",
                      fontSize: 13,
                    }}
                  >
                    Delete Session
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              ...cardStyle(theme),
              padding: 16,
              backgroundColor: theme.surface,
            }}
          >
            {selected ? (
              <>
                <h3 style={{ marginTop: 0, marginBottom: 6 }}>{selected.title}</h3>
                <div style={{ ...smallMutedTextStyle(theme), marginBottom: 16 }}>
                  {new Date(selected.started_at).toLocaleString()}
                </div>

                {logs.length === 0 ? (
                  <p style={smallMutedTextStyle(theme)}>
                    No exercise logs for this session.
                  </p>
                ) : (
                  <div
                    style={{
                      overflowX: "auto",
                      border: `1px solid ${theme.border}`,
                      borderRadius: 12,
                    }}
                  >
                    <table
                      cellPadding={10}
                      style={{
                        borderCollapse: "collapse",
                        minWidth: 900,
                        width: "100%",
                        backgroundColor: theme.surface,
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle(theme)}>Exercise</th>
                          <th style={tableHeaderStyle(theme)}>Weight</th>
                          <th style={tableHeaderStyle(theme)}>Sets</th>
                          <th style={tableHeaderStyle(theme)}>Reps</th>
                          <th style={tableHeaderStyle(theme)}>Notes</th>
                          <th style={tableHeaderStyle(theme)}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td style={tableCellStyle(theme)}>
                              <strong>{log.exercise_name}</strong>
                            </td>

                            <td style={tableCellStyle(theme)}>
                              <input
                                style={inputStyle(theme)}
                                value={log.weight ?? ""}
                                onChange={(e) =>
                                  updateLogField(log.id, "weight", e.target.value)
                                }
                              />
                            </td>

                            <td style={tableCellStyle(theme)}>
                              <input
                                style={inputStyle(theme)}
                                value={log.actual_sets ?? ""}
                                onChange={(e) =>
                                  updateLogField(log.id, "actual_sets", e.target.value)
                                }
                              />
                            </td>

                            <td style={tableCellStyle(theme)}>
                              <input
                                style={inputStyle(theme)}
                                value={log.actual_reps ?? ""}
                                onChange={(e) =>
                                  updateLogField(log.id, "actual_reps", e.target.value)
                                }
                              />
                            </td>

                            <td style={tableCellStyle(theme)}>
                              <input
                                style={inputStyle(theme)}
                                value={log.notes ?? ""}
                                onChange={(e) =>
                                  updateLogField(log.id, "notes", e.target.value)
                                }
                              />
                            </td>

                            <td style={tableCellStyle(theme)}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button
                                  onClick={() => saveLog(log)}
                                  disabled={!log.isDirty}
                                  style={{
                                    ...primaryButtonStyle(theme),
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    opacity: log.isDirty ? 1 : 0.6,
                                  }}
                                >
                                  Save
                                </button>

                                <button
                                  onClick={() => removeLog(log.id)}
                                  style={{
                                    ...secondaryButtonStyle(theme),
                                    padding: "8px 10px",
                                    fontSize: 13,
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div style={smallMutedTextStyle(theme)}>
                Select a session to view and edit details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}