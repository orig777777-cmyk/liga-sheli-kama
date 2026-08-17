import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { FixturesList } from "@/components/league/FixturesList";
import { Leaderboards } from "@/components/league/Leaderboards";
import { StandingsTable } from "@/components/league/StandingsTable";
import { getLeague } from "@/lib/league.functions";
import { PHASE_LABELS } from "@/lib/league-utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ליגת FIFA 1v1 — טבלת ליגה, מובילים ולוח משחקים" },
      {
        name: "description",
        content:
          "טבלת הליגה החיה של ליגת FIFA אחד על אחד, מלך השערים, מלך הבישולים, מחזורים ופלייאוף.",
      },
      { property: "og:title", content: "ליגת FIFA 1v1" },
      {
        property: "og:description",
        content: "טבלת ליגה חיה, טבלאות מובילים ולוח משחקים מלא של ליגת FIFA אחד על אחד.",
      },
    ],
  }),
  component: Home,
});

const TABS = [
  { id: "standings", label: "טבלת הליגה" },
  { id: "leaders", label: "טבלאות מובילים" },
  { id: "fixtures", label: "לוח משחקים ותוצאות" },
] as const;

function Home() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("standings");
  const [phase, setPhase] = useState<string>("regular");
  const { data, isLoading } = useQuery({ queryKey: ["league"], queryFn: () => getLeague() });

  const players = data?.players ?? [];
  const matches = data?.matches ?? [];
  const squadPlayers = data?.squadPlayers ?? [];
  const squadStats = data?.squadStats ?? [];
  const hasPlayoffs = matches.some((m) => m.phase !== "regular");

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-20 pt-8">
      <header className="surface-card mb-8 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">FIFA 1V1</p>
          <h1 className="font-display text-4xl leading-tight tracking-wide text-gradient md:text-5xl">
            ליגת פיפ״א אחד על אחד
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            טבלה חיה, מלכי שערים ובישולים, מחזורים ופלייאוף — הכל במקום אחד.
          </p>
        </div>
        <Link
          to="/admin"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-105 glow"
        >
          כניסת מנהל
        </Link>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
              tab === t.id
                ? "bg-primary text-primary-foreground glow"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <p className="surface-card p-10 text-center text-muted-foreground">טוען נתונים...</p>
      ) : (
        <div className="animate-in fade-in duration-300">
          {tab === "standings" && (
            <div className="space-y-4">
              {hasPlayoffs && (
                <div className="flex flex-wrap gap-2">
                  {["regular", "upper", "lower"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPhase(p)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                        phase === p
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {PHASE_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
              <StandingsTable
                players={players}
                matches={matches}
                phase={hasPlayoffs ? phase : "regular"}
              />
            </div>
          )}
          {tab === "leaders" && <Leaderboards players={players} squadPlayers={squadPlayers} squadStats={squadStats} />}
          {tab === "fixtures" && <FixturesList players={players} matches={matches} />}
        </div>
      )}
    </main>
  );
}
