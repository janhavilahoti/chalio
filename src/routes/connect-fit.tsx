import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { markFitConnected } from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";

export const Route = createFileRoute("/connect-fit")({
  head: () => ({ meta: [{ title: "Connect activity — Chalio" }] }),
  component: ConnectFitScreen,
});

function ConnectFitScreen() {
  const navigate = useNavigate();
  const authStatus = useRequireAuth();
  const mark = useServerFn(markFitConnected);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already connected, skip
    if (authStatus !== "authed") return;
  }, [authStatus]);

  async function handleConnect() {
    setBusy(true);
    try {
      await mark({});
      toast.success("Activity sync enabled");
      navigate({ to: "/permissions", replace: true });
    } catch (e) {
      toast.error("Couldn't enable", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

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
            Enable activity sync
          </h1>
          <p className="text-[15px] leading-relaxed text-slate-600">
            Chalio tracks your daily steps, distance, and active minutes so you can earn coins for
            real movement — no manual entry, no guesswork.
          </p>
        </div>

        <button
          type="button"
          onClick={handleConnect}
          disabled={busy}
          className="w-full rounded-2xl bg-brand-blue px-5 py-3.5 text-base font-bold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable activity sync"}
        </button>
      </div>
    </main>
  );
}
