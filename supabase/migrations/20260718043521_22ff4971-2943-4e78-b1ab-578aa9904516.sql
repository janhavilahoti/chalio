
-- 1. Profiles: restrict SELECT to owner; expose safe leaderboard fields via view
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND cmd='SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE VIEW public.leaderboard_profiles
WITH (security_invoker = false) AS
SELECT id, name, city, area, avatar_url, coins, current_streak
FROM public.profiles;

GRANT SELECT ON public.leaderboard_profiles TO authenticated;

-- 2. Badges: owner UPDATE/DELETE
CREATE POLICY "Users can update own badges" ON public.badges
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own badges" ON public.badges
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Brand requests: owner UPDATE/DELETE
CREATE POLICY "Users can update own brand requests" ON public.brand_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own brand requests" ON public.brand_requests
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
