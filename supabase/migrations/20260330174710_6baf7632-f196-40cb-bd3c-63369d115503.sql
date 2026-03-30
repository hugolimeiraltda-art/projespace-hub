
ALTER TABLE public.implantacao_etapas
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_pontuacao numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_infra numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_deslocamento numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_pedagio numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_diaria numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_conferido boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pagamento_instalacao_conferido_at timestamptz DEFAULT NULL;
