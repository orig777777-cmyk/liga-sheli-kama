import type { Player } from "@/lib/league-utils";

export function PlayerBadge({
  player,
  compact,
}: {
  player: Player | undefined;
  compact?: boolean;
}) {
  if (!player) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-bold">
        {player.logo_url ? (
          <img
            src={player.logo_url}
            alt={`הלוגו של ${player.team_name || player.name}`}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          (player.name || "?").slice(0, 2)
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold leading-tight">{player.name}</span>
        {!compact && (
          <span className="block truncate text-xs text-muted-foreground">{player.team_name}</span>
        )}
      </span>
    </div>
  );
}
