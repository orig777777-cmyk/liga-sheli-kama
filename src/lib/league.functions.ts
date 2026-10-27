import { createServerFn } from "@tanstack/react-start";

import {
  admin,
  computeStandings,
  getSession,
  loadLeague,
  requireAdmin,
  requireCoach,
  roundRobin,
} from "./league.server";
import { PHASE_LABELS, validateLineup } from "./league-utils";

export const getLeague = createServerFn({ method: "GET" }).handler(async () => loadLeague());

export const getAdminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  return {
    isAdmin: Boolean(session.data.isAdmin),
    username: session.data.username ?? null,
    coachTeamId: session.data.coachTeamId ?? null,
    coachUsername: session.data.coachUsername ?? null,
  };
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
    await session.update({ ...session.data, isAdmin: true, username });
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

// ---------- Coaches ----------

export const listCoaches = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = await admin();
  const { data } = await db.from("coach_users").select("id,username,team_id").order("created_at");
  return data ?? [];
});

export const saveCoach = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string; team_id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const username = data.username.trim().toLowerCase();
    if (!username || data.password.length < 4) throw new Error("שם משתמש וסיסמה (4 תווים לפחות)");
    const db = await admin();
    const { error } = await db.rpc("upsert_coach", {
      _username: username,
      _password: data.password,
      _team_id: data.team_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteCoach = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { error } = await db.from("coach_users").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const coachLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const db = await admin();
    const username = data.username.trim().toLowerCase();
    const { data: teamId, error } = await db.rpc("verify_coach_login", {
      _username: username,
      _password: data.password,
    });
    if (error || !teamId) return { ok: false as const };
    const session = await getSession();
    await session.update({ ...session.data, coachTeamId: teamId, coachUsername: username });
    return { ok: true as const };
  });

export const coachLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getSession();
  await session.update({ ...session.data, coachTeamId: undefined, coachUsername: undefined });
  return { ok: true as const };
});

export const saveLineup = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      matchId: string;
      entries: { squad_player_id: string; role: string; position: string; is_captain: boolean }[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const teamId = await requireCoach();
    const db = await admin();
    const { data: match } = await db
      .from("matches")
      .select("id,home_player_id,away_player_id,status")
      .eq("id", data.matchId)
      .single();
    if (!match || (match.home_player_id !== teamId && match.away_player_id !== teamId))
      throw new Error("המשחק לא שייך לקבוצה שלך");
    if (match.status === "completed") throw new Error("המשחק כבר הסתיים");
    const err = validateLineup(data.entries);
    if (err) throw new Error(err);
    const { data: own } = await db.from("squad_players").select("id").eq("team_id", teamId);
    const ownIds = new Set((own ?? []).map((r) => r.id));
    if (data.entries.some((e) => !ownIds.has(e.squad_player_id)))
      throw new Error("אפשר לבחור רק שחקנים מהסגל שלך");
    await db.from("match_lineups").delete().eq("match_id", data.matchId).eq("team_id", teamId);
    const rows = data.entries.map((e, i) => ({
      match_id: data.matchId,
      team_id: teamId,
      squad_player_id: e.squad_player_id,
      role: e.role === "bench" ? "bench" : "starter",
      position: ["GK", "DEF", "MID", "ATT"].includes(e.position) ? e.position : "MID",
      is_captain: e.is_captain,
      sort_order: i,
    }));
    const { error } = await db.from("match_lineups").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- AI News ----------

export const generateNews = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
  const league = await loadLeague();
  const team = new Map(league.players.map((p) => [p.id, `${p.team_name} (${p.name})`]));
  const sq = new Map(league.squadPlayers.map((p) => [p.id, p.name]));
  const completed = league.matches.filter((m) => m.status === "completed").slice(-12);
  const facts = {
    standings: computeStandings(league.players, league.matches, "regular").map((r, i) => ({
      place: i + 1,
      team: team.get(r.player_id),
      points: r.points,
      gd: r.gd,
    })),
    recentResults: completed.map((m) => ({
      phase: PHASE_LABELS[m.phase],
      round: m.round_number,
      home: team.get(m.home_player_id),
      away: team.get(m.away_player_id),
      score: `${m.home_score}-${m.away_score}`,
      scorers: league.squadStats
        .filter((s) => s.match_id === m.id && (s.goals || s.assists))
        .map((s) => ({ player: sq.get(s.squad_player_id), goals: s.goals, assists: s.assists })),
      lineups: league.lineups
        .filter((l) => l.match_id === m.id)
        .map((l) => ({
          team: team.get(l.team_id),
          player: sq.get(l.squad_player_id),
          role: l.role === "bench" ? "ספסל" : "הרכב",
          captain: l.is_captain,
        })),
    })),
  };
  if (completed.length === 0) throw new Error("אין עדיין תוצאות לכתוב עליהן");
  const { writeNews } = await import("./news-ai.server");
  const items = await writeNews(JSON.stringify(facts));
  if (!items.length) throw new Error("לא נוצרו ידיעות");
  const db = await admin();
  const { error } = await db.from("news").insert(items);
  if (error) throw new Error(error.message);
  return { ok: true as const, created: items.length };
});

export const deleteNews = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = await admin();
    const { error } = await db.from("news").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
