
ALTER TABLE public.orcamento_produtos
ADD COLUMN updated_by uuid,
ADD COLUMN updated_by_name text,
ADD COLUMN historico_alteracoes jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.orcamento_produtos.historico_alteracoes IS 'Array of {user_name, user_id, alteracao, data}';
