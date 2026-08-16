import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type AdminSession = { isAdmin?: boolean; username?: string };

export function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "fifa-league-admin",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export async function getSession() {
  return useSession<AdminSession>(sessionConfig());
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.data.isAdmin) throw new Error("UNAUTHORIZED");
  return session;
}

export function safeEqual(a: string, b: string) {
  const x = createHash("sha256").update(a, "utf8").digest();
  const y = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(x, y);
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type Player = {
  id: string;
  name: string;
  team_name: string;
  logo_url: string | null;
};

export type Match = {
  id: string;
  home_player_id: string;
  away_player_id: string;
  home_score: number | null;
  away_score: number | null;
  round_number: number;
  status: string;
  phase: string;
};

export type StatRow = {
  id: string;
  match_id: string;
  player_id: string;
  goals: number;
  assists: number;
};

export async function loadLeague() {
  const db = await admin();
  const [players, matches, stats] = await Promise.all([
    db.from("players").select("id,name,team_name,logo_url").order("created_at"),
    db
      .from("matches")
      .select("id,home_player_id,away_player_id,home_score,away_score,round_number,status,phase")
      .order("round_number"),
    db.from("match_stats").select("id,match_id,player_id,goals,assists"),
  ]);
  return {
    players: (players.data ?? []) as Player[],
    matches: (matches.data ?? []) as Match[],
    stats: (stats.data ?? []) as StatRow[],
  };
}

/** Circle-method round robin over player ids. */
export function roundRobin(ids: string[]) {
  const list = [...ids];
  if (list.length % 2 === 1) list.push("__BYE__");
  const n = list.length;
  const rounds: { home: string; away: string; round: number }[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const home = list[i]!;
      const away = list[n - 1 - i]!;
      if (home === "__BYE__" || away === "__BYE__") continue;
      const flip = r % 2 === 1;
      rounds.push({ home: flip ? away : home, away: flip ? home : away, round: r + 1 });
    }
    const fixed = list[0]!;
    const rest = list.slice(1);
    rest.unshift(rest.pop()!);
    list.splice(0, list.length, fixed, ...rest);
  }
  return rounds;
}

export type StandingRow = {
  player_id: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

export function computeStandings(
  players: Player[],
  matches: Match[],
  phase?: string,
): StandingRow[] {
  const table = new Map<string, StandingRow>();
  for (const p of players) {
    table.set(p.id, {
      player_id: p.id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  }
  for (const m of matches) {
    if (m.status !== "completed" || m.home_score == null || m.away_score == null) continue;
    if (phase && m.phase !== phase) continue;
    const h = table.get(m.home_player_id);
    const a = table.get(m.away_player_id);
    if (!h || !a) continue;
    h.played++;
    a.played++;
    h.gf += m.home_score;
    h.ga += m.away_score;
    a.gf += m.away_score;
    a.ga += m.home_score;
    if (m.home_score > m.away_score) {
      h.wins++;
      h.points += 3;
      a.losses++;
    } else if (m.home_score < m.away_score) {
      a.wins++;
      a.points += 3;
      h.losses++;
    } else {
      h.draws++;
      a.draws++;
      h.points++;
      a.points++;
    }
  }
  const rows = [...table.values()];
  for (const r of rows) r.gd = r.gf - r.ga;
  rows.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);
  return rows;
}
