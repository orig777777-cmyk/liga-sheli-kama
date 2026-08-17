CREATE TABLE public.squad_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.squad_players TO anon, authenticated;
GRANT ALL ON public.squad_players TO service_role;
ALTER TABLE public.squad_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY squad_players_public_read ON public.squad_players FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.squad_match_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  squad_player_id uuid NOT NULL REFERENCES public.squad_players(id) ON DELETE CASCADE,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.squad_match_stats TO anon, authenticated;
GRANT ALL ON public.squad_match_stats TO service_role;
ALTER TABLE public.squad_match_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY squad_match_stats_public_read ON public.squad_match_stats FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX squad_match_stats_match_idx ON public.squad_match_stats(match_id);