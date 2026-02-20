
-- Add new columns to orcamento_produtos based on spreadsheet fields
ALTER TABLE public.orcamento_produtos
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS subgrupo text,
  ADD COLUMN IF NOT EXISTS qtd_max integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_minimo numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_instalacao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_minimo_locacao numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adicional boolean DEFAULT false;
