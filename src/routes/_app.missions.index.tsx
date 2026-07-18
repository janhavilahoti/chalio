import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coin } from "@/components/chalio/Coin";
import { joinMission, listMissions } from "@/lib/chalio.functions";

export const Route = createFileRoute("/_app/missions/")({
  head: () => ({ meta: [{ title: "Missions — Chalio" }] }),
  component: MissionsScreen,
});

function MissionsScreen() {
  const [tab, setTab] = useState<"mine" | "discover">("mine");
  const list = useServerFn(listMissions);
  const join = useServerFn(joinMission);
  const qc = useQueryClient();

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: () => list({}),
  });

  const joinMut = useMutation({
    mutationFn: (missionId: string) => join({ data: { missionId } }),
    onSuccess: async () => {
      toast.success("Mission joined");
      await qc.invalidateQueries({ refetchType: "all" });
    },
  });

  const filtered = missions.filter((m: any) =>
    tab === "mine" ? m.user_mission : !m.user_mission,
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

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">
          {tab === "mine" ? "No missions joined yet — check Discover." : "Nothing to discover right now."}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {filtered.map((m: any) => (
            <li key={m.id}>
              <MissionCard mission={m} onJoin={() => joinMut.mutate(m.id)} />
            </li>
          ))}
        </ul>
      )}
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

function MissionCard({ mission, onJoin }: { mission: any; onJoin: () => void }) {
  const um = mission.user_mission;
  const progress = Number(um?.progress ?? 0);
  const goal = Number(mission.target_value);
  const pct = Math.min(100, Math.round((progress / goal) * 100));
  const joined = !!um;
  const completed = um?.completed;
  const action = completed ? "Claimed" : joined ? "View" : "Join";
  const actionColor = completed ? "bg-brand-green" : joined ? "bg-slate-900" : "bg-brand-blue";

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-bold text-slate-900">{mission.title}</h3>
            {mission.sponsored_by && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Sponsored
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-1 text-sm text-slate-500">{mission.description}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-slate-900">
          <Coin size={16} />
          {mission.reward_coins}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{pct}% complete</span>
        <span className={`rounded-full px-4 py-1.5 text-xs font-bold text-white ${actionColor}`}>
          {action}
        </span>
      </div>
    </>
  );

  if (joined) {
    return (
      <Link
        to="/missions/$id"
        params={{ id: mission.id }}
        className="block rounded-2xl bg-white p-4 ring-1 ring-slate-100 transition-transform active:scale-[0.99]"
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onJoin}
      className="block w-full text-left rounded-2xl bg-white p-4 ring-1 ring-slate-100 transition-transform active:scale-[0.99]"
    >
      {inner}
    </button>
  );
}
