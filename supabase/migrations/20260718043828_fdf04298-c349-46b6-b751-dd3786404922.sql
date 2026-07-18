
-- Remove the security definer view flagged by linter
DROP VIEW IF EXISTS public.leaderboard_profiles;

-- Drop owner-only SELECT from previous migration; use column grants instead
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Permissive row-level access for authenticated; column privileges restrict what they see
CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Restrict readable columns to safe leaderboard-relevant fields
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, name, city, area, avatar_url, coins, current_streak, longest_streak)
  ON public.profiles TO authenticated;

-- Owner-only full-row read via SECURITY DEFINER helper
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
