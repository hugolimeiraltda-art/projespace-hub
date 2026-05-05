ALTER TABLE public.implantacao_etapas
ADD COLUMN IF NOT EXISTS ppe_totem_360_cameras integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppe_totem_parede_cameras integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ppe_totem_mini_cameras integer NOT NULL DEFAULT 0;