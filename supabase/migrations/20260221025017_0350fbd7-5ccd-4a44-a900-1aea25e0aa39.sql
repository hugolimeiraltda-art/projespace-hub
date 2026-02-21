
-- Restrict vendedor_acesso_tokens: only admin/gerente can see all tokens, vendedor sees own
DROP POLICY IF EXISTS "Authenticated users can validate tokens" ON public.vendedor_acesso_tokens;

-- No need for a broad SELECT since:
-- "Admin can manage vendedor tokens" already covers admin (ALL = SELECT+INSERT+UPDATE+DELETE)
-- "Gerente can manage vendedor tokens" already covers gerente
-- "Vendedor can view own tokens" already covers vendedor viewing their own
-- So we don't need the broad policy at all
