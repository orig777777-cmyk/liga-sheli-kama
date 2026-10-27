import {
  POSITIONS,
  POSITION_LABELS,
  type LineupRow,
  type Player,
  type SquadPlayer,
} from "@/lib/league-utils";

function TeamLineup({
  team,
  rows,
  squadById,
}: {
  team: Player | undefined;
  rows: LineupRow[];
  squadById: Map<string, SquadPlayer>;
}) {
  const starters = rows.filter((r) => r.role === "starter");
  const bench = rows.filter((r) => r.role === "bench");
  return (
    <div className="min-w-0 flex-1 space-y-3">
      <p className="font-display text-lg tracking-wide text-primary">
        {team?.team_name || team?.name}
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">ההרכב טרם הוזן</p>
      ) : (
        <>
          {POSITIONS.map((pos) => {
            const list = starters.filter((r) => r.position === pos);
            if (!list.length) return null;
            return (
              <div key={pos}>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  {POSITION_LABELS[pos]}
                </p>
                <ul className="space-y-0.5">
                  {list.map((r) => (
                    <li key={r.id} className="flex items-center gap-1.5 text-sm">
                      <span className="truncate">{squadById.get(r.squad_player_id)?.name}</span>
                      {r.is_captain && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-extrabold text-accent-foreground">
                          C
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {bench.length > 0 && (
            <div className="border-t border-border pt-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">ספסל</p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {bench.map((r) => (
                  <li key={r.id}>{squadById.get(r.squad_player_id)?.name}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function LineupView({
  home,
  away,
  lineups,
  squadPlayers,
}: {
  home: Player | undefined;
  away: Player | undefined;
  lineups: LineupRow[];
  squadPlayers: SquadPlayer[];
}) {
  const squadById = new Map(squadPlayers.map((s) => [s.id, s]));
  return (
    <div className="flex gap-4 border-t border-border pt-3">
      <TeamLineup team={home} rows={lineups.filter((l) => l.team_id === home?.id)} squadById={squadById} />
      <TeamLineup team={away} rows={lineups.filter((l) => l.team_id === away?.id)} squadById={squadById} />
    </div>
  );
}
