
-- ============ SETTINGS ============
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable by authenticated" ON public.settings FOR SELECT TO authenticated USING (true);

INSERT INTO public.settings(key, value) VALUES
  ('steps_per_coin', '100'::jsonb),
  ('daily_coin_cap', '200'::jsonb),
  ('streak_bonuses', '{"3": 20, "7": 75, "14": 150, "30": 400}'::jsonb);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Walker',
  city TEXT NOT NULL DEFAULT 'Latur',
  area TEXT NOT NULL DEFAULT 'Central Latur',
  avatar_url TEXT,
  coins INT NOT NULL DEFAULT 0,
  step_goal INT NOT NULL DEFAULT 10000,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_login_date DATE,
  previous_rank INT,
  fit_connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Any authenticated user can read profiles (used by leaderboard for name/city/coins)
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'Walker'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ DAILY ACTIVITY ============
CREATE TABLE public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INT NOT NULL DEFAULT 0,
  distance_km NUMERIC(8,2) NOT NULL DEFAULT 0,
  calories INT NOT NULL DEFAULT 0,
  active_minutes INT NOT NULL DEFAULT 0,
  coins_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE INDEX daily_activity_user_date_idx ON public.daily_activity(user_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily_activity" ON public.daily_activity FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ MISSIONS ============
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('steps','distance_km','streak_days')),
  target_value NUMERIC NOT NULL,
  reward_coins INT NOT NULL,
  starts_at DATE,
  ends_at DATE,
  sponsored_by TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  participants_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions readable by authenticated" ON public.missions FOR SELECT TO authenticated USING (is_active = true);

-- ============ USER MISSIONS ============
CREATE TABLE public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, mission_id)
);
CREATE INDEX user_missions_user_idx ON public.user_missions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_missions TO authenticated;
GRANT ALL ON public.user_missions TO service_role;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_missions" ON public.user_missions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ COIN TRANSACTIONS ============
CREATE TABLE public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX coin_tx_user_created_idx ON public.coin_transactions(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coin_tx select" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own coin_tx insert" ON public.coin_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ BADGES ============
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-brand-blue',
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, title)
);
CREATE INDEX badges_user_idx ON public.badges(user_id);
GRANT SELECT, INSERT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
-- Users can read their own badges; also allow any authenticated user to see any badge (for profile viewing later). Keep to own for privacy.
CREATE POLICY "own badges" ON public.badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own badges insert" ON public.badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ REWARD ITEMS ============
CREATE TABLE public.reward_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  label TEXT NOT NULL,
  coin_cost INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_items TO authenticated;
GRANT ALL ON public.reward_items TO service_role;
ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reward_items readable" ON public.reward_items FOR SELECT TO authenticated USING (is_active = true);

-- ============ BRAND REQUESTS ============
CREATE TABLE public.brand_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  contact_info TEXT NOT NULL,
  reward_offer_description TEXT NOT NULL,
  target_mission_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.brand_requests TO authenticated;
GRANT ALL ON public.brand_requests TO service_role;
ALTER TABLE public.brand_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brand_requests select" ON public.brand_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "authenticated brand_requests insert" ON public.brand_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============ SEED MISSIONS ============
INSERT INTO public.missions (title, description, target_type, target_value, reward_coins, starts_at, ends_at, sponsored_by, participants_count) VALUES
  ('Daily 10k', 'Walk 10,000 steps today.', 'steps', 10000, 50, CURRENT_DATE, CURRENT_DATE + 30, NULL, 12480),
  ('Weekend Warrior', 'Log 25 km across the week.', 'distance_km', 25, 200, CURRENT_DATE, CURRENT_DATE + 7, NULL, 3210),
  ('7-Day Streak', 'Hit your step goal 7 days in a row.', 'streak_days', 7, 150, CURRENT_DATE, CURRENT_DATE + 60, NULL, 5610),
  ('30-Day Streak', 'Hit your step goal 30 days in a row.', 'streak_days', 30, 800, CURRENT_DATE, CURRENT_DATE + 90, NULL, 812),
  ('Decathlon 5k Challenge', 'Cover 5 km this week near a Decathlon store.', 'distance_km', 5, 300, CURRENT_DATE, CURRENT_DATE + 14, 'Decathlon', 842),
  ('Café Coffee Walk', 'Take 3,000 morning steps this week.', 'steps', 3000, 120, CURRENT_DATE, CURRENT_DATE + 14, 'Café Coffee Day', 1204);

-- ============ SEED REWARDS ============
INSERT INTO public.reward_items (brand, label, coin_cost) VALUES
  ('Amazon',    'INR 100 voucher',   2000),
  ('Swiggy',    'INR 150 credit',    3000),
  ('Starbucks', 'Coffee on us',      4500),
  ('Decathlon', 'INR 500 gift card', 8000);
