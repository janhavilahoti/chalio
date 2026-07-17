import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/connect-fit")({
  head: () => ({
    meta: [{ title: "Connect Google Fit — Chalio" }],
  }),
  component: ConnectFitScreen,
});

function ConnectFitScreen() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-16">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-brand-blue/10" />
          <span className="absolute inset-2 rounded-full bg-brand-blue/15" />
          <Activity className="relative h-10 w-10 text-brand-blue" strokeWidth={2.4} />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Connect Google Fit
          </h1>
          <p className="text-[15px] leading-relaxed text-slate-600">
            Chalio uses Google Fit to count your steps accurately and reward the real distance
            you walk — no manual entry, no guesswork.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/home" })}
          className="w-full rounded-2xl bg-brand-blue px-5 py-3.5 text-base font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
        >
          Connect Google Fit
        </button>
      </div>
    </main>
  );
}
