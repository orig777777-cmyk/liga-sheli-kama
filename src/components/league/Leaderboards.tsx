import { leaderboard, type Player, type StatRow } from "@/lib/league-utils";
import { PlayerBadge } from "./PlayerBadge";

function Board({
  title,
  subtitle,
  rows,
  unit,
}: {
  title: string;
  subtitle: string;
  rows: { player: Player; total: number }[];
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
              key={row.player.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2 transition-colors hover:bg-secondary/70"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`w-6 text-center text-sm font-bold ${i === 0 ? "text-gold" : "text-muted-foreground"}`}
                >
                  {i + 1}
                </span>
                <PlayerBadge player={row.player} />
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

export function Leaderboards({ players, stats }: { players: Player[]; stats: StatRow[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Board
        title="מלך השערים"
        subtitle="סך כל השערים שנרשמו בליגה"
        rows={leaderboard(players, stats, "goals")}
        unit="שערים"
      />
      <Board
        title="מלך הבישולים"
        subtitle="סך כל הבישולים שנרשמו בליגה"
        rows={leaderboard(players, stats, "assists")}
        unit="בישולים"
      />
    </div>
  );
}
