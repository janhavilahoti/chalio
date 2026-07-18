
-- Tighten UPDATE policy on profiles: block setting is_admin=true unless already admin,
-- and require protected fields to keep their current values for non-admins.
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;

CREATE POLICY "profiles update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    public.is_admin(auth.uid())
    OR (
      COALESCE(is_admin, false) = false
      AND COALESCE(is_flagged, false) = false
      AND admin_note IS NOT DISTINCT FROM (SELECT admin_note FROM public.profiles WHERE id = auth.uid())
      AND COALESCE(leaderboard_excluded, false) IS NOT DISTINCT FROM (SELECT COALESCE(leaderboard_excluded, false) FROM public.profiles WHERE id = auth.uid())
      AND coins IS NOT DISTINCT FROM (SELECT coins FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- Revoke anonymous EXECUTE on SECURITY DEFINER helpers (authenticated retains access for legitimate use)
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_coins(uuid, integer, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_city_leaderboard(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_city_activity(text, date) FROM PUBLIC, anon;
