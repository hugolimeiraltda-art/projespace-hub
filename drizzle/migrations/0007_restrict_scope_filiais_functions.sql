CREATE OR REPLACE FUNCTION public.get_user_filiais(_user_id uuid)
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(filiais, ARRAY[]::text[])
  FROM public.profiles
  WHERE id = _user_id
    AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
$$;

CREATE OR REPLACE FUNCTION public.has_data_scope(_user_id uuid, _scope_key text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_data_scopes
    WHERE user_id = _user_id AND scope_key = _scope_key
      AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_filiais(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_data_scope(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_filiais(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_data_scope(uuid, text) TO authenticated, service_role;