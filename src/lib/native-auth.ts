import { supabase } from "@/integrations/supabase/client";

export const NATIVE_REDIRECT_URL = "chalio://auth-callback";

/**
 * Returns true when running inside the Capacitor native shell (Android/iOS).
 * Safe to call in the browser — resolves to false when Capacitor isn't loaded.
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Lazy require to avoid pulling native modules into web bundles at eval time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require("@capacitor/core");
    return Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * Parse a Supabase OAuth callback URL (custom scheme) and set the session.
 * Supabase returns tokens either in the URL fragment (implicit) or as `?code=` (PKCE).
 */
export async function handleNativeAuthUrl(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    // Fragment tokens: chalio://auth-callback#access_token=...&refresh_token=...
    const hash = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash;
    const hashParams = new URLSearchParams(hash);
    const access_token = hashParams.get("access_token");
    const refresh_token = hashParams.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      return true;
    }
    // PKCE code exchange: chalio://auth-callback?code=...
    const code = u.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
    }
  } catch (e) {
    console.error("[native-auth] failed to handle url", e);
  }
  return false;
}
