import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/chalio/Avatar";
import { getLeaderboard } from "@/lib/chalio.functions";

export const Route = createFileRoute("/_app/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Chalio" }] }),
  component: LeaderboardScreen,
});

function LeaderboardScreen() {
  const [scope, setScope] = useState<"city" | "friends">("city");
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const fn = useServerFn(getLeaderboard);

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leaderboard", scope, period],
    queryFn: () => fn({ data: { scope, period } }),
    retry: 1,
  });

  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Leaderboard</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { v: "week", l: "Week" },
            { v: "month", l: "Month" },
            { v: "all", l: "All-time" },
          ]}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <ScopeButton active={scope === "city"} onClick={() => setScope("city")}>
          City
        </ScopeButton>
        <ScopeButton active={scope === "friends"} onClick={() => setScope("friends")}>
          Friends
        </ScopeButton>
      </div>

      {isError ? (
        <div className="mt-6 flex flex-col items-start gap-2">
          <p className="text-sm font-semibold text-slate-800">Couldn't load the leaderboard</p>
          <p className="text-xs text-slate-500">{(error as Error)?.message ?? "Unknown error"}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-1 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <p className="mt-6 text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">No rankings yet — start walking to appear here.</p>
      ) : (
        <ul className="mt-5 space-y-1.5">
          {rows.map((row: any) => (
            <li
              key={row.user_id}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                row.isYou ? "bg-brand-blue/5 ring-1 ring-brand-blue/30" : ""
              }`}
            >
              <RankBadge rank={row.rank} />
              <Avatar name={row.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-slate-800">
                  {row.name}
                  {row.isYou && <span className="ml-2 text-xs font-bold text-brand-blue">You</span>}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums text-slate-700">
                {Number(row.score).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: "bg-brand-yellow text-white",
    2: "bg-brand-blue text-white",
    3: "bg-brand-red text-white",
  };
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold tabular-nums ${
        colors[rank] ?? "bg-slate-100 text-slate-500"
      }`}
    >
      {rank}
    </span>
  );
}

function ScopeButton({
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
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
            value === o.v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
