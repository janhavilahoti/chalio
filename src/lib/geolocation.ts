import { isNativePlatform } from "@/lib/native-auth";

export type GeoPoint = { lat: number; lng: number; t: number };
export type WatchHandle = { clear: () => Promise<void> };

/**
 * Cross-platform position watcher. On native uses @capacitor/geolocation;
 * on web falls back to navigator.geolocation.
 */
export async function startWatch(
  onPoint: (p: GeoPoint) => void,
  onError: (msg: string) => void,
): Promise<WatchHandle> {
  if (isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location === "denied") {
        onError("Location permission denied");
        return { clear: async () => {} };
      }
    } catch {
      /* ignore */
    }
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000 },
      (pos, err) => {
        if (err) {
          onError(err.message ?? String(err));
          return;
        }
        if (!pos) return;
        onPoint({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          t: pos.timestamp ?? Date.now(),
        });
      },
    );
    return {
      clear: async () => {
        try {
          await Geolocation.clearWatch({ id });
        } catch {
          /* noop */
        }
      },
    };
  }

  // Web
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError("Geolocation not supported on this device");
    return { clear: async () => {} };
  }
  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onPoint({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        t: pos.timestamp ?? Date.now(),
      }),
    (err) => onError(err.message),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
  );
  return {
    clear: async () => navigator.geolocation.clearWatch(id),
  };
}
