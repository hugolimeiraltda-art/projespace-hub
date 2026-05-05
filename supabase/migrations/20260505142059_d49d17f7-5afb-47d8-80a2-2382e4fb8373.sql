ALTER TABLE public.implantacao_etapas
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_sapata numeric,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_sapata_auferido numeric,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_totem numeric,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_totem_auferido numeric;