
-- Allow projetos role to manage orcamento_sessoes (create/view/update)
CREATE POLICY "Projetos can manage orcamento_sessoes"
  ON public.orcamento_sessoes FOR ALL
  USING (has_role(auth.uid(), 'projetos'::app_role))
  WITH CHECK (has_role(auth.uid(), 'projetos'::app_role));

-- Allow projetos role to manage orcamento_mensagens
CREATE POLICY "Projetos can manage orcamento_mensagens"
  ON public.orcamento_mensagens FOR ALL
  USING (has_role(auth.uid(), 'projetos'::app_role))
  WITH CHECK (has_role(auth.uid(), 'projetos'::app_role));

-- Allow projetos role to manage orcamento_midias
CREATE POLICY "Projetos can manage orcamento_midias"
  ON public.orcamento_midias FOR ALL
  USING (has_role(auth.uid(), 'projetos'::app_role))
  WITH CHECK (has_role(auth.uid(), 'projetos'::app_role));

-- Allow projetos to manage proposta feedbacks
CREATE POLICY "Projetos can manage proposta feedbacks"
  ON public.orcamento_proposta_feedbacks FOR ALL
  USING (has_role(auth.uid(), 'projetos'::app_role))
  WITH CHECK (has_role(auth.uid(), 'projetos'::app_role));
