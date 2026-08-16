import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PlayerBadge } from "@/components/league/PlayerBadge";
import {
  adminLogin,
  adminLogout,
  deleteMatch,
  deletePlayer,
  generatePlayoffs,
  generateRegularSeason,
  getAdminStatus,
  getLeague,
  savePlayer,
} from "@/lib/league.functions";
import { PHASE_LABELS, type Match, type Player } from "@/lib/league-utils";
import { saveMatchResult } from "@/lib/league.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "לוח בקרה למנהל — ליגת FIFA 1v1" },
      {
        name: "description",
        content: "ניהול שחקנים, עדכון תוצאות וסטטיסטיקה, יצירת מחזורים ופלייאוף בליגת FIFA.",
      },
      { property: "og:title", content: "לוח בקרה למנהל — ליגת FIFA 1v1" },
      {
        property: "og:description",
        content: "ניהול שחקנים, תוצאות, מחזורים ופלייאוף.",
      },
    ],
  }),
  component: AdminPage,
});

const inputClass =
  "w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm outline-none transition-colors focus:border-primary";
const btnPrimary =
  "rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-50";
const btnGhost =
  "rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/70";

function AdminPage() {
  const { data: status, isLoading } = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => getAdminStatus(),
  });

  if (isLoading) {
    return <p className="p-10 text-center text-muted-foreground">טוען...</p>;
  }
  return status?.isAdmin ? <Dashboard /> : <LoginForm />;
}

function LoginForm() {
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: (v: { username: string; password: string }) => adminLogin({ data: v }),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("ברוך הבא, מנהל!");
        void qc.invalidateQueries({ queryKey: ["admin-status"] });
      } else {
        toast.error("שם משתמש או סיסמה שגויים");
      }
    },
    onError: () => toast.error("ההתחברות נכשלה"),
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        className="surface-card w-full max-w-sm space-y-4 p-7"
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate({ username, password });
        }}
      >
        <div>
          <h1 className="font-display text-3xl tracking-wide text-gradient">כניסת מנהל</h1>
          <p className="text-sm text-muted-foreground">התחבר כדי לנהל את הליגה</p>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">שם משתמש</span>
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-muted-foreground">סיסמה</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button className={`${btnPrimary} w-full`} disabled={login.isPending}>
          {login.isPending ? "מתחבר..." : "התחברות"}
        </button>
        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-primary">
          חזרה לאתר הליגה
        </Link>
      </form>
    </main>
  );
}

function Dashboard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["league"], queryFn: () => getLeague() });
  const players = data?.players ?? [];
  const matches = data?.matches ?? [];
  const stats = data?.stats ?? [];

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["league"] });
  };

  const logout = useMutation({
    mutationFn: () => adminLogout(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-status"] });
      toast.success("התנתקת בהצלחה");
    },
  });

  const genRegular = useMutation({
    mutationFn: () => generateRegularSeason(),
    onSuccess: (r) => {
      toast.success(`נוצרו ${r.created} משחקים`);
      refresh();
    },
    onError: () => toast.error("יצירת המחזורים נכשלה"),
  });

  const genPlayoffs = useMutation({
    mutationFn: () => generatePlayoffs(),
    onSuccess: (r) => {
      toast.success(`נוצרו ${r.created} משחקי פלייאוף`);
      refresh();
    },
    onError: () => toast.error("יצירת הפלייאוף נכשלה"),
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-8 px-4 pb-20 pt-8">
      <header className="surface-card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">ADMIN</p>
          <h1 className="font-display text-4xl tracking-wide text-gradient">לוח בקרה</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/" className={btnGhost}>
            צפייה באתר
          </Link>
          <button className={btnGhost} onClick={() => logout.mutate()}>
            התנתקות
          </button>
        </div>
      </header>

      <section className="surface-card space-y-4 p-6">
        <h2 className="font-display text-2xl tracking-wide">מחוללים אוטומטיים</h2>
        <div className="flex flex-wrap gap-3">
          <button
            className={btnPrimary}
            disabled={genRegular.isPending}
            onClick={() => genRegular.mutate()}
          >
            צור מחזורי ליגה (כולם נגד כולם)
          </button>
          <button
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition-transform hover:scale-[1.03] disabled:opacity-50"
            disabled={genPlayoffs.isPending}
            onClick={() => genPlayoffs.mutate()}
          >
            פיצול לפלייאוף עליון ותחתון
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          שים לב: יצירת מחזורים מחדש מוחקת את משחקי העונה הסדירה הקיימים.
        </p>
      </section>

      <PlayersSection players={players} onChanged={refresh} />
      <MatchesSection players={players} matches={matches} stats={stats} onChanged={refresh} />
    </main>
  );
}

