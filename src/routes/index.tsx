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
      <div className="flex flex-col items-center animate-[fadeIn_600ms_ease-out]">
        {/* Icon mark — ~18% of viewport width, with sensible min/max */}
        <img
          src={chalioIcon.url}
          alt=""
          aria-hidden="true"
          className="object-contain"
          style={{ width: "clamp(96px, 18vw, 180px)", height: "auto" }}
        />

        {/* Wordmark — ~45% of viewport width. The source PNG has the tagline
            baked into the bottom; we crop it off with a fixed aspect ratio +
            object-cover / object-top so only the "chalio" letters show. */}
        <div
          className="mt-6 overflow-hidden"
          style={{ width: "clamp(220px, 45vw, 460px)", aspectRatio: "1920 / 540" }}
        >
          <img
            src={chalioWordmark.url}
            alt="Chalio"
            className="h-full w-full object-cover object-top"
          />
        </div>

        {/* Tagline with colored-dot separators */}
        <p className="mt-5 flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-700">
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
