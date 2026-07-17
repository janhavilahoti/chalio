import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Lock, Megaphone } from "lucide-react";
import { Coin } from "@/components/chalio/Coin";
import { badges, rewards, currentUser } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/rewards")({
  head: () => ({ meta: [{ title: "Rewards — Chalio" }] }),
  component: RewardsScreen,
});

function RewardsScreen() {
  return (
    <div className="flex flex-1 flex-col px-5 pb-6 pt-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Rewards</h1>

      <div className="mt-3 flex items-center gap-2">
        <Coin size={22} />
        <span className="text-2xl font-extrabold tabular-nums text-slate-900">
          {currentUser.coins.toLocaleString()}
        </span>
        <span className="text-sm font-semibold text-slate-500">coins</span>
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Your badges
        </h2>
        <ul className="mt-3 grid grid-cols-4 gap-3">
          {badges.map((b) => (
            <li key={b.id} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-extrabold text-white ${
                  b.earned ? b.color : "bg-slate-200"
                }`}
                aria-hidden="true"
              >
                {b.earned ? b.label.charAt(0) : "·"}
              </span>
              <span
                className={`text-[10px] font-semibold leading-tight ${
                  b.earned ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {b.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Coming soon
        </h2>
        <ul className="mt-3 space-y-2.5">
          {rewards.map((r) => {
            const pct = Math.min(100, Math.round((r.progress / r.cost) * 100));
            return (
              <li
                key={r.id}
                className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 opacity-90"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-slate-800">{r.brand}</p>
                    <p className="text-sm text-slate-500">{r.label}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                    <Lock className="h-3 w-3" strokeWidth={2.6} />
                    <Coin size={12} />
                    {r.cost.toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-blue"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                  {r.progress.toLocaleString()} / {r.cost.toLocaleString()} coins
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <Link
        to="/promote"
        className="mt-8 flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 ring-1 ring-slate-100 transition-transform active:scale-[0.99]"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-yellow/15">
            <Megaphone className="h-4 w-4 text-brand-yellow" strokeWidth={2.4} />
          </span>
          <span>
            <span className="block text-[15px] font-bold text-slate-800">
              Promote your brand
            </span>
            <span className="block text-xs text-slate-500">
              Sponsor a mission for walkers near you
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2.4} />
      </Link>
    </div>
  );
}
