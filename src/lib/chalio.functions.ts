import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- helpers ----------
async function readSettings(supabase: any) {
  try {
    const { data } = await supabase.from("settings").select("key,value");
    const map: Record<string, any> = {};
    (data ?? []).forEach((r: any) => (map[r.key] = r.value));
    return {
      stepsPerCoin: Number(map.steps_per_coin ?? 100),
      dailyCoinCap: Number(map.daily_coin_cap ?? 200),
      streakBonuses: (map.streak_bonuses ?? {}) as Record<string, number>,
    };
  } catch (e) {
    return { stepsPerCoin: 100, dailyCoinCap: 200, streakBonuses: {} as Record<string, number> };
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function recomputeMissionProgress(supabase: any, userId: string) {
  // Load user's joined missions + missions catalog
  const { data: ums } = await supabase
    .from("user_missions")
    .select("id, mission_id, progress, completed, claimed, missions(id,title,target_type,target_value,reward_coins,starts_at,ends_at)")
    .eq("user_id", userId);

  if (!ums?.length) return { newlyCompleted: [] as Array<{ title: string; reward: number; mission_id: string }> };

  const { data: profile } = await supabase.from("profiles").select("current_streak").eq("id", userId).single();
  const streak = profile?.current_streak ?? 0;

  const newlyCompleted: Array<{ title: string; reward: number; mission_id: string }> = [];

  for (const um of ums) {
    const m = um.missions;
    if (!m) continue;
    let progress = 0;
    if (m.target_type === "streak_days") {
      progress = streak;
    } else {
      // sum daily_activity in window
      const col = m.target_type === "steps" ? "steps" : "distance_km";
      let q = supabase.from("daily_activity").select(col).eq("user_id", userId);
      if (m.starts_at) q = q.gte("date", m.starts_at);
      if (m.ends_at) q = q.lte("date", m.ends_at);
      const { data: rows } = await q;
      progress = (rows ?? []).reduce((s: number, r: any) => s + Number(r[col] ?? 0), 0);
    }

    const wasCompleted = um.completed;
    const nowCompleted = progress >= Number(m.target_value);

    const updates: any = { progress };
    if (nowCompleted && !wasCompleted) {
      updates.completed = true;
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from("user_missions").update(updates).eq("id", um.id);

    if (nowCompleted && !wasCompleted && !um.claimed) {
      // auto-award coins (transaction + balance) atomically via RPC
      await supabase.rpc("award_coins", {
        _user: userId,
        _amount: m.reward_coins,
        _reason: `mission:${m.id}`,
        _metadata: { title: m.title },
      });
      await supabase.from("badges").insert({
        user_id: userId,
        mission_id: m.id,
        title: m.title,
        color: "bg-brand-yellow",
      }).select();
      await supabase.from("user_missions").update({ claimed: true }).eq("id", um.id);

      newlyCompleted.push({ title: m.title, reward: m.reward_coins, mission_id: m.id });
    }
  }

  return { newlyCompleted };
}

async function processDailyLogin(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("last_login_date, current_streak, longest_streak")
    .eq("id", userId)
    .single();

  const today = todayISO();
  const yest = yesterdayISO();

  if (!profile) return { streakBonus: 0, currentStreak: 0 };
  if (profile.last_login_date === today) {
    return { streakBonus: 0, currentStreak: profile.current_streak };
  }

  let newStreak = 1;
  if (profile.last_login_date === yest) newStreak = (profile.current_streak ?? 0) + 1;
  const longest = Math.max(profile.longest_streak ?? 0, newStreak);

  const settings = await readSettings(supabase);
  const bonus = Number(settings.streakBonuses?.[String(newStreak)] ?? 0);

  await supabase
    .from("profiles")
    .update({ last_login_date: today, current_streak: newStreak, longest_streak: longest })
    .eq("id", userId);

  if (bonus > 0) {
    await supabase.rpc("award_coins", {
      _user: userId,
      _amount: bonus,
      _reason: `streak_bonus:${newStreak}`,
      _metadata: {},
    });
  }

  return { streakBonus: bonus, currentStreak: newStreak };
}

// ---------- server functions ----------

export const getBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // ensure profile exists (defensive)
    const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!existing) {
      await supabase.from("profiles").insert({ id: userId }).select();
    }

    const streakResult = await processDailyLogin(supabase, userId);
    const missionResult = await recomputeMissionProgress(supabase, userId);

    const [{ data: profile }, { data: today }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("daily_activity").select("*").eq("user_id", userId).eq("date", todayISO()).maybeSingle(),
    ]);

    // rank in city — SECURITY DEFINER RPC, callable by authenticated users (returns safe columns only)
    const city = profile?.city ?? "Latur";
    const { data: cityUsers, error: rankErr } = await supabase.rpc("get_city_leaderboard", { target_city: city });
    if (rankErr) console.error("[getBootstrap] get_city_leaderboard failed:", rankErr.message);
    const currentRank = (cityUsers ?? []).findIndex((u: any) => u.id === userId) + 1;
    const rankImproved =
      profile?.previous_rank != null && currentRank > 0 && currentRank < profile.previous_rank;

    if (currentRank > 0 && currentRank !== profile?.previous_rank) {
      await supabase.from("profiles").update({ previous_rank: currentRank }).eq("id", userId);
    }

    const { count: activeMissions } = await supabase
      .from("user_missions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", false);

    return {
      profile,
      today: today ?? { steps: 0, distance_km: 0, calories: 0, active_minutes: 0 },
      currentRank,
      activeMissions: activeMissions ?? 0,
      toasts: {
        streakBonus: streakResult.streakBonus,
        currentStreak: streakResult.currentStreak,
        rankImproved: rankImproved ? { newRank: currentRank, oldRank: profile.previous_rank } : null,
        missionsCompleted: missionResult.newlyCompleted,
      },
    };
  });

