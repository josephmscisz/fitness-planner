import { useEffect, useMemo, useState } from "react";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import PlanToday from "./pages/PlanToday";
import History from "./pages/History";
import ExerciseManager from "./pages/ExerciseManager";
import TemplateManager from "./pages/TemplateManager";
import TitleBar from "./components/TitleBar";
import { darkTheme, lightTheme, type ThemeMode } from "./theme";

type Page =
  | "planner"
  | "library"
  | "history"
  | "exerciseManager"
  | "templateManager";

function App() {
  const [page, setPage] = useState<Page>("planner");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("themeMode");
    if (saved === "light" || saved === "dark") {
      setThemeMode(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
    document.body.style.backgroundColor =
      themeMode === "dark" ? "#0b1220" : "#f8fafc";
  }, [themeMode]);

  const theme = useMemo(
    () => (themeMode === "dark" ? darkTheme : lightTheme),
    [themeMode]
  );

  const navButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.borderStrong}`,
    backgroundColor: theme.buttonSecondaryBg,
    color: theme.buttonSecondaryText,
    cursor: "pointer",
    fontWeight: 500,
  };

  const activeNavButtonStyle: React.CSSProperties = {
    ...navButtonStyle,
    backgroundColor: theme.accentSoft,
    color: theme.accent,
    border: `1px solid ${theme.borderStrong}`,
  };

  function getNavStyle(target: Page) {
    return page === target ? activeNavButtonStyle : navButtonStyle;
  }

  return (
    <div
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        backgroundColor: theme.background,
        color: theme.text,
        minHeight: "100vh",
      }}
    >
      <TitleBar theme={theme} />

      <nav
        style={{
          display: "flex",
          gap: 12,
          padding: 16,
          flexWrap: "wrap",
          borderBottom: `1px solid ${theme.border}`,
          backgroundColor: theme.surface,
          position: "sticky",
          top: 40,
          zIndex: 9,
          backdropFilter: "blur(10px)",
        }}
      >
        <button style={getNavStyle("planner")} onClick={() => setPage("planner")}>
          Plan Today
        </button>

        <button style={getNavStyle("library")} onClick={() => setPage("library")}>
          Library
        </button>

        <button style={getNavStyle("history")} onClick={() => setPage("history")}>
          History
        </button>

        <button
          style={getNavStyle("exerciseManager")}
          onClick={() => setPage("exerciseManager")}
        >
          Exercise Manager
        </button>

        <button
          style={getNavStyle("templateManager")}
          onClick={() => setPage("templateManager")}
        >
          Template Manager
        </button>

        <div style={{ marginLeft: "auto" }}>
          <button
            style={navButtonStyle}
            onClick={() =>
              setThemeMode((current) => (current === "light" ? "dark" : "light"))
            }
          >
            {themeMode === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </nav>

      {page === "planner" && <PlanToday theme={theme} />}
      {page === "library" && <ExerciseLibrary theme={theme} />}
      {page === "history" && <History theme={theme} />}
      {page === "exerciseManager" && <ExerciseManager theme={theme} />}
      {page === "templateManager" && <TemplateManager theme={theme} />}
    </div>
  );
}

export default App;