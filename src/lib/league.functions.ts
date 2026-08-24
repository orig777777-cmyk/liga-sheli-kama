import { createServerFn } from "@tanstack/react-start";

import {
  admin,
  computeStandings,
  getSession,
  loadLeague,
  requireAdmin,
  roundRobin,
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
    const username = data.username.trim().toLowerCase();
    const { data: valid, error } = await db.rpc("verify_admin_login", {
      _username: username,
      _password: data.password,
    });
    if (error || !valid) return { ok: false as const };
    const session = await getSession();
    await session.update({ isAdmin: true, username });
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
      squadStats?: { squad_player_id: string; goals: number; assists: number }[];
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

    await db.from("squad_match_stats").delete().eq("match_id", data.matchId);
    const squadRows = (data.squadStats ?? [])
      .filter((s) => s.goals > 0 || s.assists > 0)
      .map((s) => ({
        match_id: data.matchId,
        squad_player_id: s.squad_player_id,
        goals: s.goals,
        assists: s.assists,
      }));
    if (squadRows.length) {
      const { error: sqErr } = await db.from("squad_match_stats").insert(squadRows);
      if (sqErr) throw new Error(sqErr.message);
    }
    return { ok: true as const };
  });

export const saveSquadPlayer = createServerFn({ method: "POST" })
  .inputValidator((data: { id?: string; name: string; team_id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const payload = { name: data.name.trim(), team_id: data.team_id };
    if (data.id) {
      const { error } = await db.from("squad_players").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("squad_players").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteSquadPlayer = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { error } = await db.from("squad_players").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
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

export const createMatch = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      home_player_id: string;
      away_player_id: string;
      round_number: number;
      phase: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    if (data.home_player_id === data.away_player_id) throw new Error("צריך שתי קבוצות שונות");
    const db = await admin();
    const { error } = await db.from("matches").insert({
      home_player_id: data.home_player_id,
      away_player_id: data.away_player_id,
      round_number: data.round_number,
      phase: data.phase,
      status: "upcoming",
    });
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