export const simulateActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { steps: number }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const settings = await readSettings(supabase);
    const today = todayISO();

    const addSteps = Math.max(0, Math.floor(data.steps));
    // upsert today's activity by adding
    const { data: existing } = await supabase
      .from("daily_activity")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    const prevSteps = existing?.steps ?? 0;
    const newSteps = prevSteps + addSteps;
    const distance = +(newSteps * 0.00075).toFixed(2); // ~0.75m per step
    const calories = Math.round(newSteps * 0.04);
    const activeMin = Math.round(newSteps / 110);

    // coin calc from steps, capped at daily cap
    const eligibleCoinsUncapped = Math.floor(newSteps / settings.stepsPerCoin);
    const eligibleCoins = Math.min(eligibleCoinsUncapped, settings.dailyCoinCap);
    const prevAwarded = existing?.coins_awarded ?? 0;
    const coinDelta = Math.max(0, eligibleCoins - prevAwarded);

    if (existing) {
      await supabase
        .from("daily_activity")
        .update({
          steps: newSteps,
          distance_km: distance,
          calories,
          active_minutes: activeMin,
          coins_awarded: eligibleCoins,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("daily_activity").insert({
        user_id: userId,
        date: today,
        steps: newSteps,
        distance_km: distance,
        calories,
        active_minutes: activeMin,
        coins_awarded: eligibleCoins,
      });
    }

    if (coinDelta > 0) {
      await supabase.rpc("award_coins", {
        _user: userId,
        _amount: coinDelta,
        _reason: "steps",
        _metadata: { date: today, steps: newSteps },
      });
    }

    const missionResult = await recomputeMissionProgress(supabase, userId);
    return { coinDelta, newSteps, missionsCompleted: missionResult.newlyCompleted };
  });

// Native Health Connect sync — writes ABSOLUTE totals for today (idempotent),
// unlike simulateActivity which adds. Reuses the same coin/mission pipeline.
export const syncHealthActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { steps: number; distance_km: number; calories: number }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const settings = await readSettings(supabase);
    const today = todayISO();

    const newSteps = Math.max(0, Math.floor(data.steps));
    const distance = Math.max(0, +Number(data.distance_km).toFixed(2));
    const calories = Math.max(0, Math.floor(data.calories));
    const activeMin = Math.round(newSteps / 110);

    const { data: existing } = await supabase
      .from("daily_activity")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    // Never regress totals — Health Connect can lag behind on-device counters.
    const finalSteps = Math.max(existing?.steps ?? 0, newSteps);
    const finalDistance = Math.max(Number(existing?.distance_km ?? 0), distance);
    const finalCalories = Math.max(existing?.calories ?? 0, calories);
    const finalActiveMin = Math.max(existing?.active_minutes ?? 0, activeMin);

    const eligibleCoinsUncapped = Math.floor(finalSteps / settings.stepsPerCoin);
    const eligibleCoins = Math.min(eligibleCoinsUncapped, settings.dailyCoinCap);
    const prevAwarded = existing?.coins_awarded ?? 0;
    const coinDelta = Math.max(0, eligibleCoins - prevAwarded);

    if (existing) {
      await supabase
        .from("daily_activity")
        .update({
          steps: finalSteps,
          distance_km: finalDistance,
          calories: finalCalories,
          active_minutes: finalActiveMin,
          coins_awarded: eligibleCoins,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("daily_activity").insert({
        user_id: userId,
        date: today,
        steps: finalSteps,
        distance_km: finalDistance,
        calories: finalCalories,
        active_minutes: finalActiveMin,
        coins_awarded: eligibleCoins,
      });
    }

    if (coinDelta > 0) {
      await supabase.rpc("award_coins", {
        _user: userId,
        _amount: coinDelta,
        _reason: "steps",
        _metadata: { date: today, steps: finalSteps, source: "health_connect" },
      });
    }

    const missionResult = await recomputeMissionProgress(supabase, userId);
    return { coinDelta, steps: finalSteps, missionsCompleted: missionResult.newlyCompleted };
  });

