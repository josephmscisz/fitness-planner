import { useEffect, useState } from "react";
import { getExercises, initDb, type Exercise } from "../lib/db";

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        await initDb();
        const rows = await getExercises();
        setExercises(rows);
      } catch (err) {
          console.error("DB LOAD ERROR:", err);
          setError(`Failed to load exercises: ${String(err)}`);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Exercise Library</h1>
      <p>Your first real database-backed screen.</p>

      {loading && <p>Loading exercises...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && (
        <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Movement Pattern</th>
              <th>Primary Muscles</th>
              <th>Equipment</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex) => (
              <tr key={ex.id}>
                <td>{ex.name}</td>
                <td>{ex.category}</td>
                <td>{ex.movement_pattern ?? ""}</td>
                <td>{ex.primary_muscles ?? ""}</td>
                <td>{ex.equipment ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}