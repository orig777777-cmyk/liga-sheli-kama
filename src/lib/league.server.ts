import { useSession } from "@tanstack/react-start/server";

import type { LineupRow, Match, NewsItem, Player, SquadPlayer, SquadStatRow, StatRow } from "./league-utils";

export { computeStandings, roundRobin } from "./league-utils";

export type AdminSession = {
  isAdmin?: boolean;
  username?: string;
  coachTeamId?: string;
  coachUsername?: string;
};

export function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "fifa-league-admin",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax" as const,
      path: "/",
    },
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

export async function requireCoach() {
  const session = await getSession();
  if (!session.data.coachTeamId) throw new Error("UNAUTHORIZED");
  return session.data.coachTeamId;
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadLeague() {
  const db = await admin();
  const [players, matches, stats, squadPlayers, squadStats, lineups, news] = await Promise.all([
    db.from("players").select("id,name,team_name,logo_url").order("created_at"),
    db
      .from("matches")
      .select("id,home_player_id,away_player_id,home_score,away_score,round_number,status,phase")
      .order("round_number"),
    db.from("match_stats").select("id,match_id,player_id,goals,assists"),
    db.from("squad_players").select("id,team_id,name").order("created_at"),
    db.from("squad_match_stats").select("id,match_id,squad_player_id,goals,assists"),
    db
      .from("match_lineups")
      .select("id,match_id,team_id,squad_player_id,role,position,is_captain,sort_order")
      .order("sort_order"),
    db.from("news").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  return {
    players: (players.data ?? []) as Player[],
    matches: (matches.data ?? []) as Match[],
    stats: (stats.data ?? []) as StatRow[],
    squadPlayers: (squadPlayers.data ?? []) as SquadPlayer[],
    squadStats: (squadStats.data ?? []) as SquadStatRow[],
    lineups: (lineups.data ?? []) as LineupRow[],
    news: (news.data ?? []) as NewsItem[],
  };
}
