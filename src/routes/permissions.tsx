import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { MapPin, Bell, Check, X } from "lucide-react";
import { toast } from "sonner";
import { updateProfileLocation } from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";

export const Route = createFileRoute("/permissions")({
  head: () => ({ meta: [{ title: "Enable permissions — Chalio" }] }),
  component: PermissionsScreen,
});

type Status = "idle" | "pending" | "granted" | "denied";

async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; area?: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return {};
    const data = await res.json();
    const a = data.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? undefined;
    const area = a.suburb ?? a.neighbourhood ?? a.city_district ?? a.district ?? undefined;
    return { city, area };
  } catch {
    return {};
  }
}

function PermissionsScreen() {
  const navigate = useNavigate();
  useRequireAuth();
  const saveLoc = useServerFn(updateProfileLocation);

  const [locStatus, setLocStatus] = useState<Status>("idle");
  const [notifStatus, setNotifStatus] = useState<Status>("idle");
  const [manualCity, setManualCity] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestLocation() {
    if (!("geolocation" in navigator)) {
      setLocStatus("denied");
      return;
    }
    setLocStatus("pending");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { city, area } = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (city || area) {
          try {
            await saveLoc({ data: { city, area } });
            toast.success(city ? `Location set to ${city}` : "Location saved");
          } catch (e) {
            toast.error("Couldn't save location", { description: e instanceof Error ? e.message : String(e) });
          }
        } else {
          toast.message("Couldn't detect your city — you can set it later in Profile.");
        }
        setLocStatus("granted");
      },
      () => {
        setLocStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function requestNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifStatus("denied");
      return;
    }
    setNotifStatus("pending");
    try {
      const result = await Notification.requestPermission();
      setNotifStatus(result === "granted" ? "granted" : "denied");
    } catch {
      setNotifStatus("denied");
    }
  }

  async function saveManualCity() {
    if (!manualCity.trim()) return;
    try {
      await saveLoc({ data: { city: manualCity.trim() } });
      toast.success(`City set to ${manualCity.trim()}`);
      setLocStatus("granted");
    } catch (e) {
      toast.error("Couldn't save city", { description: e instanceof Error ? e.message : String(e) });
    }
  }

  async function handleContinue() {
    setBusy(true);
    navigate({ to: "/home", replace: true });
  }

  return (
    <main className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-16">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Enable permissions</h1>
          <p className="text-[15px] leading-relaxed text-slate-600">
            Two quick things to get the most out of Chalio. Both are optional — you can skip either.
          </p>
        </header>

        <div className="space-y-4">
          <PermissionRow
            icon={<MapPin className="h-5 w-5 text-brand-blue" strokeWidth={2.4} />}
            tint="bg-brand-blue/10"
            title="Location"
            body="Chalio uses your location to show you the right city leaderboard."
            status={locStatus}
            onEnable={requestLocation}
          />
          {locStatus === "denied" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-600">No worries — enter your city manually:</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={manualCity}
                  onChange={(e) => setManualCity(e.target.value)}
                  placeholder="e.g. Latur"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={saveManualCity}
                  className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <PermissionRow
            icon={<Bell className="h-5 w-5 text-brand-red" strokeWidth={2.4} />}
            tint="bg-brand-red/10"
            title="Notifications"
            body="Turn on notifications so you don't lose your streak."
            status={notifStatus}
            onEnable={requestNotifications}
          />
        </div>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={busy}
            className="w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-base font-bold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            Continue
          </button>
          <p className="text-center text-xs text-slate-500">You can change these anytime in your browser settings.</p>
        </div>
      </div>
    </main>
  );
}

function PermissionRow({
  icon,
  tint,
  title,
  body,
  status,
  onEnable,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  body: string;
  status: Status;
  onEnable: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${tint}`}>{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {status === "granted" && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green">
              <Check className="h-3.5 w-3.5" /> Enabled
            </span>
          )}
          {status === "denied" && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <X className="h-3.5 w-3.5" /> Skipped
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{body}</p>
        {status !== "granted" && (
          <button
            type="button"
            onClick={onEnable}
            disabled={status === "pending"}
            className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 active:scale-[0.98] disabled:opacity-60"
          >
            {status === "pending" ? "Requesting…" : status === "denied" ? "Try again" : "Enable"}
          </button>
        )}
      </div>
    </div>
  );
}
