import {
  squadLeaderboard,
  type Player,
  type SquadPlayer,
  type SquadStatRow,
} from "@/lib/league-utils";

function Board({
  title,
  subtitle,
  rows,
  unit,
}: {
  title: string;
  subtitle: string;
  rows: { squadPlayer: SquadPlayer; team: Player | undefined; total: number }[];
  unit: string;
}) {
  return (
    <section className="surface-card p-5">
      <header className="mb-4">
        <h3 className="font-display text-2xl tracking-wide text-gradient">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </header>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">אין נתונים עדיין.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row, i) => (
            <li
              key={row.squadPlayer.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2 transition-colors hover:bg-secondary/70"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`w-6 text-center text-sm font-bold ${i === 0 ? "text-gold" : "text-muted-foreground"}`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{row.squadPlayer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.team ? `${row.team.team_name} · ${row.team.name}` : "ללא קבוצה"}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-primary">
                {row.total} {unit}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function Leaderboards({
  players,
  squadPlayers,
  squadStats,
}: {
  players: Player[];
  squadPlayers: SquadPlayer[];
  squadStats: SquadStatRow[];
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Board
        title="מלך השערים"
        subtitle="שערים של שחקנים בודדים לפי הקבוצה שלהם"
        rows={squadLeaderboard(squadPlayers, players, squadStats, "goals")}
        unit="שערים"
      />
      <Board
        title="מלך הבישולים"
        subtitle="בישולים של שחקנים בודדים לפי הקבוצה שלהם"
        rows={squadLeaderboard(squadPlayers, players, squadStats, "assists")}
        unit="בישולים"
      />
    </div>
  );
}
