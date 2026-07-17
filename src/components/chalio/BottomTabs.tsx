import { Link } from "@tanstack/react-router";
import { Home, Target, Trophy, Gift } from "lucide-react";

const tabs = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/missions", label: "Missions", Icon: Target },
  { to: "/leaderboard", label: "Leaderboard", Icon: Trophy },
  { to: "/rewards", label: "Rewards", Icon: Gift },
] as const;

export function BottomTabs() {
  return (
    <nav
      className="sticky bottom-0 z-30 border-t border-slate-100 bg-white/95 backdrop-blur"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: false }}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-slate-400 transition-colors data-[status=active]:text-brand-blue"
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
