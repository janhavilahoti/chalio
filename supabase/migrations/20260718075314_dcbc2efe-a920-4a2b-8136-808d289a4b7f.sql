
GRANT EXECUTE ON FUNCTION public.get_city_leaderboard(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_activity(text, date) TO authenticated;
GRANT SELECT ON public.settings TO authenticated;
