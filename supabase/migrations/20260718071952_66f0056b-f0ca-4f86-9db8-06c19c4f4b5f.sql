
-- Fix 1: profiles_self_update_is_admin — attach existing guard trigger
DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Fix 2: profiles_leaderboard_public_read_exposure — drop broad SELECT policy
DROP POLICY IF EXISTS "leaderboard_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_leaderboard_read" ON public.profiles;
DROP POLICY IF EXISTS "Leaderboard public read" ON public.profiles;

-- Fix 3: SUPA_authenticated_security_definer_function_executable —
-- lock down SECURITY DEFINER helpers so only service_role can execute them
REVOKE ALL ON FUNCTION public.get_city_leaderboard(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_city_activity(text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_leaderboard(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_city_activity(text, date) TO service_role;
