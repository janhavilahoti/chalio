import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { markFitConnected } from "@/lib/chalio.functions";
import { useRequireAuth } from "@/lib/auth-hooks";
import {
  checkHealthAvailability,
  isHealthPlatform,
  requestHealthAuthorization,
} from "@/lib/native-health";

export const Route = createFileRoute("/connect-fit")({
  head: () => ({ meta: [{ title: "Connect activity — Chalio" }] }),
  component: ConnectFitScreen,
});

function ConnectFitScreen() {
  const navigate = useNavigate();
  const authStatus = useRequireAuth();
  const mark = useServerFn(markFitConnected);
  const [busy, setBusy] = useState(false);
  const [needsInstall, setNeedsInstall] = useState(false);
  const native = isHealthPlatform();

  useEffect(() => {
    if (authStatus !== "authed") return;
  }, [authStatus]);

  async function handleConnect() {
    setBusy(true);
    try {
      if (native) {
        const avail = await checkHealthAvailability();
        if (!avail.available) {
          setNeedsInstall(true);
          toast.error("Health Connect isn't available on this device");
          return;
        }
        const ok = await requestHealthAuthorization();
        if (!ok) {
          toast.error("Permission denied", {
            description: "Chalio needs step access to award coins for real activity.",
          });
          return;
        }
      }
      await mark({});
      toast.success(native ? "Health Connect linked" : "Activity sync enabled");
      navigate({ to: "/permissions", replace: true });
    } catch (e) {
      toast.error("Couldn't enable", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const ctaLabel = native ? "Connect Health Connect" : "Connect Google Fit";
  const title = native ? "Connect Health Connect" : "Enable activity sync";
  const body = native
    ? "Chalio reads your daily steps, distance, and calories from Health Connect so you can earn coins for real movement — no manual entry, no guesswork."
    : "Chalio tracks your daily steps, distance, and active minutes so you can earn coins for real movement — no manual entry, no guesswork.";

  return (
    <main className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-16">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-brand-blue/10" />
          <span className="absolute inset-2 rounded-full bg-brand-blue/15" />
          <Activity className="relative h-10 w-10 text-brand-blue" strokeWidth={2.4} />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="text-[15px] leading-relaxed text-slate-600">{body}</p>
        </div>

        {needsInstall && native && (
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left">
            <p className="text-sm font-bold text-slate-900">Install Health Connect</p>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
              Health Connect isn't installed on this device. Install it from the Play Store, then
              come back and tap Connect.
            </p>
            <a
              href="https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white"
            >
              Open Play Store
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={handleConnect}
          disabled={busy}
          className="w-full rounded-2xl bg-brand-blue px-5 py-3.5 text-base font-bold text-white shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "Connecting…" : ctaLabel}
        </button>

        <p className="text-[12px] leading-relaxed text-slate-500">
          By continuing you agree to Chalio's{" "}
          <Link to="/privacy" className="font-semibold text-slate-700 underline">
            Privacy Policy
          </Link>
          . We only read step, distance, and calorie data to award coins.
        </p>
      </div>
    </main>
  );
}
