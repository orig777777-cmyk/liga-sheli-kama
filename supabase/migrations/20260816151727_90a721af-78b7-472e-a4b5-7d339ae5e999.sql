CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team_name text NOT NULL DEFAULT '',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.players TO anon, authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_public_read" ON public.players FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  away_player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  home_score integer,
  away_score integer,
  round_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'upcoming',
  phase text NOT NULL DEFAULT 'regular',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_public_read" ON public.matches FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.match_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  UNIQUE (match_id, player_id)
);
GRANT SELECT ON public.match_stats TO anon, authenticated;
GRANT ALL ON public.match_stats TO service_role;
ALTER TABLE public.match_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_stats_public_read" ON public.match_stats FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_users (username, password_hash)
VALUES ('admin', crypt('123456', gen_salt('bf')));