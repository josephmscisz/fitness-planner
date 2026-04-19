const WHOOP_BACKEND_BASE =
  import.meta.env.VITE_WHOOP_BACKEND_BASE || "http://localhost:8787";

export type WhoopSyncPayload = {
  connected: boolean;
  error?: string;
  connection?: {
    providerUserId?: string | null;
    scope?: string | null;
    expiresAt?: string | null;
  };
  latestMetric?: {
    metricDate: string;
    recoveryScore?: number | null;
    sleepPerformance?: number | null;
    sleepDurationMins?: number | null;
    hrv?: number | null;
    restingHr?: number | null;
    rawJson?: string;
  } | null;
  workouts?: Array<{
    whoopWorkoutId: string;
    startTime: string;
    endTime?: string | null;
    sportName?: string | null;
    strain?: number | null;
    averageHr?: number | null;
    maxHr?: number | null;
    rawJson?: string;
  }>;
};

export function getWhoopConnectUrl() {
  return `${WHOOP_BACKEND_BASE}/whoop/connect`;
}

export async function getWhoopStatusFromBackend(): Promise<{
  connected: boolean;
}> {
  const response = await fetch(`${WHOOP_BACKEND_BASE}/whoop/status`);
  if (!response.ok) {
    throw new Error(`WHOOP status failed: ${response.status}`);
  }
  return response.json();
}

export async function syncWhoopFromBackend(): Promise<WhoopSyncPayload> {
  const response = await fetch(`${WHOOP_BACKEND_BASE}/whoop/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WHOOP sync failed: ${response.status} ${text}`);
  }

  return response.json();
}