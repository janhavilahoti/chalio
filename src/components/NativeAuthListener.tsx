import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isNativePlatform, handleNativeAuthUrl } from "@/lib/native-auth";

/**
 * Listens for Capacitor `appUrlOpen` events (custom-scheme deep links) and
 * completes the Supabase OAuth flow inside the native app.
 * No-op on the web.
 */
export function NativeAuthListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform()) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appUrlOpen", async ({ url }) => {
          if (!url || !url.startsWith("chalio://")) return;
          const ok = await handleNativeAuthUrl(url);
          if (!ok) return;
          const { data } = await supabase.auth.getSession();
          if (!data.session) return;
          const { data: profile } = await supabase
            .from("profiles")
            .select("fit_connected")
            .eq("id", data.session.user.id)
            .maybeSingle();
          navigate({ to: profile?.fit_connected ? "/home" : "/connect-fit", replace: true });
        });
        cleanup = () => handle.remove();
      } catch (e) {
        console.error("[NativeAuthListener] init failed", e);
      }
    })();
    return () => cleanup?.();
  }, [navigate]);

  return null;
}
