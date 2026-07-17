import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [status, setStatus] = useState<"loading" | "authed" | "anon">("loading");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
      setStatus(data.session ? "authed" : "anon");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setStatus(session ? "authed" : "anon");
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { status, userId };
}

export function useRequireAuth() {
  const { status } = useSession();
  const navigate = useNavigate();
  useEffect(() => {
    if (status === "anon") navigate({ to: "/login", replace: true });
  }, [status, navigate]);
  return status;
}
