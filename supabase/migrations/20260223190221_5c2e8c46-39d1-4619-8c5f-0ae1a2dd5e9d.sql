
-- Allow gerente_comercial to manage orcamento tables
CREATE POLICY "Gerente comercial can manage orcamento_sessoes"
  ON public.orcamento_sessoes FOR ALL
  USING (has_role(auth.uid(), 'gerente_comercial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gerente_comercial'::app_role));

CREATE POLICY "Gerente comercial can manage orcamento_mensagens"
  ON public.orcamento_mensagens FOR ALL
  USING (has_role(auth.uid(), 'gerente_comercial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gerente_comercial'::app_role));

CREATE POLICY "Gerente comercial can manage orcamento_midias"
  ON public.orcamento_midias FOR ALL
  USING (has_role(auth.uid(), 'gerente_comercial'::app_role))
  WITH CHECK (has_role(auth.uid(), 'gerente_comercial'::app_role));

CREATE POLICY "Gerente comercial can view proposta feedbacks"
  ON public.orcamento_proposta_feedbacks FOR SELECT
  USING (has_role(auth.uid(), 'gerente_comercial'::app_role));