function PlayersSection({ players, onChanged }: { players: Player[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [logo, setLogo] = useState("");

  const reset = () => {
    setEditing(null);
    setName("");
    setTeam("");
    setLogo("");
  };

  const save = useMutation({
    mutationFn: () =>
      savePlayer({
        data: {
          ...(editing ? { id: editing.id } : {}),
          name,
          team_name: team,
          logo_url: logo || null,
        },
      }),
    onSuccess: () => {
      toast.success(editing ? "השחקן עודכן" : "השחקן נוסף");
      reset();
      onChanged();
    },
    onError: () => toast.error("השמירה נכשלה"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePlayer({ data: { id } }),
    onSuccess: () => {
      toast.success("השחקן נמחק");
      onChanged();
    },
    onError: () => toast.error("המחיקה נכשלה"),
  });

  return (
    <section className="surface-card space-y-5 p-6">
      <h2 className="font-display text-2xl tracking-wide">ניהול שחקנים וקבוצות</h2>

      <form
        className="grid gap-3 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <input
          className={inputClass}
          placeholder="שם השחקן"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={inputClass}
          placeholder="שם הקבוצה"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          required
        />
        <input
          className={inputClass}
          placeholder="קישור ללוגו (אופציונלי)"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
        />
        <div className="flex gap-2">
          <button className={`${btnPrimary} flex-1`} disabled={save.isPending}>
            {editing ? "עדכן שחקן" : "הוסף שחקן"}
          </button>
          {editing && (
            <button type="button" className={btnGhost} onClick={reset}>
              ביטול
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-2 md:grid-cols-2">
        {players.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2"
          >
            <PlayerBadge player={p} />
            <div className="flex gap-2">
              <button
                className={btnGhost}
                onClick={() => {
                  setEditing(p);
                  setName(p.name);
                  setTeam(p.team_name);
                  setLogo(p.logo_url ?? "");
                }}
              >
                עריכה
              </button>
              <button
                className="rounded-xl bg-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/30"
                onClick={() => remove.mutate(p.id)}
              >
                מחיקה
              </button>
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-sm text-muted-foreground">עדיין לא נוספו שחקנים.</p>
        )}
      </div>
    </section>
  );
}

function MatchesSection({
  players,
  matches,
  stats,
  onChanged,
}: {
  players: Player[];
  matches: Match[];
  stats: { match_id: string; player_id: string; goals: number; assists: number }[];
  onChanged: () => void;
}) {
  const [phase, setPhase] = useState("regular");
  const byId = new Map(players.map((p) => [p.id, p]));
  const list = matches.filter((m) => m.phase === phase);

  const remove = useMutation({
    mutationFn: (id: string) => deleteMatch({ data: { id } }),
    onSuccess: () => {
      toast.success("המשחק נמחק");
      onChanged();
    },
  });

  return (
    <section className="surface-card space-y-5 p-6">
      <h2 className="font-display text-2xl tracking-wide">עדכון תוצאות וסטטיסטיקה</h2>

      <div className="flex flex-wrap gap-2">
        {["regular", "upper", "lower"].map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
              phase === p
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין משחקים בשלב זה.</p>
      ) : (
        <div className="space-y-3">
          {list.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              home={byId.get(m.home_player_id)}
              away={byId.get(m.away_player_id)}
              stats={stats.filter((s) => s.match_id === m.id)}
              onChanged={onChanged}
              onDelete={() => remove.mutate(m.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function MatchRow({
  match,
  home,
  away,
  stats,
  onChanged,
  onDelete,
}: {
  match: Match;
  home: Player | undefined;
  away: Player | undefined;
  stats: { player_id: string; goals: number; assists: number }[];
  onChanged: () => void;
  onDelete: () => void;
}) {
  const homeStat = stats.find((s) => s.player_id === match.home_player_id);
  const awayStat = stats.find((s) => s.player_id === match.away_player_id);
  const [hs, setHs] = useState(String(match.home_score ?? 0));
  const [as, setAs] = useState(String(match.away_score ?? 0));
  const [hg, setHg] = useState(String(homeStat?.goals ?? 0));
  const [ha, setHa] = useState(String(homeStat?.assists ?? 0));
  const [ag, setAg] = useState(String(awayStat?.goals ?? 0));
  const [aa, setAa] = useState(String(awayStat?.assists ?? 0));

  const num = (v: string) => Math.max(0, Number(v) || 0);

  const save = useMutation({
    mutationFn: (completed: boolean) =>
      saveMatchResult({
        data: {
          matchId: match.id,
          homeScore: num(hs),
          awayScore: num(as),
          completed,
          stats: [
            { player_id: match.home_player_id, goals: num(hg), assists: num(ha) },
            { player_id: match.away_player_id, goals: num(ag), assists: num(aa) },
          ],
        },
      }),
    onSuccess: () => {
      toast.success("התוצאה נשמרה והטבלה עודכנה");
      onChanged();
    },
    onError: () => toast.error("השמירה נכשלה"),
  });

  const miniInput = `${inputClass} w-16 text-center`;

  return (
    <article className="rounded-xl border border-border/60 bg-secondary/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">
          מחזור {match.round_number} · {PHASE_LABELS[match.phase]} ·{" "}
          {match.status === "completed" ? "הושלם" : "טרם שוחק"}
        </span>
        <button className={btnGhost} onClick={onDelete}>
          מחק משחק
        </button>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <PlayerBadge player={home} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>שערים בתוצאה</span>
            <input className={miniInput} value={hs} onChange={(e) => setHs(e.target.value)} />
            <span>כבש</span>
            <input className={miniInput} value={hg} onChange={(e) => setHg(e.target.value)} />
            <span>בישל</span>
            <input className={miniInput} value={ha} onChange={(e) => setHa(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <PlayerBadge player={away} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>שערים בתוצאה</span>
            <input className={miniInput} value={as} onChange={(e) => setAs(e.target.value)} />
            <span>כבש</span>
            <input className={miniInput} value={ag} onChange={(e) => setAg(e.target.value)} />
            <span>בישל</span>
            <input className={miniInput} value={aa} onChange={(e) => setAa(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={btnPrimary}
          disabled={save.isPending}
          onClick={() => save.mutate(true)}
        >
          שמור וסמן כהושלם
        </button>
        <button className={btnGhost} disabled={save.isPending} onClick={() => save.mutate(false)}>
          שמירה בלבד
        </button>
      </div>
    </article>
  );
}
