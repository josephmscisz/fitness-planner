import { useEffect, useState } from "react";
import {
  getExercises,
  initDb,
  type Exercise,
} from "../lib/db";
import {
  exportDatabaseBackup,
  getDatabaseAbsolutePath,
} from "../lib/databaseMaintenance";
import type { AppTheme } from "../theme";
import {
  cardStyle,
  inputStyle,
  pageStyle,
  primaryButtonStyle,
  smallMutedTextStyle,
  tableCellStyle,
  tableHeaderStyle,
} from "../themeStyles";

export default function ExerciseLibrary({ theme }: { theme: AppTheme }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filtered, setFiltered] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbPath, setDbPath] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [backingUp, setBackingUp] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    loadExercises();
    loadDbPath();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, categoryFilter, equipmentFilter, roleFilter, exercises]);

  async function loadExercises() {
    setLoading(true);
    await initDb();
    const rows = await getExercises();
    setExercises(rows);
    setLoading(false);
  }

  async function loadDbPath() {
    const path = await getDatabaseAbsolutePath();
    setDbPath(path);
  }

  async function handleBackupExport() {
    try {
      setBackingUp(true);
      setBackupMessage("");

      const exportedTo = await exportDatabaseBackup();

      if (!exportedTo) {
        setBackupMessage("Backup export canceled.");
        return;
      }

      setBackupMessage(`Backup exported to: ${exportedTo}`);
    } catch (err) {
      setBackupMessage(
        `Backup failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setBackingUp(false);
    }
  }

  function applyFilters() {
    const searchLower = search.trim().toLowerCase();

    const next = exercises.filter((exercise) => {
      const matchesSearch =
        !searchLower ||
        exercise.name.toLowerCase().includes(searchLower) ||
        (exercise.category ?? "").toLowerCase().includes(searchLower) ||
        (exercise.primary_muscles ?? "").toLowerCase().includes(searchLower) ||
        (exercise.equipment ?? "").toLowerCase().includes(searchLower) ||
        (exercise.accessory_slot ?? "").toLowerCase().includes(searchLower);

      const matchesCategory =
        !categoryFilter || exercise.category === categoryFilter;

      const matchesEquipment =
        !equipmentFilter || exercise.equipment === equipmentFilter;

      const matchesRole =
        !roleFilter || exercise.role_type === roleFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesEquipment &&
        matchesRole
      );
    });

    setFiltered(next);
  }

  const categories = [...new Set(
    exercises
      .map((e) => e.category)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  )].sort();

  const equipmentOptions = [...new Set(
    exercises
      .map((e) => e.equipment)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  )].sort();

  return (
    <div style={pageStyle(theme)}>
      <h1 style={{ marginBottom: 8 }}>Exercise Library</h1>
      <p style={smallMutedTextStyle(theme)}>
        Browse your exercise database, including role, slot, equipment, and tutorial links.
      </p>

      <div
        style={{
          ...cardStyle(theme),
          padding: 16,
          marginTop: 20,
          backgroundColor: theme.surface,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 280 }}>
            <div style={{ ...smallMutedTextStyle(theme), marginBottom: 4 }}>
              Local database
            </div>
            <div
              style={{
                fontSize: 12,
                color: theme.textMuted,
                wordBreak: "break-all",
              }}
            >
              {dbPath || "Loading database path..."}
            </div>
          </div>

          <button
            onClick={handleBackupExport}
            disabled={backingUp}
            style={{
              ...primaryButtonStyle(theme),
              opacity: backingUp ? 0.7 : 1,
            }}
          >
            {backingUp ? "Exporting..." : "Export DB Backup"}
          </button>
        </div>

        {backupMessage && (
          <div style={{ marginTop: 10, color: theme.textMuted, fontSize: 13 }}>
            {backupMessage}
          </div>
        )}
      </div>

      <div
        style={{
          ...cardStyle(theme),
          padding: 16,
          marginTop: 20,
          backgroundColor: theme.surface,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <input
            style={inputStyle(theme)}
            placeholder="Search exercises"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            style={inputStyle(theme)}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            style={inputStyle(theme)}
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
          >
            <option value="">All equipment</option>
            {equipmentOptions.map((equipment) => (
              <option key={equipment} value={equipment}>
                {equipment}
              </option>
            ))}
          </select>

          <select
            style={inputStyle(theme)}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All roles</option>
            <option value="foundation">Foundation</option>
            <option value="accessory">Accessory</option>
          </select>
        </div>
      </div>

      <div
        style={{
          ...cardStyle(theme),
          padding: 16,
          marginTop: 20,
          backgroundColor: theme.surface,
        }}
      >
        <div style={{ marginBottom: 12, color: theme.textMuted }}>
          {loading ? "Loading..." : `${filtered.length} exercise(s)`}
        </div>

        {loading ? (
          <p style={smallMutedTextStyle(theme)}>Loading exercises...</p>
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
                minWidth: 1200,
                borderCollapse: "collapse",
                backgroundColor: theme.surface,
              }}
            >
              <thead>
                <tr>
                  <th style={tableHeaderStyle(theme)}>Name</th>
                  <th style={tableHeaderStyle(theme)}>Category</th>
                  <th style={tableHeaderStyle(theme)}>Role</th>
                  <th style={tableHeaderStyle(theme)}>Accessory Slot</th>
                  <th style={tableHeaderStyle(theme)}>Priority</th>
                  <th style={tableHeaderStyle(theme)}>Movement Pattern</th>
                  <th style={tableHeaderStyle(theme)}>Primary Muscles</th>
                  <th style={tableHeaderStyle(theme)}>Equipment</th>
                  <th style={tableHeaderStyle(theme)}>Tutorial</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exercise) => (
                  <tr key={exercise.id}>
                    <td style={tableCellStyle(theme)}>
                      <strong>{exercise.name}</strong>
                    </td>
                    <td style={tableCellStyle(theme)}>{exercise.category}</td>
                    <td style={tableCellStyle(theme)}>
                      {exercise.role_type ?? "—"}
                    </td>
                    <td style={tableCellStyle(theme)}>
                      {exercise.accessory_slot ?? "—"}
                    </td>
                    <td style={tableCellStyle(theme)}>
                      {exercise.role_type === "accessory"
                        ? (exercise.accessory_priority ?? "—")
                        : "—"}
                    </td>
                    <td style={tableCellStyle(theme)}>
                      {exercise.movement_pattern ?? "—"}
                    </td>
                    <td style={tableCellStyle(theme)}>
                      {exercise.primary_muscles ?? "—"}
                    </td>
                    <td style={tableCellStyle(theme)}>
                      {exercise.equipment ?? "—"}
                    </td>
                    <td style={tableCellStyle(theme)}>
                      {exercise.tutorial_url ? (
                        <a
                          href={exercise.tutorial_url}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}