
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Restore full-column SELECT for owner reads (RLS still restricts to own row)
GRANT SELECT ON public.profiles TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_profile();
