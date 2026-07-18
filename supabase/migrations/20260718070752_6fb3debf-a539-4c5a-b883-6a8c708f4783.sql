
CREATE OR REPLACE FUNCTION public.get_city_leaderboard(target_city text)
RETURNS TABLE (id uuid, name text, city text, avatar_url text, coins integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.city, p.avatar_url, p.coins
  FROM public.profiles p
  WHERE p.city = target_city
    AND COALESCE(p.leaderboard_excluded, false) = false
  ORDER BY p.coins DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_city_leaderboard(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_city_leaderboard(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_city_activity(target_city text, since_date date)
RETURNS TABLE (user_id uuid, total_steps bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT da.user_id, COALESCE(SUM(da.steps), 0)::bigint AS total_steps
  FROM public.daily_activity da
  JOIN public.profiles p ON p.id = da.user_id
  WHERE p.city = target_city
    AND COALESCE(p.leaderboard_excluded, false) = false
    AND da.date >= since_date
  GROUP BY da.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_city_activity(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_city_activity(text, date) TO authenticated;
