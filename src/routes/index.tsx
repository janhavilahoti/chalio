import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BrandLockup, Tagline } from "@/components/chalio/BrandLockup";
import { supabase } from "@/integrations/supabase/client";
import { isHealthPlatform, checkHealthAuthorized } from "@/lib/native-health";

export const Route = createFileRoute("/")({
  component: SplashScreen,
});

function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("fit_connected")
          .eq("id", data.session.user.id)
          .maybeSingle();
        // On native, always verify the OS-level authorization independently
        // of the DB flag — the flag may have been set by a prior web session.
        const connected = isHealthPlatform()
          ? await checkHealthAuthorized()
          : !!profile?.fit_connected;
        navigate({ to: connected ? "/home" : "/connect-fit", replace: true });
      } else {
        navigate({ to: "/login", replace: true });
      }
    }, 1500);
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
