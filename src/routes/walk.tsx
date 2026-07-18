import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Pause, Play, Square, X } from "lucide-react";
import { LiveMap } from "@/components/chalio/LiveMap";
import { startWatch, type GeoPoint } from "@/lib/geolocation";
import { saveActivity } from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";

export const Route = createFileRoute("/walk")({
  head: () => ({ meta: [{ title: "Live walk — Chalio" }] }),
  component: WalkScreen,
});

function haversineKm(a: GeoPoint, b: GeoPoint) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function WalkScreen() {
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const save = useServerFn(saveActivity);

  const [status, setStatus] = useState<"idle" | "running" | "paused" | "saving">("idle");
  const [path, setPath] = useState<GeoPoint[]>([]);
  const [current, setCurrent] = useState<GeoPoint | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [instantSpeed, setInstantSpeed] = useState(0); // km/h
  const [error, setError] = useState<string | null>(null);

  const watchRef = useRef<{ clear: () => Promise<void> } | null>(null);
  const startTsRef = useRef<number | null>(null);
  const pauseAccumRef = useRef(0); // ms
  const pauseStartRef = useRef<number | null>(null);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Elapsed timer
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      if (startTsRef.current) {
        const now = Date.now();
        setElapsed(Math.floor((now - startTsRef.current - pauseAccumRef.current) / 1000));
      }
    }, 500);
    return () => clearInterval(id);
  }, [status]);

  // Distance with anti-cheat
  const distanceKm = useMemo(() => {
    if (path.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < path.length; i++) {
      const seg = haversineKm(path[i - 1], path[i]);
      const dt = Math.max(0.001, (path[i].t - path[i - 1].t) / 1000 / 3600);
      const v = seg / dt;
      if (v > 15) continue;
      d += seg;
    }
    return d;
  }, [path]);

  const avgSpeed = elapsed > 0 ? +(distanceKm / (elapsed / 3600)).toFixed(2) : 0;

  async function start() {
    setError(null);
    setPath([]);
    setElapsed(0);
    pauseAccumRef.current = 0;
    pauseStartRef.current = null;
    startTsRef.current = Date.now();
    setStatus("running");
    watchRef.current = await startWatch(
      (p) => {
        if (statusRef.current !== "running") {
          setCurrent(p);
          return;
        }
        setCurrent(p);
        setPath((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const seg = haversineKm(last, p);
            const dt = Math.max(0.001, (p.t - last.t) / 1000 / 3600);
            setInstantSpeed(+(seg / dt).toFixed(1));
          }
          return [...prev, p];
        });
      },
      (msg) => {
        setError(msg);
        toast.error("Location error", { description: msg });
      },
    );
  }

  function pause() {
    if (status !== "running") return;
    pauseStartRef.current = Date.now();
    setStatus("paused");
    setInstantSpeed(0);
  }

  function resume() {
    if (status !== "paused") return;
    if (pauseStartRef.current) {
      pauseAccumRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    setStatus("running");
  }

  async function finish() {
    if (path.length < 2) {
      toast.error("No route recorded", { description: "Walk a little longer, then finish." });
      return;
    }
    setStatus("saving");
    await watchRef.current?.clear();
    watchRef.current = null;
    try {
      const startedAt = new Date(startTsRef.current ?? Date.now()).toISOString();
      const endedAt = new Date().toISOString();
      const res = await save({
        data: {
          started_at: startedAt,
          ended_at: endedAt,
          duration_seconds: elapsed,
          path,
        },
      });
      if (res.coinDelta > 0) toast.success(`+${res.coinDelta} coins`);
      res.missionsCompleted?.forEach((m) =>
        toast.success(`Mission complete: ${m.title}`, { description: `+${m.reward} coins` }),
      );
      navigate({ to: "/walk/$id", params: { id: res.activity.id } });
    } catch (e) {
      toast.error("Couldn't save walk", { description: (e as Error).message });
      setStatus("paused");
    }
  }

  async function cancel() {
    await watchRef.current?.clear();
    watchRef.current = null;
    navigate({ to: "/home" });
  }

  useEffect(() => {
    return () => {
      watchRef.current?.clear();
    };
  }, []);

  if (auth !== "authed") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-slate-900">
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <LiveMap
          path={path.map((p) => ({ lat: p.lat, lng: p.lng }))}
          current={current ? { lat: current.lat, lng: current.lng } : null}
        />
      </div>

      {/* Top bar */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-4"
        style={{ zIndex: 1000, paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
      >

        <button
          type="button"
          onClick={cancel}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
          aria-label="Cancel"
        >
          <X className="h-5 w-5 text-slate-700" strokeWidth={2.4} />
        </button>
        {status !== "idle" && (
          <span className="pointer-events-auto rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-md">
            {status === "paused" ? "PAUSED" : status === "saving" ? "SAVING…" : "REC ●"}
          </span>
        )}
      </div>

      {/* Bottom card */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
        style={{ zIndex: 1000, paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >

        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Time" value={fmtTime(elapsed)} />
          <Stat label="Distance" value={`${distanceKm.toFixed(2)} km`} />
          <Stat label="Speed" value={`${(status === "running" ? instantSpeed : avgSpeed).toFixed(1)} km/h`} />
        </div>

        <div className="mt-5 flex gap-3">
          {status === "idle" && (
            <button
              type="button"
              onClick={start}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-green px-4 py-4 text-base font-extrabold text-white shadow-sm active:scale-[0.99]"
            >
              <Play className="h-5 w-5" strokeWidth={2.6} /> Start walk
            </button>
          )}
          {status === "running" && (
            <button
              type="button"
              onClick={pause}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-yellow px-4 py-4 text-base font-extrabold text-slate-900 shadow-sm active:scale-[0.99]"
            >
              <Pause className="h-5 w-5" strokeWidth={2.6} /> Pause
            </button>
          )}
          {(status === "paused" || status === "saving") && (
            <>
              <button
                type="button"
                disabled={status === "saving"}
                onClick={resume}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-4 text-base font-extrabold text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
              >
                <Play className="h-5 w-5" strokeWidth={2.6} /> Resume
              </button>
              <button
                type="button"
                disabled={status === "saving"}
                onClick={finish}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-red px-4 py-4 text-base font-extrabold text-white shadow-sm active:scale-[0.99] disabled:opacity-60"
              >
                <Square className="h-5 w-5" strokeWidth={2.6} /> {status === "saving" ? "Saving…" : "Finish"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 py-2.5">
      <div className="text-lg font-extrabold tabular-nums text-slate-900">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}
