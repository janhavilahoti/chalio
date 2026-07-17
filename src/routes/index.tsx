import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import chalioIcon from "@/assets/chalio-icon.png.asset.json";
import chalioWordmark from "@/assets/chalio-wordmark.png.asset.json";

export const Route = createFileRoute("/")({
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      // TODO: check auth session and route to /home when authenticated.
      navigate({ to: "/login" });
    }, 1800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-5 animate-[fadeIn_600ms_ease-out]">
        <img
          src={chalioIcon.url}
          alt=""
          aria-hidden="true"
          className="h-28 w-28 object-contain"
        />
        <img
          src={chalioWordmark.url}
          alt="Chalio"
          className="h-16 w-auto object-contain"
        />
        <p className="mt-1 flex items-center gap-2 text-sm font-medium tracking-wide text-slate-600">
          <span>Walk</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#EA4335]" aria-hidden="true" />
          <span>Play</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FBBC04]" aria-hidden="true" />
          <span>Earn</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#34A853]" aria-hidden="true" />
          <span>Repeat</span>
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
