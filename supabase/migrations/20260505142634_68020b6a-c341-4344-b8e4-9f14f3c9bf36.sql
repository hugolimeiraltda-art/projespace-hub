ALTER TABLE public.implantacao_etapas
  ADD COLUMN IF NOT EXISTS ppe_confirmar_ponto_eletrico boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppe_confirmar_ponto_eletrico_at timestamptz;