export const listMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: missions }, { data: userMissions }] = await Promise.all([
      supabase.from("missions").select("*").eq("is_active", true).order("created_at"),
      supabase.from("user_missions").select("*").eq("user_id", userId),
    ]);
    const umMap = new Map((userMissions ?? []).map((u: any) => [u.mission_id, u]));
    return (missions ?? []).map((m: any) => ({
      ...m,
      user_mission: umMap.get(m.id) ?? null,
    }));
  });

export const joinMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { missionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_missions")
      .upsert({ user_id: userId, mission_id: data.missionId }, { onConflict: "user_id,mission_id" });
    await recomputeMissionProgress(supabase, userId);
    return { ok: true };
  });

export const leaveMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { missionId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("user_missions")
      .delete()
      .eq("user_id", userId)
      .eq("mission_id", data.missionId)
      .eq("completed", false);
    return { ok: true };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope: "city" | "challenge" | "friends"; period: "week" | "month" | "all"; missionId?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me, error: meErr } = await supabase.from("profiles").select("city, area").eq("id", userId).maybeSingle();
    if (meErr) throw new Error(`Failed to load your profile: ${meErr.message}`);
    const city = me?.city ?? "Latur";

    // Fetch all city profiles via SECURITY DEFINER RPC (authenticated-callable, returns safe columns only).
    const { data: cityProfiles, error: lbErr } = await supabase.rpc("get_city_leaderboard", { target_city: city });
    if (lbErr) throw new Error(`Failed to load leaderboard: ${lbErr.message}`);
    const profiles = (cityProfiles ?? []) as Array<{ id: string; name: string; city: string; avatar_url: string | null; coins: number }>;

    if (data.period === "all") {
      return profiles
        .slice()
        .sort((a, b) => (b.coins ?? 0) - (a.coins ?? 0))
        .slice(0, 50)
        .map((r, i) => ({
          rank: i + 1,
          user_id: r.id,
          name: r.name,
          city: r.city,
          avatar_url: r.avatar_url,
          score: r.coins ?? 0,
          isYou: r.id === userId,
        }));
    }

    // week/month: sum steps in window across users in same city via SECURITY DEFINER RPC
    const days = data.period === "week" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString().slice(0, 10);

    const { data: activity, error: actErr } = await supabase.rpc("get_city_activity", {
      target_city: city,
      since_date: sinceISO,
    });
    if (actErr) throw new Error(`Failed to load activity: ${actErr.message}`);
    const totals = new Map<string, number>();
    ((activity ?? []) as Array<{ user_id: string; total_steps: number }>).forEach((a) => {
      totals.set(a.user_id, Number(a.total_steps ?? 0));
    });

    return profiles
      .map((p) => ({
        user_id: p.id,
        name: p.name,
        city: p.city,
        avatar_url: p.avatar_url,
        score: totals.get(p.id) ?? 0,
        isYou: p.id === userId,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((r, i) => ({ rank: i + 1, ...r }));
  });


export const getRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: items }, { data: badges }, { data: profile }] = await Promise.all([
      supabase.from("reward_items").select("*").eq("is_active", true).order("coin_cost"),
      supabase.from("badges").select("*").eq("user_id", userId).order("earned_at", { ascending: false }),
      supabase.from("profiles").select("coins").eq("id", userId).single(),
    ]);
    return { items: items ?? [], badges: badges ?? [], coins: profile?.coins ?? 0 };
  });

export const getProfileStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: activity }, { data: badges }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("daily_activity").select("steps, distance_km").eq("user_id", userId),
      supabase.from("badges").select("*").eq("user_id", userId).order("earned_at", { ascending: false }),
    ]);
    const totalSteps = (activity ?? []).reduce((s: number, a: any) => s + Number(a.steps ?? 0), 0);
    const totalKm = +(activity ?? []).reduce((s: number, a: any) => s + Number(a.distance_km ?? 0), 0).toFixed(1);
    const level = Math.max(1, Math.floor(totalSteps / 50000) + 1);
    return { profile, totalSteps, totalKm, level, badges: badges ?? [] };
  });

export const submitBrandRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    business_name: string;
    contact_info: string;
    reward_offer_description: string;
    target_mission_type: string;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("brand_requests").insert({
      user_id: userId,
      business_name: data.business_name,
      contact_info: data.contact_info,
      reward_offer_description: data.reward_offer_description,
      target_mission_type: data.target_mission_type,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markFitConnected = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("profiles").update({ fit_connected: true }).eq("id", userId);
    return { ok: true };
  });

