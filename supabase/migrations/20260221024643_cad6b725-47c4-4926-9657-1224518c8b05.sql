
-- Fix user_roles: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Fix vendedor_acesso_tokens: remove public SELECT, restrict to authenticated
DROP POLICY IF EXISTS "Anyone can validate tokens" ON public.vendedor_acesso_tokens;
CREATE POLICY "Authenticated users can validate tokens"
ON public.vendedor_acesso_tokens
FOR SELECT
TO authenticated
USING (true);
