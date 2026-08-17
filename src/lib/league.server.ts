import { useSession } from "@tanstack/react-start/server";

import type { Match, Player, SquadPlayer, SquadStatRow, StatRow } from "./league-utils";

export { computeStandings, roundRobin } from "./league-utils";

export type AdminSession = { isAdmin?: boolean; username?: string };

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

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadLeague() {
  const db = await admin();
  const [players, matches, stats, squadPlayers, squadStats] = await Promise.all([
    db.from("players").select("id,name,team_name,logo_url").order("created_at"),
    db
      .from("matches")
      .select("id,home_player_id,away_player_id,home_score,away_score,round_number,status,phase")
      .order("round_number"),
    db.from("match_stats").select("id,match_id,player_id,goals,assists"),
    db.from("squad_players").select("id,team_id,name").order("created_at"),
    db.from("squad_match_stats").select("id,match_id,squad_player_id,goals,assists"),
  ]);
  return {
    players: (players.data ?? []) as Player[],
    matches: (matches.data ?? []) as Match[],
    stats: (stats.data ?? []) as StatRow[],
    squadPlayers: (squadPlayers.data ?? []) as SquadPlayer[],
    squadStats: (squadStats.data ?? []) as SquadStatRow[],
  };
}
