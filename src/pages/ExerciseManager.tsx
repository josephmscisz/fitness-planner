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
  roleType: string;
  accessoryPriority: string;
  tutorialUrl: string;
  accessorySlot: string;
};

const emptyForm: ExerciseForm = {
  name: "",
  category: "",
  movementPattern: "",
  primaryMuscles: "",
  equipment: "",
  notes: "",
  roleType: "accessory",
  accessoryPriority: "5",
  tutorialUrl: "",
  accessorySlot: "",
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
      roleType: ex.role_type ?? "accessory",
      accessoryPriority: String(ex.accessory_priority ?? 5),
      tutorialUrl: ex.tutorial_url ?? "",
      accessorySlot: ex.accessory_slot ?? "",
    });
  }

  function clearForm() {
    setForm(emptyForm);
  }

  async function handleSave() {
  if (!form.name.trim() || !form.category.trim()) return;

  const parsedPriority = Number(form.accessoryPriority);
  const safePriority = Number.isNaN(parsedPriority) ? 5 : parsedPriority;

  if (form.id) {
    await updateExercise({
      id: form.id,
      name: form.name,
      category: form.category,
      movementPattern: form.movementPattern,
      primaryMuscles: form.primaryMuscles,
      equipment: form.equipment,
      notes: form.notes,
      roleType: form.roleType,
      accessoryPriority: safePriority,
      tutorialUrl: form.tutorialUrl,
      accessorySlot: form.accessorySlot,
    });
  } else {
    await createExercise({
      name: form.name,
      category: form.category,
      movementPattern: form.movementPattern,
      primaryMuscles: form.primaryMuscles,
      equipment: form.equipment,
      notes: form.notes,
      roleType: form.roleType,
      accessoryPriority: safePriority,
      tutorialUrl: form.tutorialUrl,
      accessorySlot: form.accessorySlot,
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
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
            />

            <input
              placeholder="Category / Body Part"
              value={form.category}
              onChange={(e) => updateForm("category", e.target.value)}
            />

            <input
              placeholder="Movement Pattern"
              value={form.movementPattern}
              onChange={(e) => updateForm("movementPattern", e.target.value)}
            />

            <input
              placeholder="Primary Muscles"
              value={form.primaryMuscles}
              onChange={(e) => updateForm("primaryMuscles", e.target.value)}
            />

            <input
              placeholder="Equipment"
              value={form.equipment}
              onChange={(e) => updateForm("equipment", e.target.value)}
            />

            <select
              value={form.roleType}
              onChange={(e) => {
                const value = e.target.value;
                updateForm("roleType", value);

                if (value === "foundation") {
                  updateForm("accessoryPriority", "0");
                } else {
                  updateForm("accessoryPriority", "5");
                }
              }}
            >
              <option value="foundation">Foundation</option>
              <option value="accessory">Accessory</option>
            </select>

            {form.roleType === "accessory" && (
              <input
                placeholder="Accessory Slot (e.g. upper_back, triceps, lateral_delts)"
                value={form.accessorySlot}
                onChange={(e) => updateForm("accessorySlot", e.target.value)}
              />
            )}

            <input
              type="number"
              min={0}
              max={10}
              placeholder="Accessory Priority (0-10)"
              value={form.accessoryPriority}
              onChange={(e) => updateForm("accessoryPriority", e.target.value)}
            />

            <input
              placeholder="Tutorial URL"
              value={form.tutorialUrl}
              onChange={(e) => updateForm("tutorialUrl", e.target.value)}
            />

            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              rows={4}
            />
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
                  <th style={{ textAlign: "left" }}>Role</th>
                  <th style={{ textAlign: "left" }}>Priority</th>
                  <th style={{ textAlign: "left" }}>Equipment</th>
                  <th style={{ textAlign: "left" }}>Tutorial</th>
                  <th style={{ textAlign: "left" }}>Actions</th>
                  <th style={{ textAlign: "left" }}>Slot</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => (
                  <tr key={ex.id}>
                    <td>{ex.name}</td>
                    <td>{ex.category}</td>
                    <td>{ex.role_type ?? ""}</td>
                    <td>{ex.accessory_priority ?? ""}</td>
                    <td>{ex.equipment ?? ""}</td>
                    <td>{ex.accessory_slot ?? ""}</td>
                    <td>
                      {ex.tutorial_url ? (
                        <a href={ex.tutorial_url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        ""
                      )}
                    </td>
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