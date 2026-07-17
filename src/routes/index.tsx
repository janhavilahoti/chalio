import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrandLockup } from "@/components/chalio/BrandLockup";
import { Tagline } from "@/components/chalio/BrandLockup";

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
      <div className="flex flex-col items-center gap-8 animate-[fadeIn_600ms_ease-out]">
        <BrandLockup size="lg" />
        <Tagline />
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
