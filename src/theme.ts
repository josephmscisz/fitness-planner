export type ThemeMode = "light" | "dark";

export type AppTheme = {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textSoft: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentSoft: string;
  successBg: string;
  successText: string;
  warningBg: string;
  warningText: string;
  dangerBg: string;
  dangerText: string;
  shadow: string;
  inputBg: string;
  inputText: string;
  inputBorder: string;
  buttonPrimaryBg: string;
  buttonPrimaryText: string;
  buttonSecondaryBg: string;
  buttonSecondaryText: string;
};

export const lightTheme: AppTheme = {
  mode: "light",
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  surfaceMuted: "#f8fafc",
  text: "#0f172a",
  textMuted: "#475569",
  textSoft: "#64748b",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  accent: "#2563eb",
  accentSoft: "#dbeafe",
  successBg: "#dcfce7",
  successText: "#166534",
  warningBg: "#fef3c7",
  warningText: "#92400e",
  dangerBg: "#fee2e2",
  dangerText: "#991b1b",
  shadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  inputBg: "#ffffff",
  inputText: "#0f172a",
  inputBorder: "#cbd5e1",
  buttonPrimaryBg: "#111827",
  buttonPrimaryText: "#ffffff",
  buttonSecondaryBg: "#ffffff",
  buttonSecondaryText: "#111827",
};

export const darkTheme: AppTheme = {
  mode: "dark",
  background: "#0b1220",
  surface: "#111827",
  surfaceElevated: "#172033",
  surfaceMuted: "#0f172a",
  text: "#f8fafc",
  textMuted: "#cbd5e1",
  textSoft: "#94a3b8",
  border: "#243041",
  borderStrong: "#334155",
  accent: "#60a5fa",
  accentSoft: "rgba(96,165,250,0.14)",
  successBg: "rgba(34,197,94,0.15)",
  successText: "#86efac",
  warningBg: "rgba(245,158,11,0.16)",
  warningText: "#fcd34d",
  dangerBg: "rgba(239,68,68,0.15)",
  dangerText: "#fca5a5",
  shadow: "0 16px 40px rgba(0, 0, 0, 0.32)",
  inputBg: "#0f172a",
  inputText: "#f8fafc",
  inputBorder: "#334155",
  buttonPrimaryBg: "#60a5fa",
  buttonPrimaryText: "#0b1220",
  buttonSecondaryBg: "#172033",
  buttonSecondaryText: "#f8fafc",
};