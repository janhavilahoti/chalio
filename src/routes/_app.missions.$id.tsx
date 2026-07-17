import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coin } from "@/components/chalio/Coin";
import { joinMission, leaveMission, listMissions } from "@/lib/chalio.functions";

export const Route = createFileRoute("/_app/missions/$id")({
  head: () => ({ meta: [{ title: "Mission — Chalio" }] }),
  component: MissionDetail,
});

function MissionDetail() {
  const { id } = useParams({ from: "/_app/missions/$id" });
  const navigate = useNavigate();
  const list = useServerFn(listMissions);
  const join = useServerFn(joinMission);
  const leave = useServerFn(leaveMission);
  const qc = useQueryClient();

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: () => list({}),
  });

  const mission = missions.find((m: any) => m.id === id);

  const joinMut = useMutation({
    mutationFn: () => join({ data: { missionId: id } }),
    onSuccess: () => {
      toast.success("Mission joined");
      qc.invalidateQueries();
    },
  });
  const leaveMut = useMutation({
    mutationFn: () => leave({ data: { missionId: id } }),
    onSuccess: () => {
      toast.success("Left mission");
      qc.invalidateQueries();
      navigate({ to: "/missions" });
    },
  });

  if (isLoading) return <div className="p-8 text-sm text-slate-400">Loading…</div>;
  if (!mission)
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
        Mission not found.
      </div>
    );

  const um = mission.user_mission;
  const progress = Number(um?.progress ?? 0);
  const goal = Number(mission.target_value);
  const pct = Math.min(100, Math.round((progress / goal) * 100));
  const joined = !!um;
  const completed = um?.completed;

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
        {mission.sponsored_by && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Sponsored · {mission.sponsored_by}
          </span>
        )}
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">{mission.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{mission.description}</p>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-500">Reward</span>
          <span className="flex items-center gap-1.5 text-lg font-extrabold text-slate-900">
            <Coin size={18} />
            {mission.reward_coins}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
          <span>
            {progress.toLocaleString()} / {goal.toLocaleString()} {mission.target_type === "distance_km" ? "km" : mission.target_type === "streak_days" ? "days" : "steps"}
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <Users className="h-4 w-4" strokeWidth={2.2} />
        <span>{Number(mission.participants_count ?? 0).toLocaleString()} participants</span>
      </div>

      {completed ? (
        <div className="mt-8 w-full rounded-2xl bg-brand-green/10 px-5 py-3.5 text-center text-base font-bold text-brand-green">
          Completed — reward claimed
        </div>
      ) : joined ? (
        <button
          type="button"
          disabled={leaveMut.isPending}
          onClick={() => leaveMut.mutate()}
          className="mt-8 w-full rounded-2xl bg-slate-900 px-5 py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          Leave mission
        </button>
      ) : (
        <button
          type="button"
          disabled={joinMut.isPending}
          onClick={() => joinMut.mutate()}
          className="mt-8 w-full rounded-2xl bg-brand-blue px-5 py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          Join mission
        </button>
      )}
    </div>
  );
}
