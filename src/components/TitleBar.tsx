import { getCurrentWindow } from "@tauri-apps/api/window";
import type { AppTheme } from "../theme";

function withCurrentWindow(action: (appWindow: ReturnType<typeof getCurrentWindow>) => void) {
  try {
    const appWindow = getCurrentWindow();
    action(appWindow);
  } catch (error) {
    console.error("Window controls unavailable in this runtime:", error);
  }
}

export default function TitleBar({ theme }: { theme: AppTheme }) {
  const buttonBase: React.CSSProperties = {
    width: 36,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: theme.textSoft,
    fontSize: 14,
    transition: "background 0.15s ease, color 0.15s ease",
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 10px",
        backgroundColor: theme.surface,
        borderBottom: `1px solid ${theme.border}`,
        userSelect: "none",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        data-tauri-drag-region
        style={{
          fontWeight: 700,
          fontSize: 14,
          color: theme.text,
          letterSpacing: 0.2,
        }}
      >
        Bent Iron
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          title="Minimize"
          onClick={() => withCurrentWindow((appWindow) => appWindow.minimize())}
          style={buttonBase}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.surfaceElevated;
            e.currentTarget.style.color = theme.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = theme.textSoft;
          }}
        >
          ─
        </button>

        <button
          type="button"
          title="Maximize"
          onClick={() => withCurrentWindow((appWindow) => appWindow.toggleMaximize())}
          style={buttonBase}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.surfaceElevated;
            e.currentTarget.style.color = theme.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = theme.textSoft;
          }}
        >
          ☐
        </button>

        <button
          type="button"
          title="Close"
          onClick={() => withCurrentWindow((appWindow) => appWindow.close())}
          style={{ ...buttonBase, color: theme.dangerText }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.dangerBg;
            e.currentTarget.style.color = theme.dangerText;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = theme.dangerText;
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}