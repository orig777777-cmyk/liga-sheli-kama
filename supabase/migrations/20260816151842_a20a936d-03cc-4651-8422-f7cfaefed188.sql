CREATE OR REPLACE FUNCTION public.verify_admin_login(_username text, _password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE username = lower(_username)
      AND password_hash = crypt(_password, password_hash)
  );
$$;

REVOKE ALL ON FUNCTION public.verify_admin_login(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_login(text, text) TO service_role;