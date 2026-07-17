import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Footprints, Flame, Timer } from "lucide-react";
import { IconMark } from "@/components/chalio/BrandLockup";
import { Avatar } from "@/components/chalio/Avatar";
import { ProgressRing } from "@/components/chalio/ProgressRing";
import { Coin } from "@/components/chalio/Coin";
import { currentUser, missions } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/home")({
  head: () => ({ meta: [{ title: "Home — Chalio" }] }),
  component: HomeScreen,
});

function HomeScreen() {
  const activeMissions = missions.filter((m) => m.status === "joined").length;

  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
      <header className="flex items-center justify-between">
        <IconMark size={32} />
        <Link to="/profile" aria-label="Open profile">
          <Avatar name={currentUser.name} size={38} />
        </Link>
      </header>

      <p className="mt-6 text-[15px] font-semibold text-slate-500">
        Hello, {currentUser.name.split(" ")[0]}
      </p>

      <div className="mt-4 flex flex-col items-center">
        <ProgressRing value={currentUser.todaySteps} goal={currentUser.stepGoal} />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat Icon={Footprints} color="text-brand-blue" value={`${currentUser.distanceKm} km`} />
        <Stat Icon={Flame} color="text-brand-red" value={`${currentUser.calories} kcal`} />
        <Stat Icon={Timer} color="text-brand-green" value={`${currentUser.activeMinutes} min`} />
      </div>

      <div className="mt-8 space-y-2.5">
        <RowLink to="/leaderboard" label={`#${currentUser.rankLatur} in ${currentUser.city} this week`} />
        <RowLink to="/rewards" label={`${currentUser.coins.toLocaleString()} coins`} leading={<Coin size={18} />} />
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
