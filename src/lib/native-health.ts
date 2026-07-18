import { isNativePlatform } from "@/lib/native-auth";

export type HealthAvailability =
  | { available: true }
  | { available: false; reason?: string };

// Lazy-load the plugin so web bundles never eval the native module
async function loadHealth() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = await import("@capgo/capacitor-health");
  return mod.Health;
}

export function isHealthPlatform(): boolean {
  return isNativePlatform();
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function checkHealthAvailability(
  timeoutMs = 4000,
): Promise<HealthAvailability> {
  if (!isHealthPlatform()) return { available: false, reason: "not-native" };
  try {
    const Health = await loadHealth();
    const res = await withTimeout(Health.isAvailable(), timeoutMs, "Health.isAvailable");
    return res.available
      ? { available: true }
      : { available: false, reason: res.reason };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function requestHealthAuthorization(timeoutMs = 30000): Promise<boolean> {
  if (!isHealthPlatform()) return false;
  const Health = await loadHealth();
  const status = await withTimeout(
    Health.requestAuthorization({ read: ["steps", "distance", "calories"] }),
    timeoutMs,
    "Health.requestAuthorization",
  );
  return status.readAuthorized?.includes("steps") ?? false;
}

/**
 * Open the Health Connect listing in the Play Store. Tries the native
 * `market://` intent first, then falls back to the https listing.
 */
export async function openHealthConnectPlayStore(): Promise<void> {
  const pkg = "com.google.android.apps.healthdata";
  const marketUrl = `market://details?id=${pkg}`;
  const httpsUrl = `https://play.google.com/store/apps/details?id=${pkg}`;
  try {
    if (isHealthPlatform()) {
      const { App } = await import("@capacitor/app");
      const res = await App.openUrl({ url: marketUrl });
      if (!res?.completed) await App.openUrl({ url: httpsUrl });
      return;
    }
  } catch (e) {
    console.warn("[health] openHealthConnectPlayStore native open failed", e);
    try {
      const { App } = await import("@capacitor/app");
      await App.openUrl({ url: httpsUrl });
      return;
    } catch (e2) {
      console.warn("[health] https fallback failed", e2);
    }
  }
  try {
    window.open(httpsUrl, "_blank");
  } catch (e) {
    console.warn("[health] window.open failed", e);
  }
}

/**
 * Check the CURRENT native authorization state (without prompting).
 * Returns true only if the OS reports step-read access granted on this device.
 * On web / non-native platforms this always returns false.
 */
export async function checkHealthAuthorized(): Promise<boolean> {
  if (!isHealthPlatform()) return false;
  try {
    const Health = await loadHealth();
    const status = await Health.checkAuthorization({
      read: ["steps", "distance", "calories"],
    });
    return status.readAuthorized?.includes("steps") ?? false;
  } catch (e) {
    console.warn("[health] checkAuthorization failed", e);
    return false;
  }
}

export type TodayTotals = { steps: number; distanceKm: number; calories: number };

export async function readTodayTotals(): Promise<TodayTotals | null> {
  if (!isHealthPlatform()) return null;
  const Health = await loadHealth();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startDate = start.toISOString();
  const endDate = new Date().toISOString();

  const sumSamples = async (dataType: "steps" | "distance" | "calories") => {
    try {
      const res = await Health.readSamples({ dataType, startDate, endDate, limit: 1000 });
      return (res.samples ?? []).reduce((s: number, x: { value: number }) => s + Number(x.value ?? 0), 0);
    } catch (e) {
      console.warn(`[health] readSamples ${dataType} failed`, e);
      return 0;
    }
  };

  const [stepsRaw, distanceMeters, caloriesRaw] = await Promise.all([
    sumSamples("steps"),
    sumSamples("distance"),
    sumSamples("calories"),
  ]);

  return {
    steps: Math.round(stepsRaw),
    distanceKm: +(distanceMeters / 1000).toFixed(2),
    calories: Math.round(caloriesRaw),
  };
}
