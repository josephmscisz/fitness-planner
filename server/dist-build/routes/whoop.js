"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const router = (0, express_1.Router)();
// Get config at runtime (for Railway env var injection after container start)
function getConfig() {
    const clientId = process.env.WHOOP_CLIENT_ID || "";
    const clientSecret = process.env.WHOOP_CLIENT_SECRET || "";
    const redirectUri = process.env.WHOOP_REDIRECT_URI || "http://localhost:8787/whoop/callback";
    const tokenStorePath = node_path_1.default.resolve(process.cwd(), process.env.TOKEN_STORE_PATH || ".whoop-token-store.json");
    return { clientId, clientSecret, redirectUri, tokenStorePath };
}
const tokenStore = {};
let tokenStoreLoaded = false;
async function loadTokenStoreFromDisk() {
    if (tokenStoreLoaded)
        return;
    try {
        const { tokenStorePath } = getConfig();
        const text = await (0, promises_1.readFile)(tokenStorePath, "utf-8");
        const parsed = JSON.parse(text);
        tokenStore.accessToken = parsed.accessToken;
        tokenStore.refreshToken = parsed.refreshToken;
        tokenStore.expiresAt = parsed.expiresAt;
        tokenStore.scope = parsed.scope;
        tokenStore.providerUserId = parsed.providerUserId;
    }
    catch {
        // First run or missing/corrupt token file: continue with empty in-memory store.
    }
    finally {
        tokenStoreLoaded = true;
    }
}
async function saveTokenStoreToDisk() {
    const { tokenStorePath } = getConfig();
    const toSave = {
        accessToken: tokenStore.accessToken,
        refreshToken: tokenStore.refreshToken,
        expiresAt: tokenStore.expiresAt,
        scope: tokenStore.scope,
        providerUserId: tokenStore.providerUserId,
    };
    await (0, promises_1.writeFile)(tokenStorePath, JSON.stringify(toSave, null, 2), "utf-8");
}
// For a single-user local dev flow, in-memory state is fine for now.
let pendingOAuthState = "";
function generateState() {
    // 32 hex chars, comfortably above WHOOP's minimum 8-char requirement.
    return crypto_1.default.randomBytes(16).toString("hex");
}
function getAuthUrl() {
    const { clientId, redirectUri } = getConfig();
    pendingOAuthState = generateState();
    const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "read:recovery read:sleep read:workout offline",
        state: pendingOAuthState,
    });
    return `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`;
}
async function exchangeCodeForToken(code) {
    const { clientId, clientSecret, redirectUri } = getConfig();
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
    });
    const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`WHOOP token exchange failed: ${response.status} ${text}`);
    }
    return response.json();
}
function applyTokenResponseToStore(json) {
    tokenStore.accessToken = json.access_token;
    tokenStore.refreshToken = json.refresh_token ?? tokenStore.refreshToken;
    tokenStore.scope = json.scope ?? tokenStore.scope;
    tokenStore.providerUserId = json.user?.id ?? tokenStore.providerUserId;
    if (json.expires_in != null) {
        const expiresAt = new Date(Date.now() + Number(json.expires_in) * 1000);
        if (!Number.isNaN(expiresAt.getTime())) {
            tokenStore.expiresAt = expiresAt.toISOString();
            return;
        }
    }
    // Some providers return absolute expiry instead of expires_in.
    const absoluteExpiryCandidate = json.expires_at ?? json.expiresAt ?? null;
    if (absoluteExpiryCandidate != null) {
        const absolute = new Date(absoluteExpiryCandidate);
        if (!Number.isNaN(absolute.getTime())) {
            tokenStore.expiresAt = absolute.toISOString();
            return;
        }
        const asNumber = Number(absoluteExpiryCandidate);
        if (Number.isFinite(asNumber) && asNumber > 0) {
            // Handle seconds or milliseconds epoch values.
            const asMs = asNumber > 1e12 ? asNumber : asNumber * 1000;
            const fromEpoch = new Date(asMs);
            if (!Number.isNaN(fromEpoch.getTime())) {
                tokenStore.expiresAt = fromEpoch.toISOString();
            }
        }
    }
}
async function refreshAccessToken() {
    await loadTokenStoreFromDisk();
    if (!tokenStore.refreshToken) {
        throw new Error("No WHOOP refresh token available.");
    }
    const { clientId, clientSecret } = getConfig();
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenStore.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
    });
    const response = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`WHOOP token refresh failed: ${response.status} ${text}`);
    }
    const json = await response.json();
    applyTokenResponseToStore(json);
    await saveTokenStoreToDisk();
    return tokenStore.accessToken;
}
async function getValidAccessToken() {
    await loadTokenStoreFromDisk();
    if (!tokenStore.accessToken) {
        if (tokenStore.refreshToken) {
            return refreshAccessToken();
        }
        throw new Error("WHOOP is not connected.");
    }
    if (!tokenStore.expiresAt) {
        return tokenStore.accessToken;
    }
    const expiresAtMs = new Date(tokenStore.expiresAt).getTime();
    const soonMs = Date.now() + 60000;
    if (expiresAtMs <= soonMs) {
        return refreshAccessToken();
    }
    return tokenStore.accessToken;
}
async function whoopGet(path) {
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
function getTokenInfo() {
    const expiresAt = tokenStore.expiresAt ?? null;
    const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;
    const secondsRemaining = expiresAtMs != null && Number.isFinite(expiresAtMs)
        ? Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
        : null;
    return {
        connected: !!tokenStore.accessToken || !!tokenStore.refreshToken,
        hasAccessToken: !!tokenStore.accessToken,
        hasRefreshToken: !!tokenStore.refreshToken,
        expiresAt,
        secondsRemaining,
        scope: tokenStore.scope ?? null,
        providerUserId: tokenStore.providerUserId ?? null,
    };
}
router.get("/connect", (_req, res) => {
    const { clientId, clientSecret, redirectUri } = getConfig();
    console.log("WHOOP_CLIENT_ID check:", !!clientId, `len=${clientId?.length ?? 0}`);
    console.log("WHOOP_CLIENT_SECRET check:", !!clientSecret, `len=${clientSecret?.length ?? 0}`);
    console.log("WHOOP_REDIRECT_URI check:", !!redirectUri, `value=${redirectUri}`);
    if (!clientId || !clientSecret || !redirectUri) {
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
        applyTokenResponseToStore(tokenResponse);
        await saveTokenStoreToDisk();
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
    }
    catch (err) {
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
    loadTokenStoreFromDisk()
        .then(async () => {
        if (!tokenStore.expiresAt && tokenStore.refreshToken) {
            try {
                await refreshAccessToken();
            }
            catch {
                // Keep status response best-effort even if refresh fails.
            }
        }
        const info = getTokenInfo();
        res.json({
            connected: info.connected,
            expiresAt: info.expiresAt,
            secondsRemaining: info.secondsRemaining,
        });
    })
        .catch(() => {
        res.json({ connected: false, expiresAt: null, secondsRemaining: null });
    });
});
router.get("/token-info", (_req, res) => {
    loadTokenStoreFromDisk()
        .then(async () => {
        if (!tokenStore.expiresAt && tokenStore.refreshToken) {
            try {
                await refreshAccessToken();
            }
            catch {
                // Return best-effort debug information even when refresh fails.
            }
        }
        const { tokenStorePath } = getConfig();
        res.json({
            ...getTokenInfo(),
            tokenStorePath,
        });
    })
        .catch(() => {
        const { tokenStorePath } = getConfig();
        res.status(500).json({
            connected: false,
            hasAccessToken: false,
            hasRefreshToken: false,
            expiresAt: null,
            secondsRemaining: null,
            scope: null,
            providerUserId: null,
            tokenStorePath,
        });
    });
});
router.post("/refresh", async (_req, res) => {
    try {
        await refreshAccessToken();
        res.json({ ok: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
});
router.post("/sync", async (_req, res) => {
    try {
        console.log("WHOOP SYNC START");
        await loadTokenStoreFromDisk();
        if (!tokenStore.accessToken && !tokenStore.refreshToken) {
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
            latestMetric: latestRecovery || latestSleep
                ? {
                    metricDate: latestRecovery?.created_at?.slice(0, 10) ??
                        latestSleep?.created_at?.slice(0, 10) ??
                        new Date().toISOString().slice(0, 10),
                    recoveryScore: latestRecovery?.score?.recovery_score ??
                        latestRecovery?.recovery_score ??
                        null,
                    sleepPerformance: latestSleep?.score?.sleep_performance_percentage ??
                        latestSleep?.sleep_performance ??
                        null,
                    sleepDurationMins: latestSleep?.score?.stage_summary?.total_in_bed_time_milli != null
                        ? Math.round(latestSleep.score.stage_summary.total_in_bed_time_milli / 60000)
                        : null,
                    hrv: latestRecovery?.score?.hrv_rmssd_milli ??
                        latestRecovery?.hrv ??
                        null,
                    restingHr: latestRecovery?.score?.resting_heart_rate ??
                        latestRecovery?.resting_heart_rate ??
                        null,
                    rawJson: JSON.stringify({
                        recovery: latestRecovery ?? null,
                        sleep: latestSleep ?? null,
                    }),
                }
                : null,
            workouts: workoutRows.map((workout) => ({
                whoopWorkoutId: String(workout.id ?? workout.workout_id ?? ""),
                startTime: workout.start ?? workout.start_time ?? workout.created_at ?? "",
                endTime: workout.end ?? workout.end_time ?? null,
                sportName: workout.sport_name ?? workout.sport?.name ?? workout.sport_id ?? null,
                strain: workout.score?.strain ?? workout.strain ?? null,
                averageHr: workout.score?.average_heart_rate ??
                    workout.average_heart_rate ??
                    null,
                maxHr: workout.score?.max_heart_rate ??
                    workout.max_heart_rate ??
                    null,
                rawJson: JSON.stringify(workout),
            })),
        };
        console.log("WHOOP SYNC NORMALIZED:", JSON.stringify(responsePayload, null, 2));
        res.json(responsePayload);
    }
    catch (err) {
        console.error("WHOOP SYNC ROUTE ERROR:", err);
        res.status(500).json({
            connected: true,
            error: err instanceof Error ? err.message : String(err),
        });
    }
});
router.get("/debug-env", (_req, res) => {
    res.json({
        WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID ? `***(len=${process.env.WHOOP_CLIENT_ID.length})` : "MISSING",
        WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET ? `***(len=${process.env.WHOOP_CLIENT_SECRET.length})` : "MISSING",
        WHOOP_REDIRECT_URI: process.env.WHOOP_REDIRECT_URI || "MISSING",
        TOKEN_STORE_PATH: process.env.TOKEN_STORE_PATH || "MISSING",
        NODE_ENV: process.env.NODE_ENV || "MISSING",
    });
});
exports.default = router;
