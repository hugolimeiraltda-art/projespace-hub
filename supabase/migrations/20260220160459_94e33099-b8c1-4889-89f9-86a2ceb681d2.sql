
ALTER TABLE public.orcamento_kits
ADD COLUMN historico_alteracoes jsonb DEFAULT '[]'::jsonb;
