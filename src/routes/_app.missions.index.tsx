import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Coin } from "@/components/chalio/Coin";
import { missions, type Mission } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/missions/")({
  head: () => ({ meta: [{ title: "Missions — Chalio" }] }),
  component: MissionsScreen,
});

function MissionsScreen() {
  const [tab, setTab] = useState<"mine" | "discover">("mine");
  const filtered = missions.filter((m) =>
    tab === "mine" ? m.status !== "discover" : m.status === "discover",
  );

  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Missions</h1>

      <div className="mt-5 inline-flex self-start rounded-full bg-slate-100 p-1">
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          My Missions
        </TabButton>
        <TabButton active={tab === "discover"} onClick={() => setTab("discover")}>
          Discover
        </TabButton>
      </div>

      <ul className="mt-5 space-y-3">
        {filtered.map((m) => (
          <li key={m.id}>
            <MissionCard mission={m} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

export function MissionCard({ mission }: { mission: Mission }) {
  const pct = Math.min(100, Math.round((mission.progress / mission.goal) * 100));
  const action =
    mission.status === "claimable" ? "Claim" : mission.status === "joined" ? "View" : "Join";
  const actionColor =
    mission.status === "claimable"
      ? "bg-brand-green"
      : mission.status === "joined"
        ? "bg-slate-900"
        : "bg-brand-blue";

  return (
    <Link
      to="/missions/$id"
      params={{ id: mission.id }}
      className="block rounded-2xl bg-white p-4 ring-1 ring-slate-100 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-bold text-slate-900">{mission.title}</h3>
            {mission.sponsored && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Sponsored
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{mission.description}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-slate-900">
          <Coin size={16} />
          {mission.reward}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-green"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{pct}% complete</span>
        <span
          className={`rounded-full px-4 py-1.5 text-xs font-bold text-white ${actionColor}`}
        >
          {action}
        </span>
      </div>
    </Link>
  );
}
