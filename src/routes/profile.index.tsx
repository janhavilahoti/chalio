import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  LogOut,
  ChevronRight,
  Activity,
  Trophy,
  Target,
  Pencil,
  PlugZap,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/chalio/Avatar";
import {
  getProfileStats,
  getWeeklyActivity,
  listActivities,
  disconnectFit,
  markFitConnected,
} from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";
import { supabase } from "@/integrations/supabase/client";
import {
  isHealthPlatform,
  checkHealthAuthorized,
  requestHealthAuthorization,
  checkHealthAvailability,
} from "@/lib/native-health";

const BADGE_COLORS = ["bg-brand-red", "bg-brand-yellow", "bg-brand-blue", "bg-brand-green"];

export const Route = createFileRoute("/profile/")({
  head: () => ({ meta: [{ title: "Profile — Chalio" }] }),
  component: ProfileScreen,
});

function ProfileScreen() {
  useRequireAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const statsFn = useServerFn(getProfileStats);
  const weeklyFn = useServerFn(getWeeklyActivity);
  const actsFn = useServerFn(listActivities);
  const disconnectFn = useServerFn(disconnectFit);
  const markFn = useServerFn(markFitConnected);
  const native = isHealthPlatform();

  const [nativeAuthed, setNativeAuthed] = useState<boolean | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["profile-stats"], queryFn: () => statsFn({}) });
  const { data: weekly } = useQuery({ queryKey: ["weekly-activity"], queryFn: () => weeklyFn({}) });
  const { data: activities } = useQuery({ queryKey: ["activities"], queryFn: () => actsFn({}) });

  useEffect(() => {
    if (!native) return;
    void checkHealthAuthorized().then(setNativeAuthed).catch(() => setNativeAuthed(false));
  }, [native]);

  const disconnect = useMutation({
    mutationFn: () => disconnectFn({}),
    onSuccess: async () => {
      toast.success("Disconnected");
      setNativeAuthed(false);
      await qc.invalidateQueries({ refetchType: "all" });
    },
    onError: (e) => toast.error("Couldn't disconnect", { description: (e as Error).message }),
  });

  async function handleConnect() {
    try {
      if (native) {
        const avail = await checkHealthAvailability();
        if (!avail.available) {
          toast.error("Health Connect not available");
          return;
        }
        const ok = await requestHealthAuthorization();
        if (!ok) {
          toast.error("Permission denied");
          return;
        }
        setNativeAuthed(true);
      }
      await markFn({});
      toast.success("Connected");
      await qc.invalidateQueries({ refetchType: "all" });
    } catch (e) {
      toast.error("Couldn't connect", { description: (e as Error).message });
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (isLoading || !data) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">Loading…</div>;
  }
  const { profile, totalSteps, totalKm, level, badges } = data;

  // Weekly aggregates
  const week = weekly ?? [];
  const weekDist = +week.reduce((s, d) => s + Number(d.distance_km ?? 0), 0).toFixed(1);
  const weekCal = week.reduce((s, d) => s + Number(d.calories ?? 0), 0);
  const weekMin = week.reduce((s, d) => s + Number(d.active_minutes ?? 0), 0);
  const maxSteps = Math.max(1, ...week.map((d) => Number(d.steps ?? 0)));

  // Fit status shown reflects real state
  const isConnected = native ? nativeAuthed === true : !!profile?.fit_connected;

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg bg-background px-5 pb-10 pt-4">
      <Link
        to="/home"
        className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        Back
      </Link>

      <header className="mt-5 flex items-center gap-4">
        <Avatar name={profile?.name ?? "You"} url={profile?.avatar_url} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold text-slate-900">{profile?.name}</h1>
          <p className="truncate text-sm font-semibold text-slate-500">
            {profile?.city ?? "—"}
            {profile?.area ? ` · ${profile.area}` : ""}
          </p>
        </div>
        <Link
          to="/profile/edit"
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2.6} /> Edit
        </Link>
      </header>

      <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-4">
        <StatCell value={`${totalKm}`} unit="km" />
        <StatCell value={`${(totalSteps / 1000).toFixed(0)}k`} unit="steps" />
        <StatCell value={`${profile?.current_streak ?? 0}`} unit="streak" />
        <StatCell value={`Lv ${level}`} unit="level" />
      </div>

      {/* This week */}
      <section className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">This week</h2>
          <span className="text-[11px] font-semibold text-slate-400">last 7 days</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Distance" value={`${weekDist} km`} />
          <MiniStat label="Time" value={`${weekMin} min`} />
          <MiniStat label="Calories" value={`${weekCal}`} />
        </div>
        <div className="mt-4 flex h-16 items-end gap-1.5">
          {(week.length === 0 ? Array(7).fill(0) : week.map((d) => Number(d.steps ?? 0))).map((s, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-brand-blue/80"
              style={{ height: `${Math.max(6, (s / maxSteps) * 100)}%` }}
              aria-label={`${s} steps`}
            />
          ))}
        </div>
      </section>

      {/* Connection */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Connected app</h2>
        <div className="mt-2 flex items-center justify-between rounded-2xl bg-white p-4 ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/10">
              <PlugZap className="h-5 w-5 text-brand-blue" strokeWidth={2.4} />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {native ? "Health Connect" : "Google Fit"}
              </p>
              <p className="text-[12px] font-semibold text-slate-500">
                {isConnected ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
          {isConnected ? (
            <button
              type="button"
              onClick={() => {
                if (confirm("Disconnect activity sync? You can reconnect anytime.")) {
                  disconnect.mutate();
                }
              }}
              disabled={disconnect.isPending}
              className="rounded-full border border-brand-red/30 px-3 py-1.5 text-xs font-bold text-brand-red disabled:opacity-60"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="rounded-full bg-brand-blue px-3 py-1.5 text-xs font-bold text-white"
            >
              Connect
            </button>
          )}
        </div>
      </section>

      {/* Activities */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Activities</h2>
          <Link to="/walk" className="text-xs font-bold text-brand-blue">
            + Start walk
          </Link>
        </div>
        {activities && activities.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {activities.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link
                  to="/walk/$id"
                  params={{ id: a.id }}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green/10">
                      <Activity className="h-4 w-4 text-brand-green" strokeWidth={2.4} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {Number(a.distance_km).toFixed(2)} km
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {new Date(a.started_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {Math.round(a.duration_seconds / 60)} min
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2.4} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">No walks recorded yet.</p>
        )}
      </section>

      {/* Badges */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Badges</h2>
        {badges.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Complete missions to earn badges.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-4 gap-3">
            {badges.map((b: { id: string; title: string }, i: number) => (
              <li key={b.id} className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-extrabold text-white ${BADGE_COLORS[i % BADGE_COLORS.length]}`}
                  aria-hidden="true"
                >
                  {b.title.charAt(0)}
                </span>
                <span className="text-[10px] font-semibold leading-tight text-slate-700">
                  {b.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Quick links */}
      <section className="mt-6 space-y-2">
        <QuickLink to="/missions" Icon={Target} label="Missions" />
        <QuickLink to="/leaderboard" Icon={Trophy} label="Leaderboard" />
      </section>

      {/* Settings */}
      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Settings</h2>
        <ul className="mt-2 divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-100">
          <NotificationsRow />
          <SettingRow Icon={LogOut} label="Sign out" danger onClick={signOut} />
        </ul>
      </section>

    </main>
  );
}

function StatCell({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-base font-extrabold tabular-nums text-slate-900">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{unit}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-extrabold tabular-nums text-slate-900">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  );
}

function QuickLink({
  to,
  Icon,
  label,
}: {
  to: "/missions" | "/leaderboard";
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100"
    >
      <span className="flex items-center gap-3 text-sm font-bold text-slate-800">
        <Icon className="h-4 w-4" strokeWidth={2.4} />
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2.4} />
    </Link>
  );
}

function SettingRow({
  Icon,
  label,
  trailing,
  onClick,
  danger,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold ${
          danger ? "text-brand-red" : "text-slate-800"
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4" strokeWidth={2.2} />
          {label}
        </span>
        {trailing}
      </button>
    </li>
  );
}

function NotificationsRow() {
  const [enabled, setEnabled] = useState<boolean>(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("chalio.notifications") : null;
    const perm =
      typeof window !== "undefined" && "Notification" in window ? Notification.permission : "denied";
    setEnabled(stored === "on" && perm === "granted");
  }, []);

  async function toggle() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notifications aren't supported on this device");
      return;
    }
    if (enabled) {
      localStorage.setItem("chalio.notifications", "off");
      setEnabled(false);
      toast.success("Notifications turned off");
      return;
    }
    try {
      let perm = Notification.permission;
      if (perm === "default") perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Permission denied", {
          description: "Enable notifications in your device settings.",
        });
        return;
      }
      localStorage.setItem("chalio.notifications", "on");
      setEnabled(true);
      toast.success("Notifications turned on");
    } catch (e) {
      toast.error("Couldn't enable notifications", { description: (e as Error).message });
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold text-slate-800"
      >
        <span className="flex items-center gap-3">
          <Bell className="h-4 w-4" strokeWidth={2.2} />
          Notifications
        </span>
        <span
          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
            enabled ? "bg-brand-green" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute h-4 w-4 rounded-full bg-white transition-all ${
              enabled ? "right-1" : "left-1"
            }`}
          />
        </span>
      </button>
    </li>
  );
}

