import { computeStandings, type Match, type Player } from "@/lib/league-utils";
import { PlayerBadge } from "./PlayerBadge";

const HEADERS = [
  "מיקום",
  "שחקן",
  "קבוצה",
  "מש'",
  "נצ'",
  "תיקו",
  "הפ'",
  "שע\"ז",
  "שע\"ח",
  "הפרש",
  "נק'",
];

export function StandingsTable({
  players,
  matches,
  phase,
}: {
  players: Player[];
  matches: Match[];
  phase?: string;
}) {
  const rows = computeStandings(players, matches, phase);
  const byId = new Map(players.map((p) => [p.id, p]));

  if (!rows.length) {
    return (
      <p className="surface-card p-8 text-center text-muted-foreground">
        אין עדיין נתונים להצגה בטבלה.
      </p>
    );
  }

  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full min-w-[680px] text-right text-sm">
        <thead>
          <tr className="border-b border-border/70 text-xs uppercase text-muted-foreground">
            {HEADERS.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const player = byId.get(row.player_id);
            const accentClass =
              i === rows.length - 1
                ? "border-r-4 border-r-destructive/80"
                : i >= 3 && i <= 4
                  ? "border-r-4 border-r-primary/80"
                  : "";
            return (
              <tr
                key={row.player_id}
                className={`border-b border-border/40 transition-colors last:border-b-0 hover:bg-secondary/40 ${accentClass}`}
              >
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex size-7 items-center justify-center rounded-lg text-xs font-bold ${
                      i === 0
                        ? "bg-primary text-primary-foreground"
                        : i < 3
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <PlayerBadge player={player} compact />
                </td>
                <td className="px-3 py-3 text-muted-foreground">{player?.team_name ?? "—"}</td>
                <td className="px-3 py-3">{row.played}</td>
                <td className="px-3 py-3 text-primary">{row.wins}</td>
                <td className="px-3 py-3">{row.draws}</td>
                <td className="px-3 py-3 text-destructive">{row.losses}</td>
                <td className="px-3 py-3">{row.gf}</td>
                <td className="px-3 py-3">{row.ga}</td>
                <td className="px-3 py-3">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td className="px-3 py-3 text-base font-extrabold text-primary">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
