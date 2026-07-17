import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { Coin } from "@/components/chalio/Coin";
import { missions } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/missions/$id")({
  head: () => ({ meta: [{ title: "Mission — Chalio" }] }),
  component: MissionDetail,
  notFoundComponent: () => <NotFound />,
});

function MissionDetail() {
  const { id } = useParams({ from: "/_app/missions/$id" });
  const mission = missions.find((m) => m.id === id);
  if (!mission) return <NotFound />;

  const joined = mission.status !== "discover";
  const pct = Math.min(100, Math.round((mission.progress / mission.goal) * 100));

  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-4">
      <Link
        to="/missions"
        className="-ml-2 inline-flex items-center gap-1 self-start rounded-full px-2 py-1 text-sm font-semibold text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        Missions
      </Link>

      <div className="mt-5">
        <div className="flex items-center gap-2">
          {mission.sponsored && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Sponsored · {mission.sponsored}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          {mission.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          {mission.description} Complete the goal within the mission window to earn your reward.
          Progress updates automatically from your connected fitness data.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">Reward</span>
          <span className="flex items-center gap-1.5 text-lg font-extrabold text-slate-900">
            <Coin size={18} />
            {mission.reward}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
          <span>
            {mission.progress.toLocaleString()} / {mission.goal.toLocaleString()}
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Users className="h-4 w-4" strokeWidth={2.2} />
        <span>{mission.participants.toLocaleString()} participants</span>
      </div>

      <button
        type="button"
        className={`mt-8 w-full rounded-2xl px-5 py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] ${
          joined ? "bg-slate-900" : "bg-brand-blue"
        }`}
      >
        {joined ? "Leave mission" : "Join mission"}
      </button>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
      Mission not found.
    </div>
  );
}
