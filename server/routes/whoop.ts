import { Router } from "express";
import crypto from "crypto";

const router = Router();

const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID || "";
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || "";
const WHOOP_REDIRECT_URI =
  process.env.WHOOP_REDIRECT_URI || "http://localhost:8787/whoop/callback";

type TokenStore = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  providerUserId?: string;
};

const tokenStore: TokenStore = {};

// For a single-user local dev flow, in-memory state is fine for now.
let pendingOAuthState = "";

function generateState() {
  // 32 hex chars, comfortably above WHOOP's minimum 8-char requirement.
  return crypto.randomBytes(16).toString("hex");
}

function getAuthUrl() {
  pendingOAuthState = generateState();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: WHOOP_CLIENT_ID,
    redirect_uri: WHOOP_REDIRECT_URI,
    scope: "read:recovery read:sleep read:workout offline",
    state: pendingOAuthState,
  });

  return `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;
}

async function exchangeCodeForToken(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: WHOOP_CLIENT_ID,
    client_secret: WHOOP_CLIENT_SECRET,
    redirect_uri: WHOOP_REDIRECT_URI,
  });

  const response = await fetch(
    "https://api.prod.whoop.com/oauth/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WHOOP token exchange failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function refreshAccessToken() {
  if (!tokenStore.refreshToken) {
    throw new Error("No WHOOP refresh token available.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokenStore.refreshToken,
    client_id: WHOOP_CLIENT_ID,
    client_secret: WHOOP_CLIENT_SECRET,
  });

  const response = await fetch(
    "https://api.prod.whoop.com/oauth/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WHOOP token refresh failed: ${response.status} ${text}`);
  }

  const json = await response.json();

  tokenStore.accessToken = json.access_token;
  tokenStore.refreshToken = json.refresh_token ?? tokenStore.refreshToken;
  tokenStore.scope = json.scope ?? tokenStore.scope;

  if (json.expires_in) {
    const expiresAt = new Date(Date.now() + Number(json.expires_in) * 1000);
    tokenStore.expiresAt = expiresAt.toISOString();
  }

  return tokenStore.accessToken;
}

async function getValidAccessToken() {
  if (!tokenStore.accessToken) {
    throw new Error("WHOOP is not connected.");
  }

  if (!tokenStore.expiresAt) {
    return tokenStore.accessToken;
  }

  const expiresAtMs = new Date(tokenStore.expiresAt).getTime();
  const soonMs = Date.now() + 60_000;

  if (expiresAtMs <= soonMs) {
    return refreshAccessToken();
  }

  return tokenStore.accessToken;
}

async function whoopGet(path: string) {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`https://api.prod.whoop.com${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WHOOP GET ${path} failed: ${response.status} ${text}`);
  }

  return response.json();
}

router.get("/connect", (_req, res) => {
  if (!WHOOP_CLIENT_ID || !WHOOP_CLIENT_SECRET || !WHOOP_REDIRECT_URI) {
    res
      .status(500)
      .send("WHOOP environment variables are missing. Check server/.env.");
    return;
  }

  const url = getAuthUrl();
  console.log("WHOOP AUTH URL:", url);
  console.log("WHOOP STATE:", pendingOAuthState);
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  console.log("WHOOP CALLBACK QUERY:", req.query);

  try {
    const code = String(req.query.code || "");
    const returnedState = String(req.query.state || "");
    const error = String(req.query.error || "");
    const errorDescription = String(req.query.error_description || "");

    if (error) {
      res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; padding: 24px;">
            <h2>WHOOP authorization failed</h2>
            <p><strong>Error:</strong> ${error}</p>
            <p><strong>Description:</strong> ${errorDescription || "No description provided."}</p>
          </body>
        </html>
      `);
      return;
    }

    if (!returnedState || returnedState !== pendingOAuthState) {
      res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; padding: 24px;">
            <h2>WHOOP authorization failed</h2>
            <p>State validation failed.</p>
          </body>
        </html>
      `);
      return;
    }

    if (!code) {
      res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; padding: 24px;">
            <h2>WHOOP authorization failed</h2>
            <p>Missing authorization code.</p>
          </body>
        </html>
      `);
      return;
    }

    const tokenResponse = await exchangeCodeForToken(code);

    tokenStore.accessToken = tokenResponse.access_token;
    tokenStore.refreshToken = tokenResponse.refresh_token;
    tokenStore.scope = tokenResponse.scope;

    if (tokenResponse.expires_in) {
      const expiresAt = new Date(Date.now() + Number(tokenResponse.expires_in) * 1000);
      tokenStore.expiresAt = expiresAt.toISOString();
    }

    // Clear state after successful auth
    pendingOAuthState = "";

    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 24px;">
          <h2>WHOOP connected</h2>
          <p>You can return to Iron Log and click Sync WHOOP.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; padding: 24px;">
          <h2>WHOOP callback failed</h2>
          <p>${err instanceof Error ? err.message : String(err)}</p>
        </body>
      </html>
    `);
  }
});

