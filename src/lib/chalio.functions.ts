import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- helpers ----------
async function readSettings(_supabase: any) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("settings").select("key,value");
  const map: Record<string, any> = {};
  (data ?? []).forEach((r: any) => (map[r.key] = r.value));
  return {
    stepsPerCoin: Number(map.steps_per_coin ?? 100),
    dailyCoinCap: Number(map.daily_coin_cap ?? 200),
    streakBonuses: (map.streak_bonuses ?? {}) as Record<string, number>,
  };
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
      // auto-award coins + badge
      await supabase.from("coin_transactions").insert({
        user_id: userId,
        amount: m.reward_coins,
        reason: `mission:${m.id}`,
        metadata: { title: m.title },
      });
      
      // increment coins on profile
      const { data: p } = await supabase.from("profiles").select("coins").eq("id", userId).single();
      await supabase.from("profiles").update({ coins: (p?.coins ?? 0) + m.reward_coins }).eq("id", userId);
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
    await supabase.from("coin_transactions").insert({
      user_id: userId,
      amount: bonus,
      reason: `streak_bonus:${newStreak}`,
    });
    const { data: p } = await supabase.from("profiles").select("coins").eq("id", userId).single();
    await supabase.from("profiles").update({ coins: (p?.coins ?? 0) + bonus }).eq("id", userId);
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

    // rank in city — use admin client with explicit safe-column projection
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cityUsers } = await supabaseAdmin
      .from("profiles")
      .select("id, coins")
      .eq("city", profile?.city ?? "Latur")
      .order("coins", { ascending: false });
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
      await supabase.from("coin_transactions").insert({
        user_id: userId,
        amount: coinDelta,
        reason: "steps",
        metadata: { date: today, steps: newSteps },
      });
      const { data: p } = await supabase.from("profiles").select("coins").eq("id", userId).single();
      await supabase.from("profiles").update({ coins: (p?.coins ?? 0) + coinDelta }).eq("id", userId);
    }

    const missionResult = await recomputeMissionProgress(supabase, userId);
    return { coinDelta, newSteps, missionsCompleted: missionResult.newlyCompleted };
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabase.from("profiles").select("city, area").eq("id", userId).single();

    if (data.scope === "challenge" && data.missionId) {
      const { data: ums } = await supabaseAdmin
        .from("user_missions")
        .select("progress, user_id, profiles!inner(id, name, city, avatar_url)")
        .eq("mission_id", data.missionId)
        .order("progress", { ascending: false })
        .limit(50);
      return (ums ?? []).map((r: any, i: number) => ({
        rank: i + 1,
        user_id: r.profiles.id,
        name: r.profiles.name,
        city: r.profiles.city,
        avatar_url: r.profiles.avatar_url,
        score: Number(r.progress ?? 0),
        isYou: r.profiles.id === userId,
      }));
    }

    // city / friends: rank by period score (cross-user reads via admin)
    let query = supabaseAdmin.from("profiles").select("id, name, city, avatar_url, coins").eq("city", me?.city ?? "Latur");

    if (data.period === "all") {
      const { data: rows } = await query.order("coins", { ascending: false }).limit(50);
      return (rows ?? []).map((r: any, i: number) => ({
        rank: i + 1,
        user_id: r.id,
        name: r.name,
        city: r.city,
        avatar_url: r.avatar_url,
        score: r.coins,
        isYou: r.id === userId,
      }));
    }

    // week/month: sum steps in window across users in same city
    const days = data.period === "week" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString().slice(0, 10);

    const { data: cityProfiles } = await query.limit(200);
    const ids = (cityProfiles ?? []).map((p: any) => p.id);
    if (!ids.length) return [];

    const { data: activities } = await supabaseAdmin
      .from("daily_activity")
      .select("user_id, steps")
      .in("user_id", ids)
      .gte("date", sinceISO);

    const totals = new Map<string, number>();
    (activities ?? []).forEach((a: any) => {
      totals.set(a.user_id, (totals.get(a.user_id) ?? 0) + Number(a.steps ?? 0));
    });

    const rows = (cityProfiles ?? [])
      .map((p: any) => ({
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

    return rows;
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
