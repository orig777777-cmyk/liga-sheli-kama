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

export const PHASE_LABELS: Record<string, string> = {
  regular: "עונה סדירה",
  upper: "פלייאוף עליון",
  lower: "פלייאוף תחתון",
};

/** Circle-method round robin over player ids. */
export function roundRobin(ids: string[]) {
  const list = [...ids];
  if (list.length % 2 === 1) list.push("__BYE__");
  const n = list.length;
  const fixtures: { home: string; away: string; round: number }[] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const home = list[i]!;
      const away = list[n - 1 - i]!;
      if (home === "__BYE__" || away === "__BYE__") continue;
      const flip = r % 2 === 1;
      fixtures.push({ home: flip ? away : home, away: flip ? home : away, round: r + 1 });
    }
    const fixed = list[0]!;
    const rest = list.slice(1);
    rest.unshift(rest.pop()!);
    list.splice(0, list.length, fixed, ...rest);
  }
  return fixtures;
}

export function computeStandings(
  players: Player[],
  matches: Match[],
  phase?: string,
): StandingRow[] {
  const table = new Map<string, StandingRow>();
  const pool = phase
    ? players.filter((p) =>
        matches.some(
          (m) => m.phase === phase && (m.home_player_id === p.id || m.away_player_id === p.id),
        ),
      )
    : players;
  // בפלייאוף — ממשיכים מהנקודות של העונה הסדירה
  const carry =
    phase === "upper" || phase === "lower"
      ? new Map(computeStandings(players, matches, "regular").map((r) => [r.player_id, r]))
      : null;
  for (const p of pool) {
    const base = carry?.get(p.id);
    table.set(p.id, {
      player_id: p.id,
      played: base?.played ?? 0,
      wins: base?.wins ?? 0,
      draws: base?.draws ?? 0,
      losses: base?.losses ?? 0,
      gf: base?.gf ?? 0,
      ga: base?.ga ?? 0,
      gd: 0,
      points: base?.points ?? 0,
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

export function leaderboard(
  players: Player[],
  stats: StatRow[],
  key: "goals" | "assists",
): { player: Player; total: number }[] {
  const totals = new Map<string, number>();
  for (const s of stats) {
    totals.set(s.player_id, (totals.get(s.player_id) ?? 0) + s[key]);
  }
  return players
    .map((player) => ({ player, total: totals.get(player.id) ?? 0 }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

export type SquadPlayer = {
  id: string;
  team_id: string;
  name: string;
};

export type SquadStatRow = {
  id: string;
  match_id: string;
  squad_player_id: string;
  goals: number;
  assists: number;
};

export function squadLeaderboard(
  squadPlayers: SquadPlayer[],
  teams: Player[],
  stats: SquadStatRow[],
  key: "goals" | "assists",
): { squadPlayer: SquadPlayer; team: Player | undefined; total: number }[] {
  const totals = new Map<string, number>();
  for (const s of stats) {
    totals.set(s.squad_player_id, (totals.get(s.squad_player_id) ?? 0) + s[key]);
  }
  const teamById = new Map(teams.map((t) => [t.id, t]));
  return squadPlayers
    .map((squadPlayer) => ({
      squadPlayer,
      team: teamById.get(squadPlayer.team_id),
      total: totals.get(squadPlayer.id) ?? 0,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

export type LineupRow = {
  id: string;
  match_id: string;
  team_id: string;
  squad_player_id: string;
  role: string; // starter | bench
  position: string; // GK | DEF | MID | ATT
  is_captain: boolean;
  sort_order: number;
};

export type NewsItem = { id: string; title: string; body: string; created_at: string };

export const POSITIONS = ["GK", "DEF", "MID", "ATT"] as const;
export const POSITION_LABELS: Record<string, string> = {
  GK: "שוער",
  DEF: "הגנה",
  MID: "קישור",
  ATT: "התקפה",
};
export const STARTERS_COUNT = 11;
export const BENCH_MAX = 9;

/** Validates a lineup: exactly 11 starters, up to 9 bench, one GK, a captain among starters. */
export function validateLineup(
  entries: { squad_player_id: string; role: string; position: string; is_captain: boolean }[],
): string | null {
  const starters = entries.filter((e) => e.role === "starter");
  const bench = entries.filter((e) => e.role === "bench");
  if (starters.length !== STARTERS_COUNT) return `צריך בדיוק ${STARTERS_COUNT} שחקנים בהרכב`;
  if (bench.length > BENCH_MAX) return `מקסימום ${BENCH_MAX} שחקנים בספסל`;
  if (starters.filter((e) => e.position === "GK").length !== 1) return "צריך שוער אחד בדיוק בהרכב";
  const caps = entries.filter((e) => e.is_captain);
  if (caps.length !== 1 || caps[0]!.role !== "starter") return "יש לבחור קפטן אחד מתוך ההרכב";
  if (new Set(entries.map((e) => e.squad_player_id)).size !== entries.length)
    return "שחקן מופיע פעמיים";
  return null;
}
