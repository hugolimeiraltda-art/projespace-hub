-- Add new fields for step 10: Satisfaction Survey
ALTER TABLE public.implantacao_etapas 
ADD COLUMN IF NOT EXISTS pesquisa_satisfacao_realizada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pesquisa_satisfacao_realizada_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS pesquisa_satisfacao_nota integer,
ADD COLUMN IF NOT EXISTS pesquisa_satisfacao_comentario text,
ADD COLUMN IF NOT EXISTS pesquisa_satisfacao_pontos_positivos text,
ADD COLUMN IF NOT EXISTS pesquisa_satisfacao_pontos_negativos text,
ADD COLUMN IF NOT EXISTS pesquisa_satisfacao_recomendaria boolean;