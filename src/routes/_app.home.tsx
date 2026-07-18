import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Footprints, Flame, Timer, Plus, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { IconMark } from "@/components/chalio/BrandLockup";
import { Avatar } from "@/components/chalio/Avatar";
import { ProgressRing } from "@/components/chalio/ProgressRing";
import { Coin } from "@/components/chalio/Coin";
import { getBootstrap, simulateActivity, syncHealthActivity } from "@/lib/chalio.functions";
import { isHealthPlatform, readTodayTotals } from "@/lib/native-health";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — Chalio" }] }),
  component: HomeScreen,
});

function HomeScreen() {
  const bootstrap = useServerFn(getBootstrap);
  const simulate = useServerFn(simulateActivity);
  const syncHealth = useServerFn(syncHealthActivity);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const native = isHealthPlatform();
  const syncingRef = useRef(false);
  const toastedRef = useRef(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => bootstrap({}),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (!data || toastedRef.current) return;
    const t = data.toasts;
    if (t.streakBonus > 0) {
      toast.success(`🔥 ${t.currentStreak}-day streak!`, {
        description: `+${t.streakBonus} bonus coins added.`,
      });
    }
    t.missionsCompleted?.forEach((m) => {
      toast.success(`Mission complete: ${m.title}`, { description: `+${m.reward} coins` });
    });
    if (t.rankImproved) {
      toast.success(`Moved up to #${t.rankImproved.newRank}`, {
        description: `from #${t.rankImproved.oldRank} in your city`,
      });
    }
    toastedRef.current = true;
  }, [data]);

  const sim = useMutation({
    mutationFn: (steps: number) => simulate({ data: { steps } }),
    onSuccess: async (res) => {
      if (res.coinDelta > 0) toast.success(`+${res.coinDelta} coins`);
      res.missionsCompleted?.forEach((m) =>
        toast.success(`Mission complete: ${m.title}`, { description: `+${m.reward} coins` }),
      );
      await qc.invalidateQueries({ refetchType: "all" });
    },
    onError: (e) => toast.error("Couldn't log steps", { description: (e as Error).message }),
  });

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-slate-800">Couldn't load your dashboard</p>
        <p className="text-xs text-slate-500">{(error as Error)?.message ?? "Unknown error"}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading…</div>;
  }

  const { profile, today, currentRank, activeMissions } = data;
  const firstName = (profile?.name ?? "there").split(" ")[0];

  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
      <header className="flex items-center justify-between">
        <IconMark size={32} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full p-1.5 text-slate-400"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} strokeWidth={2.2} />
          </button>
          <button onClick={() => navigate({ to: "/profile" })} aria-label="Open profile">
            <Avatar name={profile?.name ?? "You"} size={38} />
          </button>
        </div>
      </header>

      <p className="mt-6 text-[15px] font-semibold text-slate-500">Hello, {firstName}</p>

      <div className="mt-4 flex flex-col items-center">
        <ProgressRing value={today.steps ?? 0} goal={profile?.daily_goal ?? 10000} />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat Icon={Footprints} color="text-brand-blue" value={`${Number(today.distance_km ?? 0).toFixed(1)} km`} />
        <Stat Icon={Flame} color="text-brand-red" value={`${today.calories ?? 0} kcal`} />
        <Stat Icon={Timer} color="text-brand-green" value={`${today.active_minutes ?? 0} min`} />
      </div>

      <button
        type="button"
        disabled={sim.isPending}
        onClick={() => sim.mutate(1000)}
        className="mt-6 inline-flex items-center justify-center gap-2 self-center rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
        Log +1,000 steps (demo)
      </button>

      <div className="mt-6 space-y-2.5">
        <RowLink
          to="/leaderboard"
          label={`#${currentRank || "—"} in ${profile?.city ?? "your city"} this week`}
        />
        <RowLink
          to="/rewards"
          label={`${(profile?.coins ?? 0).toLocaleString()} coins`}
          leading={<Coin size={18} />}
        />
        <RowLink to="/missions" label={`${activeMissions} active missions`} />
      </div>
    </div>
  );
}

function Stat({
  Icon,
  value,
  color,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-slate-50 px-2 py-3">
      <Icon className={`h-5 w-5 ${color}`} strokeWidth={2.2} />
      <span className="text-sm font-bold tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

function RowLink({
  to,
  label,
  leading,
}: {
  to: "/leaderboard" | "/rewards" | "/missions";
  label: string;
  leading?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_0_0_rgb(241_245_249)] ring-1 ring-slate-100 transition-transform active:scale-[0.99]"
    >
      <span className="flex items-center gap-2 text-[15px] font-semibold text-slate-800">
        {leading}
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2.4} />
    </Link>
  );
}
