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

export default function TemplateManager({ theme }: { theme: AppTheme }) {
  const [templates, setTemplates] = useState<WorkoutTemplateRecord[]>([]);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkoutTemplateRecord | null>(null);
  const [templateExercises, setTemplateExercises] = useState<
    WorkoutTemplateExerciseRecord[]
  >([]);
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [templateTitle, setTemplateTitle] = useState("");
  const [templateFocus, setTemplateFocus] = useState("");

  const [newExerciseName, setNewExerciseName] = useState("");
  const [newSets, setNewSets] = useState("");
  const [newReps, setNewReps] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newSlotType, setNewSlotType] = useState("fixed_accessory");
  const [newAccessorySlot, setNewAccessorySlot] = useState("");
  const [newAccessoryEquipment, setNewAccessoryEquipment] = useState("");

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

    const updated = {
      ...selectedTemplate,
      title: templateTitle,
      focus: templateFocus,
    };
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
      slotType: row.slot_type ?? "",
      accessorySlot: row.accessory_slot ?? "",
      accessoryEquipment: row.accessory_equipment ?? "",
    });
  }

  async function addExerciseRow() {
    if (!selectedTemplate) return;

    const nextOrder =
      templateExercises.length > 0
        ? Math.max(...templateExercises.map((r) => r.sort_order)) + 1
        : 1;

    const exerciseName =
      newSlotType === "rotating_accessory" ? "" : newExerciseName;

    await addWorkoutTemplateExercise({
      templateId: selectedTemplate.id,
      exerciseName,
      sets: newSets,
      reps: newReps,
      notes: newNotes,
      sortOrder: nextOrder,
      slotType: newSlotType,
      accessorySlot: newAccessorySlot,
      accessoryEquipment: newAccessoryEquipment,
    });

    const rows = await getWorkoutTemplateExercises(selectedTemplate.id);
    setTemplateExercises(rows);

    setNewExerciseName("");
    setNewSets("");
    setNewReps("");
    setNewNotes("");
    setNewSlotType("fixed_accessory");
    setNewAccessorySlot("");
    setNewAccessoryEquipment("");
  }

  async function removeExerciseRow(id: number) {
    await deleteWorkoutTemplateExercise(id);
    if (!selectedTemplate) return;

    const rows = await getWorkoutTemplateExercises(selectedTemplate.id);
    setTemplateExercises(rows);
  }

  return (
    <div style={pageStyle(theme)}>
      <h1 style={{ marginBottom: 8 }}>Template Manager</h1>
      <p style={smallMutedTextStyle(theme)}>
        Edit workout templates, define fixed vs rotating slots, and shape how
        your planner builds sessions.
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
          Loading templates...
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
            <h3 style={{ marginTop: 0 }}>Templates</h3>

            <div style={{ display: "grid", gap: 8 }}>
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border:
                      selectedTemplate?.id === template.id
                        ? `1px solid ${theme.borderStrong}`
                        : `1px solid ${theme.border}`,
                    backgroundColor:
                      selectedTemplate?.id === template.id
                        ? theme.surfaceElevated
                        : theme.surfaceMuted,
                    color: theme.text,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{template.title}</div>
                  <div style={smallMutedTextStyle(theme)}>
                    {template.mode} · {template.duration} · {template.code}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            {selectedTemplate ? (
              <>
                <div
                  style={{
                    ...cardStyle(theme),
                    padding: 16,
                    backgroundColor: theme.surface,
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Template Details</h3>

                  <div style={{ display: "grid", gap: 12 }}>
                    <input
                      style={inputStyle(theme)}
                      value={templateTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTemplateTitle(e.target.value)
                      }
                      placeholder="Template title"
                    />
                    <input
                      style={inputStyle(theme)}
                      value={templateFocus}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTemplateFocus(e.target.value)
                      }
                      placeholder="Focus"
                    />
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <button
                      onClick={saveTemplateMeta}
                      style={primaryButtonStyle(theme)}
                    >
                      Save Template Details
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    ...cardStyle(theme),
                    padding: 16,
                    backgroundColor: theme.surface,
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Add Exercise To Template</h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "1.2fr 1.6fr 1fr 1fr 1.4fr 1.4fr auto",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <div style={{ marginBottom: 4, color: theme.textSoft, fontSize: 12 }}>
                        Slot Type
                      </div>
                      <select
                        style={inputStyle(theme)}
                        value={newSlotType}
                        onChange={(e) => setNewSlotType(e.target.value)}
                      >
                        <option value="fixed_foundation">Fixed Foundation</option>
                        <option value="fixed_accessory">Fixed Accessory</option>
                        <option value="rotating_accessory">Rotating Accessory</option>
                      </select>
                    </div>

                    <div>
                      <div style={{ marginBottom: 4, color: theme.textSoft, fontSize: 12 }}>
                        Exercise
                      </div>
                      <select
                        style={inputStyle(theme)}
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        disabled={newSlotType === "rotating_accessory"}
                      >
                        <option value="">Select exercise</option>
                        {exerciseOptions.map((exercise) => (
                          <option key={exercise.id} value={exercise.name}>
                            {exercise.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ marginBottom: 4, color: theme.textSoft, fontSize: 12 }}>
                        Sets
                      </div>
                      <input
                        style={inputStyle(theme)}
                        value={newSets}
                        onChange={(e) => setNewSets(e.target.value)}
                        placeholder="Sets"
                      />
                    </div>

                    <div>
                      <div style={{ marginBottom: 4, color: theme.textSoft, fontSize: 12 }}>
                        Reps
                      </div>
                      <input
                        style={inputStyle(theme)}
                        value={newReps}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewReps(e.target.value)
                        }
                        placeholder="Reps"
                      />
                    </div>

                    <div>
                      <div style={{ marginBottom: 4, color: theme.textSoft, fontSize: 12 }}>
                        Accessory Slot
                      </div>
                      <input
                        style={inputStyle(theme)}
                        value={newAccessorySlot}
                        onChange={(e) => setNewAccessorySlot(e.target.value)}
                        placeholder="e.g. triceps, upper_back"
                      />
                    </div>

                    <div>
                      <div style={{ marginBottom: 4, color: theme.textSoft, fontSize: 12 }}>
                        Equipment Filter
                      </div>
                      <input
                        style={inputStyle(theme)}
                        value={newAccessoryEquipment}
                        onChange={(e) => setNewAccessoryEquipment(e.target.value)}
                        placeholder="Optional equipment"
                      />
                    </div>

                    <button onClick={addExerciseRow} style={primaryButtonStyle(theme)}>
                      Add
                    </button>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <input
                      style={inputStyle(theme)}
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Notes"
                    />
                  </div>
                </div>

                <div
                  style={{
                    ...cardStyle(theme),
                    padding: 16,
                    backgroundColor: theme.surface,
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Template Exercises</h3>

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
                        width: "100%",
                        minWidth: 1300,
                        borderCollapse: "collapse",
                        backgroundColor: theme.surface,
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle(theme)}>Order</th>
                          <th style={tableHeaderStyle(theme)}>Slot Type</th>
                          <th style={tableHeaderStyle(theme)}>Exercise</th>
                          <th style={tableHeaderStyle(theme)}>Accessory Slot</th>
                          <th style={tableHeaderStyle(theme)}>Equipment Filter</th>
                          <th style={tableHeaderStyle(theme)}>Sets</th>
                          <th style={tableHeaderStyle(theme)}>Reps</th>
                          <th style={tableHeaderStyle(theme)}>Notes</th>
                          <th style={tableHeaderStyle(theme)}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templateExercises.map((row) => {
                          const isRotating =
                            row.slot_type === "rotating_accessory";

                          return (
                            <tr key={row.id}>
                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
                                  value={row.sort_order}
                                  onChange={(e) =>
                                    updateTemplateExerciseField(
                                      row.id,
                                      "sort_order",
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              </td>

                              <td style={tableCellStyle(theme)}>
                                <select
                                  style={inputStyle(theme)}
                                  value={row.slot_type ?? ""}
                                  onChange={(e) =>
                                    updateTemplateExerciseField(
                                      row.id,
                                      "slot_type",
                                      e.target.value
                                    )
                                  }
                                >
                                  <option value="fixed_foundation">
                                    Fixed Foundation
                                  </option>
                                  <option value="fixed_accessory">
                                    Fixed Accessory
                                  </option>
                                  <option value="rotating_accessory">
                                    Rotating Accessory
                                  </option>
                                </select>
                              </td>

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
                                  value={row.exercise_name}
                                  disabled={isRotating}
                                  placeholder={
                                    isRotating
                                      ? "Resolved at runtime"
                                      : "Exercise name"
                                  }
                                  onChange={(e) =>
                                    updateTemplateExerciseField(
                                      row.id,
                                      "exercise_name",
                                      e.target.value
                                    )
                                  }
                                />
                              </td>

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
                                  value={row.accessory_slot ?? ""}
                                  placeholder="e.g. triceps"
                                  onChange={(e) =>
                                    updateTemplateExerciseField(
                                      row.id,
                                      "accessory_slot",
                                      e.target.value
                                    )
                                  }
                                />
                              </td>

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
                                  value={row.accessory_equipment ?? ""}
                                  placeholder="Optional equipment"
                                  onChange={(e) =>
                                    updateTemplateExerciseField(
                                      row.id,
                                      "accessory_equipment",
                                      e.target.value
                                    )
                                  }
                                />
                              </td>

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
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

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
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

                              <td style={tableCellStyle(theme)}>
                                <input
                                  style={inputStyle(theme)}
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

                              <td style={tableCellStyle(theme)}>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    onClick={() => saveExerciseRow(row)}
                                    style={{
                                      ...primaryButtonStyle(theme),
                                      padding: "8px 10px",
                                      fontSize: 13,
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => removeExerciseRow(row.id)}
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  ...cardStyle(theme),
                  padding: 16,
                  backgroundColor: theme.surface,
                }}
              >
                <p style={smallMutedTextStyle(theme)}>Select a template.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}