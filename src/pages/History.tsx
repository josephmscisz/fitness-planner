import { useEffect, useState } from "react";
import {
  getWorkoutSessions,
  getExerciseLogs,
  type WorkoutSession,
  type ExerciseLog,
} from "../lib/db";

export default function History() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selected, setSelected] = useState<WorkoutSession | null>(null);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const data = await getWorkoutSessions();
    setSessions(data);
  }

  async function selectSession(session: WorkoutSession) {
    setSelected(session);
    const logs = await getExerciseLogs(session.id);
    setLogs(logs);
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 1000 }}>
      <h1>Workout History</h1>

      <div style={{ display: "flex", gap: 24 }}>
        {/* LEFT: SESSION LIST */}
        <div style={{ minWidth: 300 }}>
          <h3>Sessions</h3>

          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => selectSession(s)}
              style={{
                border: "1px solid #ccc",
                padding: 10,
                marginBottom: 8,
                cursor: "pointer",
              }}
            >
              <div><strong>{s.title}</strong></div>
              <div>{new Date(s.started_at).toLocaleString()}</div>
              <div>{s.mode} · {s.duration}</div>
            </div>
          ))}
        </div>

        {/* RIGHT: DETAILS */}
        <div style={{ flex: 1 }}>
          {selected ? (
            <>
              <h3>{selected.title}</h3>

              <table
                border={1}
                cellPadding={8}
                style={{ borderCollapse: "collapse", minWidth: 600 }}
              >
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th>Weight</th>
                    <th>Sets</th>
                    <th>Reps</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.exercise_name}</td>
                      <td>{log.weight}</td>
                      <td>{log.actual_sets}</td>
                      <td>{log.actual_reps}</td>
                      <td>{log.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p>Select a session to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}