import { ensureWhoopBackendRunning } from "./lib/backendSidecar";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import TitleBar from "./components/TitleBar";
import { darkTheme, lightTheme, type ThemeMode } from "./theme";

const PlanToday = lazy(() => import("./pages/PlanToday"));
const ExerciseLibrary = lazy(() => import("./pages/ExerciseLibrary"));
const History = lazy(() => import("./pages/History"));
const ExerciseManager = lazy(() => import("./pages/ExerciseManager"));
const TemplateManager = lazy(() => import("./pages/TemplateManager"));

type Page =
  | "planner"
  | "library"
  | "history"
  | "exerciseManager"
  | "templateManager";

function resolveWhoopBackendBase(rawBase: string) {
  if (!rawBase) {
    return "http://127.0.0.1:8787";
  }

  return /^https?:\/\//i.test(rawBase)
    ? rawBase.replace(/\/$/, "")
    : `https://${rawBase.replace(/\/$/, "")}`;
}

function readWhoopBackendHost(baseUrl: string) {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isTauriRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  );
}

function isMacTauriRuntime() {
  if (!isTauriRuntime() || typeof navigator === "undefined") {
    return false;
  }

  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

function App() {
  const [page, setPage] = useState<Page>("planner");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const runningInTauri = isTauriRuntime();
  const showCustomTitleBar = !runningInTauri;
  const useMacOverlayChrome = isMacTauriRuntime();

  const rawWhoopBackendBase =
    (import.meta.env.VITE_WHOOP_BACKEND_BASE as string | undefined)?.trim() ||
    "";
  const resolvedWhoopBackendBase = resolveWhoopBackendBase(rawWhoopBackendBase);
  const whoopBackendHost = readWhoopBackendHost(resolvedWhoopBackendBase);
  const packagedDesktopBuild = import.meta.env.PROD && isTauriRuntime();
  const invalidPackagedBackendTarget =
    packagedDesktopBuild &&
    (!rawWhoopBackendBase ||
      whoopBackendHost === "localhost" ||
      whoopBackendHost === "127.0.0.1");

  useEffect(() => {
    if (invalidPackagedBackendTarget) {
      console.warn(
        "Packaged build is configured with an invalid WHOOP backend URL.",
        {
          configuredBase: rawWhoopBackendBase || "(missing)",
          resolvedBase: resolvedWhoopBackendBase,
        }
      );
      return;
    }

    ensureWhoopBackendRunning()
      .then(() => {
        console.log("WHOOP backend startup requested successfully.");
      })
      .catch((err) => {
        console.error("Failed to start WHOOP backend sidecar:", err);
        alert(`Failed to start WHOOP backend: ${String(err)}`);
      });
  }, [
    invalidPackagedBackendTarget,
    rawWhoopBackendBase,
    resolvedWhoopBackendBase,
  ]);

  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
    document.body.style.backgroundColor =
      themeMode === "dark" ? "#0b1220" : "#f8fafc";
  }, [themeMode]);

  const theme = useMemo(
    () => (themeMode === "dark" ? darkTheme : lightTheme),
    [themeMode]
  );

  const navBackgroundColor = useMacOverlayChrome
    ? themeMode === "dark"
      ? "rgba(17, 24, 39, 0.72)"
      : "rgba(255, 255, 255, 0.72)"
    : theme.surface;

  const navBorderColor = useMacOverlayChrome
    ? themeMode === "dark"
      ? "rgba(148, 163, 184, 0.22)"
      : "rgba(100, 116, 139, 0.18)"
    : theme.border;

  const macNavButtonBorder = themeMode === "dark"
    ? "rgba(148, 163, 184, 0.22)"
    : "rgba(100, 116, 139, 0.2)";

  const macNavButtonBg = themeMode === "dark"
    ? "rgba(15, 23, 42, 0.4)"
    : "rgba(255, 255, 255, 0.5)";

  const macNavButtonActiveBg = themeMode === "dark"
    ? "rgba(96, 165, 250, 0.14)"
    : "rgba(37, 99, 235, 0.12)";

  const navButtonHoverBg = useMacOverlayChrome
    ? themeMode === "dark"
      ? "rgba(148, 163, 184, 0.12)"
      : "rgba(100, 116, 139, 0.12)"
    : theme.surfaceElevated;

  const navButtonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${useMacOverlayChrome ? macNavButtonBorder : theme.borderStrong}`,
    backgroundColor: useMacOverlayChrome ? macNavButtonBg : theme.buttonSecondaryBg,
    color: useMacOverlayChrome ? theme.text : theme.buttonSecondaryText,
    cursor: "pointer",
    fontWeight: useMacOverlayChrome ? 450 : 500,
    transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  };

  const activeNavButtonStyle: React.CSSProperties = {
    ...navButtonStyle,
    backgroundColor: useMacOverlayChrome ? macNavButtonActiveBg : theme.accentSoft,
    color: useMacOverlayChrome ? theme.text : theme.accent,
    border: `1px solid ${useMacOverlayChrome ? macNavButtonBorder : theme.borderStrong}`,
  };

  function getNavStyle(target: Page) {
    return page === target ? activeNavButtonStyle : navButtonStyle;
  }

  const loadingPanel = (
    <div style={{ padding: 24, color: theme.textMuted, fontSize: 14 }}>Loading page...</div>
  );

  return (
    <div
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        backgroundColor: theme.background,
        color: theme.text,
        minHeight: "100vh",
      }}
    >
      {showCustomTitleBar && <TitleBar theme={theme} />}

      {invalidPackagedBackendTarget && (
        <div
          style={{
            margin: "12px 16px 0",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #f59e0b",
            backgroundColor: "#fffbeb",
            color: "#92400e",
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          <strong>WHOOP backend is not configured for this packaged app.</strong>
          <div style={{ marginTop: 6 }}>
            Set <code>VITE_WHOOP_BACKEND_BASE</code> to your Railway service URL
            (not localhost) before packaging.
          </div>
          <div style={{ marginTop: 6 }}>
            Current value: {rawWhoopBackendBase || "(missing)"}
          </div>
        </div>
      )}

      <nav
        style={{
          display: "flex",
          gap: 12,
          paddingTop: useMacOverlayChrome ? 44 : 16,
          paddingRight: 16,
          paddingBottom: 16,
          paddingLeft: useMacOverlayChrome ? 92 : 16,
          flexWrap: "wrap",
          borderBottom: `1px solid ${navBorderColor}`,
          backgroundColor: navBackgroundColor,
          position: "sticky",
          top: showCustomTitleBar ? 40 : 0,
          zIndex: 9,
          backdropFilter: useMacOverlayChrome ? "blur(18px) saturate(160%)" : "blur(10px)",
          WebkitBackdropFilter: useMacOverlayChrome
            ? "blur(18px) saturate(160%)"
            : "blur(10px)",
          boxShadow: useMacOverlayChrome
            ? themeMode === "dark"
              ? "0 6px 18px rgba(0, 0, 0, 0.25)"
              : "0 6px 18px rgba(15, 23, 42, 0.08)"
            : "none",
        }}
      >
        <button
          style={getNavStyle("planner")}
          onClick={() => setPage("planner")}
          onMouseEnter={(e) => {
            if (page !== "planner") {
              e.currentTarget.style.backgroundColor = navButtonHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (page !== "planner") {
              e.currentTarget.style.backgroundColor =
                useMacOverlayChrome ? macNavButtonBg : theme.buttonSecondaryBg;
            }
          }}
        >
          Plan Today
        </button>

        <button
          style={getNavStyle("library")}
          onClick={() => setPage("library")}
          onMouseEnter={(e) => {
            if (page !== "library") {
              e.currentTarget.style.backgroundColor = navButtonHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (page !== "library") {
              e.currentTarget.style.backgroundColor =
                useMacOverlayChrome ? macNavButtonBg : theme.buttonSecondaryBg;
            }
          }}
        >
          Library
        </button>

        <button
          style={getNavStyle("history")}
          onClick={() => setPage("history")}
          onMouseEnter={(e) => {
            if (page !== "history") {
              e.currentTarget.style.backgroundColor = navButtonHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (page !== "history") {
              e.currentTarget.style.backgroundColor =
                useMacOverlayChrome ? macNavButtonBg : theme.buttonSecondaryBg;
            }
          }}
        >
          History
        </button>

        <button
          style={getNavStyle("exerciseManager")}
          onClick={() => setPage("exerciseManager")}
          onMouseEnter={(e) => {
            if (page !== "exerciseManager") {
              e.currentTarget.style.backgroundColor = navButtonHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (page !== "exerciseManager") {
              e.currentTarget.style.backgroundColor =
                useMacOverlayChrome ? macNavButtonBg : theme.buttonSecondaryBg;
            }
          }}
        >
          Exercise Manager
        </button>

        <button
          style={getNavStyle("templateManager")}
          onClick={() => setPage("templateManager")}
          onMouseEnter={(e) => {
            if (page !== "templateManager") {
              e.currentTarget.style.backgroundColor = navButtonHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (page !== "templateManager") {
              e.currentTarget.style.backgroundColor =
                useMacOverlayChrome ? macNavButtonBg : theme.buttonSecondaryBg;
            }
          }}
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

      <Suspense fallback={loadingPanel}>
        {page === "planner" && <PlanToday theme={theme} />}
        {page === "library" && <ExerciseLibrary theme={theme} />}
        {page === "history" && <History theme={theme} />}
        {page === "exerciseManager" && <ExerciseManager theme={theme} />}
        {page === "templateManager" && <TemplateManager theme={theme} />}
      </Suspense>
    </div>
  );
}

export default App;