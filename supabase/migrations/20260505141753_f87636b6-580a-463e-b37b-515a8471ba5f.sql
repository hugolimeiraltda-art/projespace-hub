ALTER TABLE public.implantacao_etapas
  ADD COLUMN IF NOT EXISTS ppe_boas_vindas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppe_boas_vindas_at timestamptz,
  ADD COLUMN IF NOT EXISTS ppe_validar_material boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ppe_validar_material_at timestamptz;