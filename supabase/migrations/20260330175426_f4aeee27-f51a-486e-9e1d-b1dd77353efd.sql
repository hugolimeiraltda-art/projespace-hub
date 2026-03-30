
ALTER TABLE public.implantacao_etapas
  ADD COLUMN pagamento_instalacao_pontuacao_auferido numeric DEFAULT NULL,
  ADD COLUMN pagamento_instalacao_infra_auferido numeric DEFAULT NULL,
  ADD COLUMN pagamento_instalacao_deslocamento_auferido numeric DEFAULT NULL,
  ADD COLUMN pagamento_instalacao_pedagio_auferido numeric DEFAULT NULL,
  ADD COLUMN pagamento_instalacao_diaria_auferido numeric DEFAULT NULL;
