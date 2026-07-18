## Current state (verified)

I queried `information_schema.tables` on the newly connected Supabase project and `public` returned **zero tables**. `src/integrations/supabase/types.ts` also shows an empty `Tables` map. So none of the previous schema carried over — everything must be recreated from scratch. The `supabase/config.toml` still points at the old project ref (`cqqhzmuhilpnjhcsixcp`), but the live connection is the new project (ref `xmstiriwubtoqwczbmod`) — that's where the migration will run.

## Plan

Run a single migration that recreates the full backend the app code in `src/lib/chalio.functions.ts` already expects. Schema and RLS mirror what we had before.

### 1. Tables (public schema)

Each gets explicit GRANTs (authenticated + service_role; anon only where a policy allows it) and RLS enabled.

- **profiles** — `id uuid PK` (references `auth.users`), `name`, `city` (default `'Latur'`), `area`, `avatar_url`, `coins int default 0`, `current_streak int default 0`, `longest_streak int default 0`, `last_login_date date`, `previous_rank int`, `fit_connected bool default false`, `daily_goal int default 8000`, `created_at`, `updated_at`.
- **settings** — `key text PK`, `value jsonb`. Read-only to authenticated.
- **daily_activity** — `id`, `user_id`, `date`, `steps`, `distance_km`, `calories`, `active_minutes`, `coins_awarded`, timestamps. Unique on `(user_id, date)`.
- **missions** — `id`, `title`, `description`, `target_type` (steps|distance_km|streak_days), `target_value numeric`, `reward_coins int`, `starts_at date`, `ends_at date`, `is_active bool`, `is_sponsored bool`, `sponsor_name`, `created_at`.
- **user_missions** — `id`, `user_id`, `mission_id`, `progress numeric default 0`, `completed bool default false`, `completed_at`, `claimed bool default false`, `created_at`. Unique `(user_id, mission_id)`.
- **coin_transactions** — `id`, `user_id`, `amount int`, `reason text`, `metadata jsonb`, `created_at`.
- **badges** — `id`, `user_id`, `mission_id`, `title`, `color`, `earned_at`.
- **reward_items** — `id`, `brand`, `label`, `coin_cost int`, `is_active bool default true`, `created_at`.
- **brand_requests** — `id`, `user_id`, `business_name`, `contact_info`, `reward_offer_description`, `target_mission_type`, `created_at`.

### 2. RLS policies

- `profiles`: any authenticated user can SELECT (needed for leaderboard: name, city, avatar, coins). Users can INSERT/UPDATE only their own row.
- `daily_activity`, `user_missions`, `coin_transactions`, `badges`, `brand_requests`: `auth.uid() = user_id` on all of SELECT/INSERT/UPDATE/DELETE. Server-fn writes run as the caller through `requireSupabaseAuth`, so this is sufficient.
- `missions`, `reward_items`, `settings`: SELECT to authenticated (read-only catalog). No client writes.
- No `anon` grants anywhere — the app is auth-gated.

### 3. Trigger — auto-create profile on signup

`handle_new_user()` (security definer, `search_path=public`) inserts a `profiles` row keyed to `NEW.id` with a name derived from `raw_user_meta_data->>'full_name'` or email. Attached as `AFTER INSERT ON auth.users`. EXECUTE revoked from `anon`/`authenticated`/`public`.

### 4. Seed data (in the same migration)

- `settings`: `steps_per_coin=100`, `daily_coin_cap=200`, `streak_bonuses={"3":10,"7":30,"14":75,"30":200}`.
- `missions`: 6 starter missions (2 sponsored — Decathlon and a local café — 4 regular) covering `steps`, `distance_km`, and `streak_days` target types.
- `reward_items`: 4 "coming soon" items with escalating `coin_cost`.

### 5. After the migration

Once approved and applied, Supabase regenerates `types.ts`. No app code changes are needed — `src/lib/chalio.functions.ts` and the route files already match this schema. I'll then run the Supabase linter and address any warnings tied to the new objects.

### Technical notes

- One migration, in order: CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY per table, then trigger, then seeds.
- `handle_new_user` uses `SECURITY DEFINER` with revoked EXECUTE — same pattern as before; this is the safe approach for cross-schema inserts from `auth.users`.
- I'll also update `supabase/config.toml` to the new `project_id` so local tooling matches.
