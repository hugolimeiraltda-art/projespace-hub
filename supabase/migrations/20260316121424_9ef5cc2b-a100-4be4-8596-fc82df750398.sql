CREATE POLICY "Projetos can insert notifications"
ON public.manutencao_notificacoes
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'projetos'::app_role));