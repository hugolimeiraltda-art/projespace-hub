
-- Allow supervisor_operacoes to manage (INSERT, UPDATE) implantacao_etapas
CREATE POLICY "Supervisor Operacoes can update implantacao_etapas"
ON public.implantacao_etapas
FOR UPDATE
USING (has_role(auth.uid(), 'supervisor_operacoes'::app_role))
WITH CHECK (has_role(auth.uid(), 'supervisor_operacoes'::app_role));

CREATE POLICY "Supervisor Operacoes can insert implantacao_etapas"
ON public.implantacao_etapas
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'supervisor_operacoes'::app_role));
