import { useEffect, useState } from "react";
import {
  deleteExerciseLog,
  deleteWorkoutSession,
  getExerciseLogs,
  getWhoopWorkoutById,
  getWorkoutSessions,
  initDb,
  updateExerciseLog,
  type ExerciseLog,
  type WhoopWorkout,
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
  const [matchedWhoopWorkout, setMatchedWhoopWorkout] = useState<WhoopWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingConfirm, setPendingConfirm] = useState<{
    message: string;
    action: () => Promise<void>;
  } | null>(null);

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

    const [sessionLogs, workout] = await Promise.all([
      getExerciseLogs(session.id),
      session.matched_whoop_workout_id
        ? getWhoopWorkoutById(session.matched_whoop_workout_id)
        : Promise.resolve(null),
    ]);

    setLogs(sessionLogs.map((log) => ({ ...log, isDirty: false })));
    setMatchedWhoopWorkout(workout);
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
    setPendingConfirm({
      message: "Delete this exercise log?",
      action: async () => {
        await deleteExerciseLog(logId);

        if (!selected) {
          return;
        }

        const sessionLogs = await getExerciseLogs(selected.id);
        setLogs(sessionLogs.map((log) => ({ ...log, isDirty: false })));
      },
    });
  }

  async function removeSession(sessionId: number) {
    setPendingConfirm({
      message: "Delete this workout session and all of its logs?",
      action: async () => {
        await deleteWorkoutSession(sessionId);

        if (selected?.id === sessionId) {
          setSelected(null);
          setLogs([]);
          setMatchedWhoopWorkout(null);
        }

        await loadSessions();
      },
    });
  }

  async function confirmPendingAction() {
    if (!pendingConfirm) {
      return;
    }

    try {
      await pendingConfirm.action();
    } finally {
      setPendingConfirm(null);
    }
  }

  return (
    <div style={pageStyle(theme)}>
      <h1 style={{ marginBottom: 8 }}>Workout History</h1>
      <p style={smallMutedTextStyle(theme)}>
        Review past sessions, correct exercise logs, and compare your training history to WHOOP data.
      </p>

      {loading ? (
        <div style={{ ...cardStyle(theme), padding: 20, marginTop: 20, backgroundColor: theme.surface }}>
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
          <div style={{ ...cardStyle(theme), padding: 16, backgroundColor: theme.surface }}>
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Sessions</h3>

            {sessions.length === 0 && (
              <p style={smallMutedTextStyle(theme)}>No saved sessions yet.</p>
            )}

            <div style={{ display: "grid", gap: 10 }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: `1px solid ${selected?.id === s.id ? theme.borderStrong : theme.border}`,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor:
                      selected?.id === s.id ? theme.surfaceElevated : theme.surfaceMuted,
                  }}
                >
                  <div onClick={() => selectSession(s)} style={{ cursor: "pointer", marginBottom: 10 }}>
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
                    style={{ ...secondaryButtonStyle(theme), padding: "8px 10px", fontSize: 13 }}
                  >
                    Delete Session
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ ...cardStyle(theme), padding: 16, backgroundColor: theme.surface }}>
              {selected ? (
                <>
                  <h3 style={{ marginTop: 0, marginBottom: 6 }}>{selected.title}</h3>
                  <div style={{ ...smallMutedTextStyle(theme), marginBottom: 16 }}>
                    {new Date(selected.started_at).toLocaleString()}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(120px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: theme.surfaceMuted,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div style={smallMutedTextStyle(theme)}>Subjective Energy</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {selected.selected_energy ?? "—"}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: theme.surfaceMuted,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div style={smallMutedTextStyle(theme)}>WHOOP Recovery</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {selected.whoop_recovery_score ?? "—"}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: theme.surfaceMuted,
                        border: `1px solid ${theme.border}`,
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >
                      <div style={smallMutedTextStyle(theme)}>WHOOP Sleep</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {selected.whoop_sleep_performance != null
                          ? `${selected.whoop_sleep_performance}%`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <div style={{ ...smallMutedTextStyle(theme), marginTop: 10 }}>
                    WHOOP alignment bucket: {selected.whoop_alignment_bucket ?? "—"}
                  </div>

                  <div
                    style={{
                      marginTop: 16,
                      backgroundColor: theme.surfaceMuted,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Matched WHOOP Workout</div>

                    {matchedWhoopWorkout ? (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, minmax(100px, 1fr))",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={smallMutedTextStyle(theme)}>Sport</div>
                            <div>{matchedWhoopWorkout.sport_name ?? "—"}</div>
                          </div>

                          <div>
                            <div style={smallMutedTextStyle(theme)}>Strain</div>
                            <div>{matchedWhoopWorkout.strain ?? "—"}</div>
                          </div>

                          <div>
                            <div style={smallMutedTextStyle(theme)}>Avg HR</div>
                            <div>{matchedWhoopWorkout.average_hr ?? "—"}</div>
                          </div>

                          <div>
                            <div style={smallMutedTextStyle(theme)}>Max HR</div>
                            <div>{matchedWhoopWorkout.max_hr ?? "—"}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <div style={smallMutedTextStyle(theme)}>WHOOP Start</div>
                          <div>
                            {matchedWhoopWorkout.start_time
                              ? new Date(matchedWhoopWorkout.start_time).toLocaleString()
                              : "—"}
                          </div>
                        </div>

                        <div style={{ ...smallMutedTextStyle(theme), marginTop: 10 }}>
                          Subjective vs WHOOP:{" "}
                          {selected?.selected_energy && selected?.whoop_alignment_bucket
                            ? selected.selected_energy === selected.whoop_alignment_bucket
                              ? "Aligned"
                              : "Not aligned"
                            : "—"}
                        </div>
                      </>
                    ) : (
                      <div style={smallMutedTextStyle(theme)}>
                        No matched WHOOP workout for this session yet.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={smallMutedTextStyle(theme)}>
                  Select a session to view WHOOP and log details.
                </div>
              )}
            </div>

            <div style={{ ...cardStyle(theme), padding: 16, backgroundColor: theme.surface }}>
              {selected ? (
                <>
                  <h3 style={{ marginTop: 0, marginBottom: 12 }}>Exercise Logs</h3>

                  {logs.length === 0 ? (
                    <p style={smallMutedTextStyle(theme)}>No exercise logs for this session.</p>
                  ) : (
                    <div style={{ overflowX: "auto", border: `1px solid ${theme.border}`, borderRadius: 12 }}>
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
                                  onChange={(e) => updateLogField(log.id, "weight", e.target.value)}
                                />
                              </td>

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
                                  value={log.actual_sets ?? ""}
                                  onChange={(e) => updateLogField(log.id, "actual_sets", e.target.value)}
                                />
                              </td>

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
                                  value={log.actual_reps ?? ""}
                                  onChange={(e) => updateLogField(log.id, "actual_reps", e.target.value)}
                                />
                              </td>

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
                                  value={log.notes ?? ""}
                                  onChange={(e) => updateLogField(log.id, "notes", e.target.value)}
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
        </div>
      )}

      {pendingConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              ...cardStyle(theme),
              backgroundColor: theme.surface,
              width: "100%",
              maxWidth: 460,
              padding: 16,
            }}
          >
            <h3 style={{ margin: "0 0 10px" }}>Confirm Action</h3>
            <p style={{ ...smallMutedTextStyle(theme), marginBottom: 14 }}>
              {pendingConfirm.message}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setPendingConfirm(null)}
                style={secondaryButtonStyle(theme)}
              >
                Cancel
              </button>
              <button onClick={confirmPendingAction} style={primaryButtonStyle(theme)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}