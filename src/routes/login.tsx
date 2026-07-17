import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLockup } from "@/components/chalio/BrandLockup";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Chalio" },
      { name: "description", content: "Sign in to Chalio and start earning rewards for every step." },
    ],
  }),
  component: LoginScreen,
});

function LoginScreen() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/connect-fit", replace: true });
    });
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Couldn't sign in", { description: (result.error as Error).message });
        return;
      }
      if (result.redirected) return;
      // popup flow: session set — navigate
      navigate({ to: "/connect-fit", replace: true });
    } catch (e) {
      toast.error("Couldn't sign in", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-16">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-10">
        <BrandLockup size="md" />

        <p className="max-w-[18rem] text-center text-base font-medium leading-relaxed text-slate-600">
          Track your steps. Earn real rewards.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-base font-bold text-slate-800 shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleG />
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
      </div>
    </main>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.8h5.3c-.2 1.4-1.7 4-5.3 4-3.2 0-5.8-2.6-5.8-5.9S8.8 6.2 12 6.2c1.8 0 3 .8 3.7 1.4l2.5-2.5C16.6 3.7 14.5 3 12 3 6.9 3 3 6.9 3 12s3.9 9 9 9c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.1-1.5H12z" />
    </svg>
  );
}
