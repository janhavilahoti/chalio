# Live Walk Tracking + Profile Redesign

Major additive feature. Delivered in 5 phases so we can verify each before moving on.

## 0. Setup / prerequisites

- **Mapbox token**: add `VITE_MAPBOX_ACCESS_TOKEN` via `add_secret` (publishable — safe in client). All web + native map rendering uses Mapbox GL JS inside the webview. Static share snapshots use the Mapbox Static Images API (same token).
- **Packages**: `mapbox-gl`, `@capacitor/geolocation`, `html-to-image` (PNG export of share card).
- **Native manifest note**: user must add `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` (and background variant if we ever want background tracking — not in scope now) to `AndroidManifest.xml` after `cap sync`.

## 1. Data model (single migration)

New table `walk_sessions`:

```
id uuid pk, user_id uuid (fk profiles.id), started_at timestamptz,
ended_at timestamptz, duration_s int, distance_km numeric,
avg_speed_kmh numeric, calories int, steps_estimate int,
path geometry-agnostic: store as jsonb `path` = [{lat,lng,t}, ...] (simple, portable),
created_at timestamptz default now()
```

RLS: owner-only select/insert/update; standard GRANTs to `authenticated` + `service_role`. Add `ALTER PUBLICATION supabase_realtime` NOT needed.

Extend existing coin-award/mission-recompute pipeline: after inserting a `walk_session`, upsert its steps/distance/calories/minutes into today's `daily_activity` row (add absolute-safe merge like `syncHealthActivity` already does), then reuse existing mission recompute.

`profiles` already has name/city/avatar_url/daily_goal — profile edit writes those. New Supabase Storage bucket `avatars` (public read, owner write via RLS on `storage.objects`).

## 2. Settings section — connect/disconnect (in Profile)

Redesign the settings list in `_app.profile` (move `profile.tsx` under `_app` while at it so it uses the app shell). New "Connect an app or device" card:

- Native: query `checkHealthAuthorized()` on mount → show Connected/Not connected. Disconnect = confirm dialog → set `fit_connected=false` server-side (new `disconnectFit` server fn) + advise user to revoke in Health Connect settings (we can't programmatically revoke; link to system settings).
- Web: read `profile.fit_connected`. Disconnect just flips the flag.
- Connect action reroutes to existing `/connect-fit`.

## 3. Profile redesign (`_app.profile`)

- Header: avatar (tap → change), name, city, small **Edit** button → `/profile/edit`.
- Stat pills: Rank (this week, city), Missions completed, Streak, Level.
- "This week" card: distance / time / calories with a 7-bar mini-chart (SVG, reuse tailwind tokens, no new dep).
- Sections: **Activities** → `/activities` list; **Badges** grid (existing); **Missions** → `/activities/missions` history (completed user_missions).
- Settings block (item 2) sits below.

## 4. Live tracking screen `/walk`

Full-screen. Uses Mapbox GL JS in every environment (native uses same web bundle via Capacitor webview).

- On mount: request location (Capacitor Geolocation on native, `navigator.geolocation` on web). Show permission-denied fallback with retry.
- Map: dark/light Mapbox style, follow-mode camera. Current-position blue dot pulses. GeoJSON `LineString` source updated on each new point.
- `watchPosition` (high accuracy). Anti-cheat: reject a segment where `distance / dt > 15 km/h`; do not add to `distance` or path. Keep raw points for debugging inside jsonb.
- Timer runs client-side; pause stops both timer + point capture.
- Bottom sheet (simple draggable via translateY on drag; not a new dep): Time / Distance / Current speed. Buttons: Pause → Resume + Finish.
- Finish → call `finishWalk` server fn with `{ started_at, ended_at, path, distance_km, avg_speed_kmh, calories, steps_estimate }`. Server merges into `daily_activity`, recomputes missions, awards coins, returns `walk_session.id`. Navigate to `/walk/$id`.

Calories: reuse existing MET formula (already in codebase — search & call). Steps estimate: `distance_km * 1312` (avg 1312 steps/km) unless we already have a helper.

## 5. Share card `/walk/$id`

- Static Mapbox map: `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/path-5+3b82f6-0.8({encodedPolyline})/auto/600x360@2x?access_token=…` (encode LineString → polyline5).
- Stats grid: Distance / Duration / Avg speed / Calories / Steps.
- Highlight banner if this walk closed a mission/badge (server fn returns them).
- Chalio branding, date, user name.
- **Share**: `navigator.share` when available (web + native), else WhatsApp URL fallback.
- **Download PNG**: `html-to-image` → download.
- Same route serves as history detail (viewed from Profile → Activities).

## 6. Profile edit `/profile/edit`

Form: avatar upload → `avatars` bucket, name, city, daily_goal. Save via `updateProfile` server fn (RLS enforces owner). Invalidate `bootstrap` + `profile-stats` queries so Home / Leaderboard reflect immediately.

## 7. Home hook-up

- Add prominent "Start Walk" primary CTA (replaces the "+1,000 steps" placement on native; keeps demo button below as secondary on web only per instructions).
- FAB style rounded pill in brand-blue.

## Files touched / created

New: `src/routes/_app.walk.tsx`, `src/routes/_app.walk.$id.tsx`, `src/routes/_app.activities.tsx`, `src/routes/_app.profile.edit.tsx`, `src/components/chalio/MapView.tsx`, `src/components/chalio/ShareCard.tsx`, `src/lib/geo.ts` (haversine, polyline5 encode, MET, anti-cheat), `src/lib/walk.functions.ts`.

Edit: `src/routes/_app.home.tsx` (Start Walk CTA), migrate `src/routes/profile.tsx` → `src/routes/_app.profile.tsx` with full redesign + settings block, `src/lib/chalio.functions.ts` (extend for updateProfile + disconnectFit), `src/routes/__root.tsx` (Mapbox CSS `<link>` in head).

Migration: `walk_sessions` table + RLS + grants; `avatars` storage bucket created via storage tool + object RLS.

## Confirmations needed before I start

1. OK to add a Mapbox account requirement — I'll request `VITE_MAPBOX_ACCESS_TOKEN` via `add_secret` when we begin; UI degrades gracefully to a "map unavailable" placeholder if it's missing so build still passes.
2. OK to store the walk path as `jsonb` (portable, no PostGIS dependency)? PostGIS would be nicer for querying but overkill here.
3. Native background tracking (screen-off) is out of scope — walks pause if OS suspends the app. Confirm that's acceptable for v1.
