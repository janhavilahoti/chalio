
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  city text DEFAULT 'Latur',
  area text,
  avatar_url text,
  coins int NOT NULL DEFAULT 0,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_login_date date,
  previous_rank int,
  fit_connected boolean NOT NULL DEFAULT false,
  daily_goal int NOT NULL DEFAULT 8000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles select all auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ SETTINGS ============
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read auth" ON public.settings FOR SELECT TO authenticated USING (true);

-- ============ DAILY_ACTIVITY ============
CREATE TABLE public.daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  steps int NOT NULL DEFAULT 0,
  distance_km numeric NOT NULL DEFAULT 0,
  calories int NOT NULL DEFAULT 0,
  active_minutes int NOT NULL DEFAULT 0,
  coins_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX daily_activity_user_date_idx ON public.daily_activity(user_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_activity own" ON public.daily_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ MISSIONS ============
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  target_type text NOT NULL CHECK (target_type IN ('steps','distance_km','streak_days')),
  target_value numeric NOT NULL,
  reward_coins int NOT NULL DEFAULT 0,
  starts_at date,
  ends_at date,
  is_active boolean NOT NULL DEFAULT true,
  is_sponsored boolean NOT NULL DEFAULT false,
  sponsor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions read" ON public.missions FOR SELECT TO authenticated USING (true);

-- ============ USER_MISSIONS ============
CREATE TABLE public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress numeric NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_missions TO authenticated;
GRANT ALL ON public.user_missions TO service_role;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_missions own" ON public.user_missions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COIN_TRANSACTIONS ============
CREATE TABLE public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coin_tx own" ON public.coin_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ BADGES ============
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  title text NOT NULL,
  color text,
  earned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges own" ON public.badges FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ REWARD_ITEMS ============
CREATE TABLE public.reward_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  label text NOT NULL,
  coin_cost int NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_items TO authenticated;
GRANT ALL ON public.reward_items TO service_role;
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reward_items read" ON public.reward_items FOR SELECT TO authenticated USING (true);

-- ============ BRAND_REQUESTS ============
CREATE TABLE public.brand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  contact_info text NOT NULL,
  reward_offer_description text NOT NULL,
  target_mission_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_requests TO authenticated;
GRANT ALL ON public.brand_requests TO service_role;
ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_requests own" ON public.brand_requests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ handle_new_user trigger ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER daily_activity_updated BEFORE UPDATE ON public.daily_activity
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED DATA ============
INSERT INTO public.settings (key, value) VALUES
  ('steps_per_coin', '100'::jsonb),
  ('daily_coin_cap', '200'::jsonb),
  ('streak_bonuses', '{"3":10,"7":30,"14":75,"30":200}'::jsonb);

INSERT INTO public.missions (title, description, target_type, target_value, reward_coins, is_sponsored, sponsor_name) VALUES
  ('Daily 5K Steps', 'Walk 5,000 steps today to earn coins.', 'steps', 5000, 20, false, NULL),
  ('Weekly Warrior', 'Rack up 35,000 steps this week.', 'steps', 35000, 100, false, NULL),
  ('3K Distance Challenge', 'Cover 3 km in a single day.', 'distance_km', 3, 25, false, NULL),
  ('7-Day Streak', 'Open the app 7 days in a row.', 'streak_days', 7, 50, false, NULL),
  ('Decathlon Move More', 'Log 20,000 steps this week for a Decathlon voucher entry.', 'steps', 20000, 75, true, 'Decathlon'),
  ('Café Latur Morning Walk', 'Walk 2 km before noon and enjoy a free coffee.', 'distance_km', 2, 30, true, 'Café Latur');

INSERT INTO public.reward_items (brand, label, coin_cost) VALUES
  ('Decathlon', '10% off voucher', 2000),
  ('Café Latur', 'Free coffee', 1500),
  ('Local Gym', '1-day pass', 3500),
  ('Chalio Store', 'Branded water bottle', 5000);
