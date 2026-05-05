ALTER TABLE public.implantacao_etapas
  ADD COLUMN IF NOT EXISTS ppe_totem_360_qtd integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ppe_totem_parede_qtd integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ppe_totem_mini_qtd integer NOT NULL DEFAULT 0;