router.get("/status", (_req, res) => {
  res.json({
    connected: !!tokenStore.accessToken,
  });
});

router.post("/refresh", async (_req, res) => {
  try {
    await refreshAccessToken();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

router.post("/sync", async (_req, res) => {
  try {
    console.log("WHOOP SYNC START");

    if (!tokenStore.accessToken) {
      console.log("WHOOP SYNC: no access token");
      res.status(400).json({
        connected: false,
        error: "WHOOP not connected.",
      });
      return;
    }

    const [recovery, sleep, workouts] = await Promise.all([
      whoopGet("/developer/v2/recovery?limit=1"),
      whoopGet("/developer/v2/activity/sleep?limit=1"),
      whoopGet("/developer/v2/activity/workout?limit=25"),
    ]);

    console.log("WHOOP SYNC RAW RECOVERY:", JSON.stringify(recovery, null, 2));
    console.log("WHOOP SYNC RAW SLEEP:", JSON.stringify(sleep, null, 2));
    console.log("WHOOP SYNC RAW WORKOUTS:", JSON.stringify(workouts, null, 2));

    const latestRecovery = Array.isArray(recovery?.records)
      ? recovery.records[0]
      : Array.isArray(recovery)
      ? recovery[0]
      : null;

    const latestSleep = Array.isArray(sleep?.records)
      ? sleep.records[0]
      : Array.isArray(sleep)
      ? sleep[0]
      : null;

    const workoutRows = Array.isArray(workouts?.records)
      ? workouts.records
      : Array.isArray(workouts)
      ? workouts
      : [];

    const responsePayload = {
      connected: true,
      connection: {
        providerUserId: tokenStore.providerUserId ?? null,
        scope: tokenStore.scope ?? null,
        expiresAt: tokenStore.expiresAt ?? null,
      },
      latestMetric:
        latestRecovery || latestSleep
          ? {
              metricDate:
                latestRecovery?.created_at?.slice(0, 10) ??
                latestSleep?.created_at?.slice(0, 10) ??
                new Date().toISOString().slice(0, 10),
              recoveryScore:
                latestRecovery?.score?.recovery_score ??
                latestRecovery?.recovery_score ??
                null,
              sleepPerformance:
                latestSleep?.score?.sleep_performance_percentage ??
                latestSleep?.sleep_performance ??
                null,
              sleepDurationMins:
                latestSleep?.score?.stage_summary?.total_in_bed_time_milli != null
                  ? Math.round(
                      latestSleep.score.stage_summary.total_in_bed_time_milli / 60000
                    )
                  : null,
              hrv:
                latestRecovery?.score?.hrv_rmssd_milli ??
                latestRecovery?.hrv ??
                null,
              restingHr:
                latestRecovery?.score?.resting_heart_rate ??
                latestRecovery?.resting_heart_rate ??
                null,
              rawJson: JSON.stringify({
                recovery: latestRecovery ?? null,
                sleep: latestSleep ?? null,
              }),
            }
          : null,
      workouts: workoutRows.map((workout: any) => ({
        whoopWorkoutId: String(workout.id ?? workout.workout_id ?? ""),
        startTime: workout.start ?? workout.start_time ?? workout.created_at ?? "",
        endTime: workout.end ?? workout.end_time ?? null,
        sportName:
          workout.sport_name ?? workout.sport?.name ?? workout.sport_id ?? null,
        strain: workout.score?.strain ?? workout.strain ?? null,
        averageHr:
          workout.score?.average_heart_rate ??
          workout.average_heart_rate ??
          null,
        maxHr:
          workout.score?.max_heart_rate ??
          workout.max_heart_rate ??
          null,
        rawJson: JSON.stringify(workout),
      })),
    };

    console.log("WHOOP SYNC NORMALIZED:", JSON.stringify(responsePayload, null, 2));

    res.json(responsePayload);
  } catch (err) {
    console.error("WHOOP SYNC ROUTE ERROR:", err);
    res.status(500).json({
      connected: true,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;