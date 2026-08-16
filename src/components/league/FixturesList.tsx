import { useState } from "react";

import { PHASE_LABELS, type Match, type Player } from "@/lib/league-utils";
import { PlayerBadge } from "./PlayerBadge";

export function FixturesList({ players, matches }: { players: Player[]; matches: Match[] }) {
  const [phase, setPhase] = useState<string>("all");
  const [round, setRound] = useState<string>("all");
  const byId = new Map(players.map((p) => [p.id, p]));

  const phases = ["all", "regular", "upper", "lower"];
  const filteredByPhase = matches.filter((m) => phase === "all" || m.phase === phase);
  const rounds = [...new Set(filteredByPhase.map((m) => m.round_number))].sort((a, b) => a - b);
  const visible = filteredByPhase.filter((m) => round === "all" || String(m.round_number) === round);

  const grouped = new Map<number, Match[]>();
  for (const m of visible) {
    grouped.set(m.round_number, [...(grouped.get(m.round_number) ?? []), m]);
  }

  const chip = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
      active
        ? "bg-primary text-primary-foreground glow"
        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
    }`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {phases.map((p) => (
          <button
            key={p}
            className={chip(phase === p)}
            onClick={() => {
              setPhase(p);
              setRound("all");
            }}
          >
            {p === "all" ? "הכל" : PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      {rounds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button className={chip(round === "all")} onClick={() => setRound("all")}>
            כל המחזורים
          </button>
          {rounds.map((r) => (
            <button
              key={r}
              className={chip(round === String(r))}
              onClick={() => setRound(String(r))}
            >
              מחזור {r}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="surface-card p-8 text-center text-muted-foreground">
          אין משחקים להצגה. המנהל יכול ליצור מחזורי ליגה מלוח הבקרה.
        </p>
      ) : (
        [...grouped.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([roundNumber, list]) => (
            <section key={roundNumber} className="space-y-3">
              <h3 className="font-display text-xl tracking-wide text-muted-foreground">
                מחזור {roundNumber}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((m) => (
                  <article
                    key={m.id}
                    className="surface-card flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
                  >
                    <div className="min-w-0 flex-1">
                      <PlayerBadge player={byId.get(m.home_player_id)} />
                    </div>
                    <div className="shrink-0 text-center">
                      {m.status === "completed" ? (
                        <span className="font-display text-2xl tabular-nums text-primary">
                          {m.home_score} : {m.away_score}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                          טרם שוחק
                        </span>
                      )}
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {PHASE_LABELS[m.phase]}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex justify-end">
                        <PlayerBadge player={byId.get(m.away_player_id)} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
