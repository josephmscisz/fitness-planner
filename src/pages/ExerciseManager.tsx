import { useEffect, useState } from "react";
import {
  createExercise,
  deleteExercise,
  getExercises,
  initDb,
  updateExercise,
  type ExerciseRecord,
} from "../lib/db";
import { importExercisesCsvText } from "../lib/importExercisesCsv";
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

export default function ExerciseManager({ theme }: { theme: AppTheme }) {
  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [form, setForm] = useState<ExerciseForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

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

  async function handleCsvImport(file: File | null) {
    if (!file) return;

    try {
      setImporting(true);
      setImportMessage("");

      const text = await file.text();
      const result = await importExercisesCsvText(text);

      setImportMessage(
        `Import complete. Created: ${result.created}, Updated: ${result.updated}, Skipped: ${result.skipped}${
          result.errors.length > 0 ? `, Errors: ${result.errors.length}` : ""
        }`
      );

      await loadExercises();
    } catch (err) {
      setImportMessage(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div style={pageStyle(theme)}>
      <h1 style={{ marginBottom: 8 }}>Exercise Manager</h1>
      <p style={smallMutedTextStyle(theme)}>
        Create, edit, and organize your exercise library, including foundation
        vs accessory role, priority, slot, tutorial links, and CSV import.
      </p>

      <div
        style={{
          ...cardStyle(theme),
          padding: 16,
          marginTop: 20,
          backgroundColor: theme.surface,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Import Exercises CSV</h3>
        <p style={smallMutedTextStyle(theme)}>
          Expected headers: module_name, exercise_name, exercise_url
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => handleCsvImport(e.target.files?.[0] ?? null)}
            style={{ color: theme.text }}
          />

          {importing && (
            <span style={smallMutedTextStyle(theme)}>Importing...</span>
          )}
        </div>

        {importMessage && (
          <div style={{ marginTop: 10, color: theme.textMuted, fontSize: 14 }}>
            {importMessage}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
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
          <h3 style={{ marginTop: 0 }}>
            {form.id ? "Edit Exercise" : "Add Exercise"}
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <input
              style={inputStyle(theme)}
              placeholder="Name"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
            />

            <input
              style={inputStyle(theme)}
              placeholder="Category / Body Part"
              value={form.category}
              onChange={(e) => updateForm("category", e.target.value)}
            />

            <input
              style={inputStyle(theme)}
              placeholder="Movement Pattern"
              value={form.movementPattern}
              onChange={(e) => updateForm("movementPattern", e.target.value)}
            />

            <input
              style={inputStyle(theme)}
              placeholder="Primary Muscles"
              value={form.primaryMuscles}
              onChange={(e) => updateForm("primaryMuscles", e.target.value)}
            />

            <input
              style={inputStyle(theme)}
              placeholder="Equipment"
              value={form.equipment}
              onChange={(e) => updateForm("equipment", e.target.value)}
            />

            <select
              style={inputStyle(theme)}
              value={form.roleType}
              onChange={(e) => {
                const value = e.target.value;
                updateForm("roleType", value);

                if (value === "foundation") {
                  updateForm("accessoryPriority", "0");
                  updateForm("accessorySlot", "");
                } else if (form.accessoryPriority === "0") {
                  updateForm("accessoryPriority", "5");
                }
              }}
            >
              <option value="foundation">Foundation</option>
              <option value="accessory">Accessory</option>
            </select>

            {form.roleType === "accessory" && (
              <>
                <input
                  style={inputStyle(theme)}
                  type="number"
                  min={0}
                  max={10}
                  placeholder="Accessory Priority (0-10)"
                  value={form.accessoryPriority}
                  onChange={(e) =>
                    updateForm("accessoryPriority", e.target.value)
                  }
                />

                <input
                  style={inputStyle(theme)}
                  placeholder="Accessory Slot (e.g. upper_back, triceps, lateral_delts)"
                  value={form.accessorySlot}
                  onChange={(e) => updateForm("accessorySlot", e.target.value)}
                />
              </>
            )}

            <input
              style={inputStyle(theme)}
              placeholder="Tutorial URL"
              value={form.tutorialUrl}
              onChange={(e) => updateForm("tutorialUrl", e.target.value)}
            />

            <textarea
              style={{
                ...inputStyle(theme),
                minHeight: 100,
                resize: "vertical",
              }}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
              rows={4}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button onClick={handleSave} style={primaryButtonStyle(theme)}>
              {form.id ? "Update" : "Create"}
            </button>
            <button onClick={clearForm} style={secondaryButtonStyle(theme)}>
              Clear
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
          <h3 style={{ marginTop: 0 }}>Exercises</h3>

          {loading ? (
            <p style={smallMutedTextStyle(theme)}>Loading...</p>
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
                  width: "100%",
                  minWidth: 980,
                  borderCollapse: "collapse",
                  backgroundColor: theme.surface,
                }}
              >
                <thead>
                  <tr>
                    <th style={tableHeaderStyle(theme)}>Name</th>
                    <th style={tableHeaderStyle(theme)}>Category</th>
                    <th style={tableHeaderStyle(theme)}>Role</th>
                    <th style={tableHeaderStyle(theme)}>Priority</th>
                    <th style={tableHeaderStyle(theme)}>Slot</th>
                    <th style={tableHeaderStyle(theme)}>Equipment</th>
                    <th style={tableHeaderStyle(theme)}>Tutorial</th>
                    <th style={tableHeaderStyle(theme)}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises.map((ex) => (
                    <tr key={ex.id}>
                      <td style={tableCellStyle(theme)}>
                        <strong>{ex.name}</strong>
                      </td>
                      <td style={tableCellStyle(theme)}>{ex.category}</td>
                      <td style={tableCellStyle(theme)}>{ex.role_type ?? ""}</td>
                      <td style={tableCellStyle(theme)}>
                        {ex.role_type === "accessory"
                          ? ex.accessory_priority ?? ""
                          : "—"}
                      </td>
                      <td style={tableCellStyle(theme)}>
                        {ex.accessory_slot ?? ""}
                      </td>
                      <td style={tableCellStyle(theme)}>{ex.equipment ?? ""}</td>
                      <td style={tableCellStyle(theme)}>
                        {ex.tutorial_url ? (
                          <a
                            href={ex.tutorial_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: theme.accent }}
                          >
                            Open
                          </a>
                        ) : (
                          <span style={smallMutedTextStyle(theme)}>—</span>
                        )}
                      </td>
                      <td style={tableCellStyle(theme)}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => editExercise(ex)}
                            style={{
                              ...secondaryButtonStyle(theme),
                              padding: "8px 10px",
                              fontSize: 13,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(ex.id)}
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
        </div>
      </div>
    </div>
  );
}