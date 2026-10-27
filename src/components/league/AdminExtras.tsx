import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  deleteCoach,
  deleteNews,
  generateNews,
  listCoaches,
  saveCoach,
} from "@/lib/league.functions";
import type { NewsItem, Player } from "@/lib/league-utils";

const inputClass =
  "w-full rounded-xl border border-input bg-secondary/40 px-3 py-2 text-sm outline-none transition-colors focus:border-primary";
const btnPrimary =
  "rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-50";
const btnDanger =
  "rounded-xl bg-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/30";

export function CoachesSection({ players }: { players: Player[] }) {
  const qc = useQueryClient();
  const { data: coaches = [] } = useQuery({ queryKey: ["coaches"], queryFn: () => listCoaches() });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [teamId, setTeamId] = useState("");
  const teamById = new Map(players.map((p) => [p.id, p]));

  const save = useMutation({
    mutationFn: () => saveCoach({ data: { username, password, team_id: teamId } }),
    onSuccess: () => {
      toast.success("משתמש המאמן נשמר");
      setUsername("");
      setPassword("");
      void qc.invalidateQueries({ queryKey: ["coaches"] });
    },
    onError: (e: Error) => toast.error(e.message || "השמירה נכשלה"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteCoach({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["coaches"] }),
  });

  return (
    <section className="surface-card space-y-5 p-6">
      <div>
        <h2 className="font-display text-2xl tracking-wide">משתמשי מאמנים</h2>
        <p className="text-xs text-muted-foreground">
          כל מאמן נכנס בעמוד "כניסת מאמן" ומזין לפני כל משחק הרכב של 11, עד 9 שחקני ספסל וקפטן.
        </p>
      </div>
      <form
        className="grid gap-3 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!teamId) return toast.error("יש לבחור קבוצה");
          save.mutate();
        }}
      >
        <input
          className={inputClass}
          placeholder="שם משתמש"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className={inputClass}
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <select className={inputClass} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">בחר קבוצה</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.team_name} — {p.name}
            </option>
          ))}
        </select>
        <button className={btnPrimary} disabled={save.isPending}>
          שמור מאמן
        </button>
      </form>
      <div className="grid gap-2 md:grid-cols-2">
        {coaches.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2"
          >
            <span className="text-sm">
              <b>{c.username}</b>{" "}
              <span className="text-muted-foreground">· {teamById.get(c.team_id)?.team_name}</span>
            </span>
            <button className={btnDanger} onClick={() => remove.mutate(c.id)}>
              מחיקה
            </button>
          </div>
        ))}
        {coaches.length === 0 && (
          <p className="text-sm text-muted-foreground">עדיין אין מאמנים.</p>
        )}
      </div>
    </section>
  );
}

export function NewsSection({ news, onChanged }: { news: NewsItem[]; onChanged: () => void }) {
  const gen = useMutation({
    mutationFn: () => generateNews(),
    onSuccess: (r) => {
      toast.success(`נכתבו ${r.created} ידיעות חדשות`);
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message || "כתיבת החדשות נכשלה"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteNews({ data: { id } }),
    onSuccess: onChanged,
  });
  return (
    <section className="surface-card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl tracking-wide">חדשות הליגה (AI)</h2>
        <button className={btnPrimary} disabled={gen.isPending} onClick={() => gen.mutate()}>
          {gen.isPending ? "כותב..." : "כתוב חדשות מהתוצאות האחרונות"}
        </button>
      </div>
      <ul className="space-y-2">
        {news.map((n) => (
          <li key={n.id} className="flex items-start justify-between gap-3 rounded-xl bg-secondary/40 p-3">
            <div>
              <p className="text-sm font-bold">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
            </div>
            <button className={btnDanger} onClick={() => remove.mutate(n.id)}>
              מחיקה
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
