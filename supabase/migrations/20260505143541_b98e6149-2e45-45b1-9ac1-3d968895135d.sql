ALTER TABLE public.implantacao_etapas
ADD COLUMN IF NOT EXISTS ppe_confirmar_endereco boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ppe_confirmar_endereco_at timestamptz;