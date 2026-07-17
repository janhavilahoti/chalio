import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrandLockup } from "@/components/chalio/BrandLockup";

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

  return (
    <main className="flex min-h-screen flex-col bg-background px-6 pb-10 pt-16">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-10">
        <BrandLockup size="md" />

        <p className="max-w-[18rem] text-center text-base font-medium leading-relaxed text-slate-600">
          Track your steps. Earn real rewards.
        </p>

        <button
          type="button"
          onClick={() => navigate({ to: "/connect-fit" })}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-base font-bold text-slate-800 shadow-sm transition-transform active:scale-[0.98]"
        >
          <GoogleG />
          Continue with Google
        </button>
      </div>
    </main>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.8h5.3c-.2 1.4-1.7 4-5.3 4-3.2 0-5.8-2.6-5.8-5.9S8.8 6.2 12 6.2c1.8 0 3 .8 3.7 1.4l2.5-2.5C16.6 3.7 14.5 3 12 3 6.9 3 3 6.9 3 12s3.9 9 9 9c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.1-1.5H12z" />
      <path fill="#4285F4" d="M20.9 10.8H12v3.5h5.1c-.4 2.1-2.2 3.5-5.1 3.5-3.1 0-5.6-2.5-5.6-5.6s2.5-5.6 5.6-5.6c1.7 0 2.9.7 3.6 1.3l2.4-2.4C16.4 3.9 14.4 3 12 3 7 3 3 7 3 12s4 9 9 9c5 0 8.5-3.5 8.5-8.5 0-.6-.1-1.1-.2-1.7z" opacity=".0" />
    </svg>
  );
}
