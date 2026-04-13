import { useEffect, useState } from "react";
import {
  createExercise,
  deleteExercise,
  getExercises,
  initDb,
  updateExercise,
  type ExerciseRecord,
} from "../lib/db";

type ExerciseForm = {
  id?: number;
  name: string;
  category: string;
  movementPattern: string;
  primaryMuscles: string;
  equipment: string;
  notes: string;
};

const emptyForm: ExerciseForm = {
  name: "",
  category: "",
  movementPattern: "",
  primaryMuscles: "",
  equipment: "",
  notes: "",
};

export default function ExerciseManager() {
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [form, setForm] = useState<ExerciseForm>(emptyForm);
  const [loading, setLoading] = useState(true);

  async function loadExercises() {
    setLoading(true);
    await initDb();
    const rows = await getExercises();
    setExercises(rows as ExerciseRecord[]);
    setLoading(false);
  }

  useEffect(() => {
    loadExercises();
  }, []);

  function updateForm(field: keyof ExerciseForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editExercise(ex: ExerciseRecord) {
    setForm({
      id: ex.id,
      name: ex.name,
      category: ex.category,
      movementPattern: ex.movement_pattern ?? "",
      primaryMuscles: ex.primary_muscles ?? "",
      equipment: ex.equipment ?? "",
      notes: ex.notes ?? "",
    });
  }

  function clearForm() {
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category.trim()) return;

    if (form.id) {
      await updateExercise({
        id: form.id,
        name: form.name,
        category: form.category,
        movementPattern: form.movementPattern,
        primaryMuscles: form.primaryMuscles,
        equipment: form.equipment,
        notes: form.notes,
      });
    } else {
      await createExercise({
        name: form.name,
        category: form.category,
        movementPattern: form.movementPattern,
        primaryMuscles: form.primaryMuscles,
        equipment: form.equipment,
        notes: form.notes,
      });
    }

    clearForm();
    await loadExercises();
  }

  async function handleDelete(id: number) {
    const confirmed = window.confirm("Delete this exercise?");
    if (!confirmed) return;

    await deleteExercise(id);
    if (form.id === id) clearForm();
    await loadExercises();
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Exercise Manager</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            backgroundColor: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>{form.id ? "Edit Exercise" : "Add Exercise"}</h3>

          <div style={{ display: "grid", gap: 12 }}>
            <input placeholder="Name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
            <input placeholder="Category / Body Part" value={form.category} onChange={(e) => updateForm("category", e.target.value)} />
            <input placeholder="Movement Pattern" value={form.movementPattern} onChange={(e) => updateForm("movementPattern", e.target.value)} />
            <input placeholder="Primary Muscles" value={form.primaryMuscles} onChange={(e) => updateForm("primaryMuscles", e.target.value)} />
            <input placeholder="Equipment" value={form.equipment} onChange={(e) => updateForm("equipment", e.target.value)} />
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} rows={4} />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button onClick={handleSave}>{form.id ? "Update" : "Create"}</button>
            <button onClick={clearForm}>Clear</button>
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Exercises</h3>

          {loading ? (
            <p>Loading...</p>
          ) : (
            <table
              cellPadding={8}
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #e5e7eb",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th style={{ textAlign: "left" }}>Name</th>
                  <th style={{ textAlign: "left" }}>Category</th>
                  <th style={{ textAlign: "left" }}>Equipment</th>
                  <th style={{ textAlign: "left" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr key={ex.id}>
                    <td>{ex.name}</td>
                    <td>{ex.category}</td>
                    <td>{ex.equipment ?? ""}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => editExercise(ex)}>Edit</button>
                        <button onClick={() => handleDelete(ex.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}