export const updateProfileLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { city?: string | null; area?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const patch: { city?: string; area?: string } = {};
    if (typeof data.city === "string" && data.city.trim()) patch.city = data.city.trim();
    if (typeof data.area === "string" && data.area.trim()) patch.area = data.area.trim();
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Walk activities ----------

type LatLng = { lat: number; lng: number; t?: number };

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Sum path distance, excluding any segment implying >15 km/h sustained movement (anti-cheat). */
function computeCleanDistanceKm(path: LatLng[]): number {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const d = haversineKm(a, b);
    const dt = a.t && b.t ? Math.max(0.001, (b.t - a.t) / 1000 / 3600) : d / 5; // fallback 5 km/h
    const speed = d / dt;
    if (speed > 15) continue;
    total += d;
  }
  return +total.toFixed(3);
}

export const saveActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      started_at: string;
      ended_at: string;
      duration_seconds: number;
      path: LatLng[];
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const settings = await readSettings(supabase);

    const distanceKm = computeCleanDistanceKm(data.path ?? []);
    const durationSec = Math.max(1, Math.floor(data.duration_seconds));
    const hours = durationSec / 3600;
    const avgSpeed = +(distanceKm / Math.max(hours, 0.001)).toFixed(2);
    // MET-based calories: walking ~ 3.5 MET at moderate pace, assume 70kg average
    const met = avgSpeed < 4 ? 3.0 : avgSpeed < 6 ? 4.3 : 5.5;
    const calories = Math.round(met * 70 * hours);
    const steps = Math.round((distanceKm * 1000) / 0.75); // ~0.75m per step

    // Insert activity row
    const { data: row, error } = await supabase
      .from("activities")
      .insert({
        user_id: userId,
        started_at: data.started_at,
        ended_at: data.ended_at,
        duration_seconds: durationSec,
        distance_km: distanceKm,
        avg_speed_kmh: avgSpeed,
        calories,
        steps,
        path: data.path as unknown as object,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // Roll into today's daily_activity (additive) and award coins for steps
    const today = todayISO();
    const { data: existing } = await supabase
      .from("daily_activity")
      .select("*")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    const newSteps = (existing?.steps ?? 0) + steps;
    const newDistance = +((existing?.distance_km ?? 0) + distanceKm).toFixed(2);
    const newCalories = (existing?.calories ?? 0) + calories;
    const newActive = (existing?.active_minutes ?? 0) + Math.round(durationSec / 60);
    const eligibleCoins = Math.min(
      Math.floor(newSteps / settings.stepsPerCoin),
      settings.dailyCoinCap,
    );
    const prevAwarded = existing?.coins_awarded ?? 0;
    const coinDelta = Math.max(0, eligibleCoins - prevAwarded);

    if (existing) {
      await supabase
        .from("daily_activity")
        .update({
          steps: newSteps,
          distance_km: newDistance,
          calories: newCalories,
          active_minutes: newActive,
          coins_awarded: eligibleCoins,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("daily_activity").insert({
        user_id: userId,
        date: today,
        steps: newSteps,
        distance_km: newDistance,
        calories: newCalories,
        active_minutes: newActive,
        coins_awarded: eligibleCoins,
      });
    }

    if (coinDelta > 0) {
      await supabase.rpc("award_coins", {
        _user: userId,
        _amount: coinDelta,
        _reason: `walk:${row.id}`,
        _metadata: { activity_id: row.id, steps, distance_km: distanceKm },
      });
      await supabase.from("activities").update({ coins_awarded: coinDelta }).eq("id", row.id);
    }

    const missionResult = await recomputeMissionProgress(supabase, userId);

    return {
      activity: { ...row, coins_awarded: coinDelta },
      coinDelta,
      missionsCompleted: missionResult.newlyCompleted,
    };
  });

export const listActivities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("activities")
      .select("id, started_at, ended_at, duration_seconds, distance_km, avg_speed_kmh, calories, steps, coins_awarded")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("activities")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const disconnectFit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update({ fit_connected: false }).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { name?: string; city?: string; area?: string; avatar_url?: string; daily_goal?: number }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {};
    if (typeof data.name === "string" && data.name.trim()) patch.name = data.name.trim();
    if (typeof data.city === "string") patch.city = data.city.trim() || null;
    if (typeof data.area === "string") patch.area = data.area.trim() || null;
    if (typeof data.avatar_url === "string") patch.avatar_url = data.avatar_url || null;
    if (typeof data.daily_goal === "number" && data.daily_goal > 0)
      patch.daily_goal = Math.min(100000, Math.floor(data.daily_goal));
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getWeeklyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const sinceISO = since.toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_activity")
      .select("date, steps, distance_km, calories, active_minutes")
      .eq("user_id", userId)
      .gte("date", sinceISO)
      .order("date");
    return data ?? [];
  });

