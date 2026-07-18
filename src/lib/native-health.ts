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

export async function checkHealthAvailability(): Promise<HealthAvailability> {
  if (!isHealthPlatform()) return { available: false, reason: "not-native" };
  try {
    const Health = await loadHealth();
    const res = await Health.isAvailable();
    return res.available
      ? { available: true }
      : { available: false, reason: res.reason };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function requestHealthAuthorization(): Promise<boolean> {
  if (!isHealthPlatform()) return false;
  const Health = await loadHealth();
  const status = await Health.requestAuthorization({
    read: ["steps", "distance", "calories"],
  });
  // Consider it authorized if steps at minimum is granted
  return status.readAuthorized?.includes("steps") ?? false;
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
