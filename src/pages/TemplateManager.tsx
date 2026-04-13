import { useEffect, useState } from "react";
import {
  addWorkoutTemplateExercise,
  deleteWorkoutTemplateExercise,
  getExercises,
  getWorkoutTemplateExercises,
  getWorkoutTemplates,
  initDb,
  updateWorkoutTemplate,
  updateWorkoutTemplateExercise,
  type ExerciseRecord,
  type WorkoutTemplateExerciseRecord,
  type WorkoutTemplateRecord,
} from "../lib/db";

export default function TemplateManager() {
  const [templates, setTemplates] = useState<WorkoutTemplateRecord[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplateRecord | null>(null);
  const [templateExercises, setTemplateExercises] = useState<WorkoutTemplateExerciseRecord[]>([]);
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [templateTitle, setTemplateTitle] = useState("");
  const [templateFocus, setTemplateFocus] = useState("");

  const [newExerciseName, setNewExerciseName] = useState("");
  const [newSets, setNewSets] = useState("");
  const [newReps, setNewReps] = useState("");
  const [newNotes, setNewNotes] = useState("");

  async function loadAll() {
    setLoading(true);
    await initDb();

    const [templateRows, exerciseRows] = await Promise.all([
      getWorkoutTemplates(),
      getExercises(),
    ]);

    setTemplates(templateRows);
    setExerciseOptions(exerciseRows as ExerciseRecord[]);

    if (templateRows.length > 0 && !selectedTemplate) {
      await selectTemplate(templateRows[0]);
    }

    setLoading(false);
  }

  async function selectTemplate(template: WorkoutTemplateRecord) {
    setSelectedTemplate(template);
    setTemplateTitle(template.title);
    setTemplateFocus(template.focus ?? "");

    const rows = await getWorkoutTemplateExercises(template.id);
    setTemplateExercises(rows);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveTemplateMeta() {
    if (!selectedTemplate) return;

    await updateWorkoutTemplate({
      id: selectedTemplate.id,
      title: templateTitle,
      focus: templateFocus,
    });

    const updated = { ...selectedTemplate, title: templateTitle, focus: templateFocus };
    setSelectedTemplate(updated);
    setTemplates((current) =>
      current.map((t) => (t.id === updated.id ? updated : t))
    );
  }

  function updateTemplateExerciseField(
    id: number,
    field: keyof WorkoutTemplateExerciseRecord,
    value: string | number
  ) {
    setTemplateExercises((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }

  async function saveExerciseRow(row: WorkoutTemplateExerciseRecord) {
    await updateWorkoutTemplateExercise({
      id: row.id,
      exerciseName: row.exercise_name,
      sets: row.sets ?? "",
      reps: row.reps ?? "",
      notes: row.notes ?? "",
      sortOrder: row.sort_order,
    });
  }

  async function addExerciseRow() {
    if (!selectedTemplate || !newExerciseName) return;

    const nextOrder =
      templateExercises.length > 0
        ? Math.max(...templateExercises.map((r) => r.sort_order)) + 1
        : 1;

    await addWorkoutTemplateExercise({
      templateId: selectedTemplate.id,
      exerciseName: newExerciseName,
      sets: newSets,
      reps: newReps,
      notes: newNotes,
      sortOrder: nextOrder,
    });

    const rows = await getWorkoutTemplateExercises(selectedTemplate.id);
    setTemplateExercises(rows);

    setNewExerciseName("");
    setNewSets("");
    setNewReps("");
    setNewNotes("");
  }

  async function removeExerciseRow(id: number) {
    await deleteWorkoutTemplateExercise(id);
    if (!selectedTemplate) return;

    const rows = await getWorkoutTemplateExercises(selectedTemplate.id);
    setTemplateExercises(rows);
  }

  if (loading) {
    return <div style={{ padding: 24 }}>Loading templates...</div>;
  }

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 1300, margin: "0 auto" }}>
      <h1>Template Manager</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
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
          <h3 style={{ marginTop: 0 }}>Templates</h3>

          <div style={{ display: "grid", gap: 8 }}>
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border:
                    selectedTemplate?.id === template.id
                      ? "1px solid #93c5fd"
                      : "1px solid #d1d5db",
                  backgroundColor:
                    selectedTemplate?.id === template.id ? "#eff6ff" : "white",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{template.title}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {template.mode} · {template.duration} · {template.code}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          {selectedTemplate ? (
            <>
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Template Details</h3>

                <div style={{ display: "grid", gap: 12 }}>
                  <input
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    placeholder="Template title"
                  />
                  <input
                    value={templateFocus}
                    onChange={(e) => setTemplateFocus(e.target.value)}
                    placeholder="Focus"
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <button onClick={saveTemplateMeta}>Save Template Details</button>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Add Exercise To Template</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 2fr auto",
                    gap: 12,
                    alignItems: "end",
                  }}
                >
                  <select
                    value={newExerciseName}
                    onChange={(e) => setNewExerciseName(e.target.value)}
                  >
                    <option value="">Select exercise</option>
                    {exerciseOptions.map((exercise) => (
                      <option key={exercise.id} value={exercise.name}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>

                  <input
                    value={newSets}
                    onChange={(e) => setNewSets(e.target.value)}
                    placeholder="Sets"
                  />

                  <input
                    value={newReps}
                    onChange={(e) => setNewReps(e.target.value)}
                    placeholder="Reps"
                  />

                  <input
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Notes"
                  />

                  <button onClick={addExerciseRow}>Add</button>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <h3 style={{ marginTop: 0 }}>Template Exercises</h3>

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
                      <th style={{ textAlign: "left" }}>Order</th>
                      <th style={{ textAlign: "left" }}>Exercise</th>
                      <th style={{ textAlign: "left" }}>Sets</th>
                      <th style={{ textAlign: "left" }}>Reps</th>
                      <th style={{ textAlign: "left" }}>Notes</th>
                      <th style={{ textAlign: "left" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templateExercises.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            value={row.sort_order}
                            onChange={(e) =>
                              updateTemplateExerciseField(
                                row.id,
                                "sort_order",
                                Number(e.target.value)
                              )
                            }
                            style={{ width: 70 }}
                          />
                        </td>
                        <td>
                          <input
                            value={row.exercise_name}
                            onChange={(e) =>
                              updateTemplateExerciseField(
                                row.id,
                                "exercise_name",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={row.sets ?? ""}
                            onChange={(e) =>
                              updateTemplateExerciseField(
                                row.id,
                                "sets",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={row.reps ?? ""}
                            onChange={(e) =>
                              updateTemplateExerciseField(
                                row.id,
                                "reps",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            value={row.notes ?? ""}
                            onChange={(e) =>
                              updateTemplateExerciseField(
                                row.id,
                                "notes",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => saveExerciseRow(row)}>Save</button>
                            <button onClick={() => removeExerciseRow(row.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>Select a template.</p>
          )}
        </div>
      </div>
    </div>
  );
}