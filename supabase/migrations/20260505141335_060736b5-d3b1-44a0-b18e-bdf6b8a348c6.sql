
ALTER TABLE public.implantacao_etapas
  ADD COLUMN IF NOT EXISTS ppe_observacao_instalacao text;
