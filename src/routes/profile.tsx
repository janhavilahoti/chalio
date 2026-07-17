import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, LogOut, RefreshCw, ChevronRight } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar } from "@/components/chalio/Avatar";
import { getProfileStats } from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";
import { supabase } from "@/integrations/supabase/client";

const BADGE_COLORS = ["bg-brand-red", "bg-brand-yellow", "bg-brand-blue", "bg-brand-green"];

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Chalio" }] }),
  component: ProfileScreen,
});

function ProfileScreen() {
  useRequireAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fn = useServerFn(getProfileStats);

  const { data, isLoading } = useQuery({
    queryKey: ["profile-stats"],
    queryFn: () => fn({}),
  });

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg bg-background px-5 pb-10 pt-4">
      <Link
        to="/home"
        className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
        Back
      </Link>

      <header className="mt-6 flex flex-col items-center text-center">
        <Avatar name={profile?.name ?? "You"} size={72} />
        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">{profile?.name}</h1>
        <p className="text-sm font-semibold text-slate-500">{profile?.city}</p>
      </header>

      <div className="mt-6 grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-4">
        <StatCell value={`${totalKm}`} unit="km" />
        <StatCell value={`${(totalSteps / 1000).toFixed(0)}k`} unit="steps" />
        <StatCell value={`${profile?.current_streak ?? 0}`} unit="streak" />
        <StatCell value={`Lv ${level}`} unit="level" />
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Badges</h2>
        {badges.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Complete missions to earn badges.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-4 gap-3">
            {badges.map((b: any, i: number) => (
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

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Settings</h2>
        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-100">
          <SettingRow Icon={Bell} label="Notifications" trailing={<Toggle />} />
          <SettingRow
            Icon={RefreshCw}
            label="Reconnect activity sync"
            trailing={<ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2.4} />}
            onClick={() => {
              toast.success("Activity sync refreshed");
              qc.invalidateQueries();
            }}
          />
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

function Toggle() {
  return (
    <span className="relative inline-flex h-6 w-10 items-center rounded-full bg-brand-green">
      <span className="absolute right-1 h-4 w-4 rounded-full bg-white" />
    </span>
  );
}
