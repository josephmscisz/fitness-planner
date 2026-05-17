import { useEffect, useRef, useState } from "react";
import {
  createExercise,
  deleteExercise,
  getExercises,
  initDb,
  updateExercise,
  type ExerciseRecord,
} from "../lib/db";
import { exportExercisesCsv } from "../lib/exportExercisesCsv";
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
  const [pendingDeleteExerciseId, setPendingDeleteExerciseId] = useState<number | null>(null);

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

    setEditingExerciseName(ex.name);

    // In packaged builds, bring the edit panel into view so the click result is obvious.
    requestAnimationFrame(() => {
      editorCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }

  function clearForm() {
    setForm(emptyForm);
    setEditingExerciseName(null);
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

  async function handleCsvExport() {
    if (exercises.length === 0) {
      setExportMessage("No exercises available to export.");
      return;
    }

    try {
      setExporting(true);
      setExportMessage("");

      const result = await exportExercisesCsv(exercises);

      if (result.status === "canceled") {
        setExportMessage("CSV export canceled.");
        return;
      }

      if (result.status === "saved") {
        setExportMessage(`CSV exported (${result.rows} rows) to: ${result.path}`);
        return;
      }

      setExportMessage(
        `CSV download started (${result.rows} rows): ${result.fileName}`
      );
    } catch (err) {
      setExportMessage(
        `CSV export failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleCustomCsvExport() {
    if (exercises.length === 0) {
      setExportMessage("No exercises available to export.");
      return;
    }

    try {
      setExporting(true);
      setExportMessage("");

      const result = await exportExercisesCsv(exercises, { customOnly: true });

      if (result.status === "canceled") {
        setExportMessage("Custom CSV export canceled.");
        return;
      }

      if (result.rows === 0) {
        setExportMessage("No custom exercises found to export.");
        return;
      }

      if (result.status === "saved") {
        setExportMessage(
          `Custom CSV exported (${result.rows} rows) to: ${result.path}`
        );
        return;
      }

      setExportMessage(
        `Custom CSV download started (${result.rows} rows): ${result.fileName}`
      );
    } catch (err) {
      setExportMessage(
        `Custom CSV export failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setExporting(false);
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
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Import / Export Exercises CSV</h3>
        <p style={smallMutedTextStyle(theme)}>
          Import expected headers: module_name, exercise_name, exercise_url.
          Export includes those fields plus your full exercise metadata.
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

          <button
            type="button"
            onClick={handleCsvExport}
            disabled={exporting || loading}
            style={secondaryButtonStyle(theme)}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>

          <button
            type="button"
            onClick={handleCustomCsvExport}
            disabled={exporting || loading}
            style={secondaryButtonStyle(theme)}
          >
            {exporting ? "Exporting..." : "Export Custom CSV"}
          </button>

          {importing && (
            <span style={smallMutedTextStyle(theme)}>Importing...</span>
          )}
        </div>

        {importMessage && (
          <div style={{ marginTop: 10, color: theme.textMuted, fontSize: 14 }}>
            {importMessage}
          </div>
        )}

        {exportMessage && (
          <div style={{ marginTop: 10, color: theme.textMuted, fontSize: 14 }}>
            {exportMessage}
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
          ref={editorCardRef}
          style={{
            ...cardStyle(theme),
            padding: 16,
            backgroundColor: theme.surface,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            {form.id ? "Edit Exercise" : "Add Exercise"}
          </h3>

          {editingExerciseName && (
            <div style={{ ...smallMutedTextStyle(theme), marginBottom: 10 }}>
              Editing: {editingExerciseName}
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            <input
              ref={nameInputRef}
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
            <button type="button" onClick={handleSave} style={primaryButtonStyle(theme)}>
              {form.id ? "Update" : "Create"}
            </button>
            <button type="button" onClick={clearForm} style={secondaryButtonStyle(theme)}>
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
                            type="button"
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
                            type="button"
                            onClick={() => handleDelete(ex)}
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