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
      try {
        console.log("[splash] checking session");
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          console.log("[splash] no session -> /login");
          navigate({ to: "/login", replace: true });
          return;
        }
        console.log("[splash] session found, loading profile");
        const { data: profile } = await supabase
          .from("profiles")
          .select("fit_connected")
          .eq("id", data.session.user.id)
          .maybeSingle();

        let connected: boolean;
        if (isHealthPlatform()) {
          console.log("[splash] native — checking OS-level health auth");
          // Timeout guard: if the plugin hangs or throws, fall back to the DB
          // flag so the user is never stuck on splash.
          connected = await Promise.race<boolean>([
            checkHealthAuthorized().catch((e) => {
              console.warn("[splash] checkHealthAuthorized threw", e);
              return !!profile?.fit_connected;
            }),
            new Promise<boolean>((resolve) =>
              setTimeout(() => {
                console.warn("[splash] checkHealthAuthorized timed out (3s), falling back to profile flag");
                resolve(!!profile?.fit_connected);
              }, 3000),
            ),
          ]);
        } else {
          connected = !!profile?.fit_connected;
        }
        console.log("[splash] routing", { connected });
        navigate({ to: connected ? "/home" : "/connect-fit", replace: true });
      } catch (e) {
        console.error("[splash] routing failed, defaulting to /home", e);
        navigate({ to: "/home", replace: true });
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
