ALTER TABLE public.sale_validations
ADD COLUMN IF NOT EXISTS proposta_fechada_url TEXT,
ADD COLUMN IF NOT EXISTS proposta_fechada_nome TEXT;