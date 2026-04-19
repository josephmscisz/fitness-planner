import { save } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import { appConfigDir, join } from "@tauri-apps/api/path";

const DB_FILENAME = "fitness.db";

export async function getDatabaseAbsolutePath(): Promise<string> {
  const configDir = await appConfigDir();
  return await join(configDir, DB_FILENAME);
}

export async function exportDatabaseBackup(): Promise<string | null> {
  const sourcePath = await getDatabaseAbsolutePath();

  const targetPath = await save({
    defaultPath: "iron-log-backup.db",
    filters: [
      {
        name: "SQLite Database",
        extensions: ["db", "sqlite"],
      },
    ],
  });

  if (!targetPath) {
    return null;
  }

  await copyFile(sourcePath, targetPath);
  return targetPath;
}