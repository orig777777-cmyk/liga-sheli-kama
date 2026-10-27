import type { NewsItem } from "@/lib/league-utils";

export function NewsFeed({ news }: { news: NewsItem[] }) {
  if (!news.length)
    return (
      <p className="surface-card p-8 text-center text-muted-foreground">עדיין אין חדשות בליגה.</p>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {news.map((n) => (
        <article key={n.id} className="surface-card space-y-2 p-5">
          <p className="text-[10px] font-bold text-muted-foreground">
            {new Date(n.created_at).toLocaleDateString("he-IL")}
          </p>
          <h3 className="font-display text-xl leading-snug tracking-wide text-gradient">{n.title}</h3>
          <p className="text-sm leading-relaxed text-foreground/90">{n.body}</p>
        </article>
      ))}
    </div>
  );
}
