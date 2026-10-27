CREATE TABLE public.coach_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  team_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.coach_users TO service_role;
ALTER TABLE public.coach_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.match_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  squad_player_id uuid NOT NULL REFERENCES public.squad_players(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'starter',
  position text NOT NULL DEFAULT 'MID',
  is_captain boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.match_lineups TO anon, authenticated;
GRANT ALL ON public.match_lineups TO service_role;
ALTER TABLE public.match_lineups ENABLE ROW LEVEL SECURITY;
CREATE POLICY match_lineups_public_read ON public.match_lineups FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news TO anon, authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY news_public_read ON public.news FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.verify_coach_login(_username text, _password text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT team_id FROM public.coach_users
  WHERE username = _username AND password_hash = crypt(_password, password_hash) LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.verify_coach_login(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_coach_login(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_coach(_username text, _password text, _team_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions AS $$
  INSERT INTO public.coach_users (username, password_hash, team_id)
  VALUES (_username, crypt(_password, gen_salt('bf')), _team_id)
  ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, team_id = EXCLUDED.team_id
$$;
REVOKE EXECUTE ON FUNCTION public.upsert_coach(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_coach(text, text, uuid) TO service_role;