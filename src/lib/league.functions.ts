import { createServerFn } from "@tanstack/react-start";

import {
  admin,
  computeStandings,
  getSession,
  loadLeague,
  requireAdmin,
  roundRobin,
  safeEqual,
} from "./league.server";

export const getLeague = createServerFn({ method: "GET" }).handler(async () => loadLeague());

export const getAdminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  return { isAdmin: Boolean(session.data.isAdmin), username: session.data.username ?? null };
});

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("admin_users")
      .select("username,password_hash")
      .eq("username", data.username.trim().toLowerCase())
      .maybeSingle();
    if (!row) return { ok: false as const };
    const { data: check } = await db.rpc("verify_admin_password" as never, {} as never);
    void check;
    const { data: match } = await db
      .from("admin_users")
      .select("username")
      .eq("username", row.username)
      .filter("password_hash", "eq", row.password_hash)
      .maybeSingle();
    void match;
    const crypto = await import("bcryptjs");
    const valid = await crypto.compare(data.password, row.password_hash);
    if (!valid || !safeEqual(row.username, data.username.trim().toLowerCase())) {
      return { ok: false as const };
    }
    const session = await getSession();
    await session.update({ isAdmin: true, username: row.username });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSession();
  await session.clear();
  return { ok: true as const };
});

export const savePlayer = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id?: string; name: string; team_name: string; logo_url: string | null }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const payload = {
      name: data.name.trim(),
      team_name: data.team_name.trim(),
      logo_url: data.logo_url?.trim() || null,
    };
    if (data.id) {
      const { error } = await db.from("players").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("players").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deletePlayer = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { error } = await db.from("players").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const saveMatchResult = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      matchId: string;
      homeScore: number;
      awayScore: number;
      completed: boolean;
      stats: { player_id: string; goals: number; assists: number }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { error } = await db
      .from("matches")
      .update({
        home_score: data.homeScore,
        away_score: data.awayScore,
        status: data.completed ? "completed" : "upcoming",
      })
      .eq("id", data.matchId);
    if (error) throw new Error(error.message);

    await db.from("match_stats").delete().eq("match_id", data.matchId);
    const rows = data.stats
      .filter((s) => s.goals > 0 || s.assists > 0)
      .map((s) => ({
        match_id: data.matchId,
        player_id: s.player_id,
        goals: s.goals,
        assists: s.assists,
      }));
    if (rows.length) {
      const { error: statErr } = await db.from("match_stats").insert(rows);
      if (statErr) throw new Error(statErr.message);
    }
    return { ok: true as const };
  });

export const deleteMatch = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { error } = await db.from("matches").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const generateRegularSeason = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
  const db = await admin();
  const { players } = await loadLeague();
  if (players.length < 2) throw new Error("צריך לפחות שני שחקנים");
  await db.from("matches").delete().eq("phase", "regular");
  const fixtures = roundRobin(players.map((p) => p.id)).map((f) => ({
    home_player_id: f.home,
    away_player_id: f.away,
    round_number: f.round,
    phase: "regular",
    status: "upcoming",
  }));
  const { error } = await db.from("matches").insert(fixtures);
  if (error) throw new Error(error.message);
  return { ok: true as const, created: fixtures.length };
});

export const generatePlayoffs = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
  const db = await admin();
  const { players, matches } = await loadLeague();
  if (players.length < 4) throw new Error("צריך לפחות ארבעה שחקנים");
  const standings = computeStandings(players, matches, "regular");
  const ranked = standings.map((s) => s.player_id);
  const half = Math.ceil(ranked.length / 2);
  const upper = ranked.slice(0, half);
  const lower = ranked.slice(half);

  await db.from("matches").delete().in("phase", ["upper", "lower"]);
  const rows = [
    ...roundRobin(upper).map((f) => ({ ...f, phase: "upper" })),
    ...roundRobin(lower).map((f) => ({ ...f, phase: "lower" })),
  ].map((f) => ({
    home_player_id: f.home,
    away_player_id: f.away,
    round_number: f.round,
    phase: f.phase,
    status: "upcoming",
  }));
  if (rows.length) {
    const { error } = await db.from("matches").insert(rows);
    if (error) throw new Error(error.message);
  }
  return { ok: true as const, created: rows.length };
});
