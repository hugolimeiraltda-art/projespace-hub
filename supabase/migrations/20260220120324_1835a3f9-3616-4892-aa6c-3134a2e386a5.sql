
-- Add price columns to orcamento_kits (matching product price fields)
ALTER TABLE public.orcamento_kits 
  ADD COLUMN valor_minimo numeric DEFAULT 0,
  ADD COLUMN valor_locacao numeric DEFAULT 0,
  ADD COLUMN valor_minimo_locacao numeric DEFAULT 0,
  ADD COLUMN valor_instalacao numeric DEFAULT 0;
