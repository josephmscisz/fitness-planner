import { Command } from "@tauri-apps/plugin-shell";

let backendStarted = false;

function shouldUseLocalSidecar() {
  const rawBase =
    (import.meta.env.VITE_WHOOP_BACKEND_BASE as string | undefined) ||
    "http://127.0.0.1:8787";

  const normalizedBase = /^https?:\/\//i.test(rawBase)
    ? rawBase
    : `https://${rawBase}`;

  try {
    const host = new URL(normalizedBase).hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    // If URL parsing fails, preserve old behavior and attempt local sidecar.
    return true;
  }
}

export async function ensureWhoopBackendRunning() {
  if (backendStarted) {
    console.log("WHOOP backend already marked as started.");
    return;
  }

  if (!shouldUseLocalSidecar()) {
    console.log("WHOOP backend configured as remote; skipping local sidecar startup.");
    backendStarted = true;
    return;
  }

  console.log("Starting WHOOP backend sidecar...");

  const redirectUri =
    import.meta.env.VITE_WHOOP_REDIRECT_URI ||
    "https://movie-catatonic-carmaker.ngrok-free.dev/whoop/callback";

  const clientId = import.meta.env.VITE_WHOOP_CLIENT_ID || "";
  const clientSecret = import.meta.env.VITE_WHOOP_CLIENT_SECRET || "";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing VITE_WHOOP_CLIENT_ID or VITE_WHOOP_CLIENT_SECRET in root .env"
    );
  }

  try {
    const command = Command.sidecar("binaries/whoop-backend", [], {
      env: {
        PORT: "8787",
        WHOOP_REDIRECT_URI: redirectUri,
        WHOOP_CLIENT_ID: clientId,
        WHOOP_CLIENT_SECRET: clientSecret,
      },
    });

    command.stdout.on("data", (line) => {
      console.log("[WHOOP BACKEND STDOUT]", line);
    });

    command.stderr.on("data", (line) => {
      console.error("[WHOOP BACKEND STDERR]", line);
    });

    const child = await command.spawn();

    console.log("WHOOP backend sidecar spawned:", child.pid);

    backendStarted = true;
  } catch (err) {
    console.error("WHOOP backend sidecar failed to start:", err);
    throw err;
  }
}