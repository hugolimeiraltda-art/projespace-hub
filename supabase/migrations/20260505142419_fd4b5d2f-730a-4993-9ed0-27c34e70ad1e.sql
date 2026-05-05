ALTER TABLE public.implantacao_etapas
  ADD COLUMN IF NOT EXISTS ppe_confirmar_internet boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppe_confirmar_internet_at timestamptz;