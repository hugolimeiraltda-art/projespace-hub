
ALTER TABLE public.implantacao_etapas
  ADD COLUMN IF NOT EXISTS ppe_agendamento_base_data date,
  ADD COLUMN IF NOT EXISTS ppe_execucao_base_data date,
  ADD COLUMN IF NOT EXISTS ppe_equipe_prestador_id uuid REFERENCES public.prestadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ppe_observacao_onboarding text;
