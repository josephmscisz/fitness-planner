
// DIAGNOSTIC: Confirm main.tsx is running
console.log("[DIAGNOSTIC] src/main.tsx loaded");
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}

// Wrap dynamic import in try/catch to surface fatal errors
let App: React.LazyExoticComponent<React.ComponentType<any>> | null = null;
try {
  App = React.lazy(() => import("./App"));
} catch (err) {
  const el = document.getElementById("fatal-error");
  if (el) {
    el.style.display = "block";
    el.textContent = "Fatal import error: " + formatUnknownError(err);
  }
  throw err;
}

type StartupBoundaryState = {
  error: string | null;
};

class StartupBoundary extends React.Component<
  { children: React.ReactNode },
  StartupBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): StartupBoundaryState {
    return { error: String(error) };
  }

  componentDidCatch(error: unknown) {
    console.error("Startup boundary caught error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#0b1220",
            color: "#e2e8f0",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: 20 }}>
            Bent Iron failed to start
          </h1>
          <p style={{ margin: "0 0 12px", color: "#94a3b8" }}>
            A renderer error occurred during startup.
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: 12,
              color: "#fda4af",
            }}
          >
            {this.state.error}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function renderFatalStartupError(message: string) {
  const root = document.getElementById("root");
  if (!root) {
    return;
  }

  root.innerHTML = `
    <div style="
      min-height: 100vh;
      background: #0b1220;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
      padding: 24px;
      box-sizing: border-box;
    ">
      <h1 style="margin: 0 0 12px; font-size: 20px;">Bent Iron failed to start</h1>
      <p style="margin: 0 0 12px; color: #94a3b8;">A renderer error occurred during startup.</p>
      <pre style="
        white-space: pre-wrap;
        word-break: break-word;
        background: #111827;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 12px;
        color: #fda4af;
      ">${message}</pre>
    </div>
  `;
}

window.addEventListener("error", (event) => {
  renderFatalStartupError(String(event.error ?? event.message));
});

window.addEventListener("unhandledrejection", (event) => {
  renderFatalStartupError(String(event.reason));
});

try {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <StartupBoundary>
        <Suspense
          fallback={
            <div style={{ padding: 24, color: "#e2e8f0", background: "#0b1220" }}>
              Loading Bent Iron...
            </div>
          }
        >
          <App />
        </Suspense>
      </StartupBoundary>
    </React.StrictMode>,
  );
} catch (error) {
  renderFatalStartupError(String(error));
}
