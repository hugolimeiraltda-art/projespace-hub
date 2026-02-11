
-- Allow vendedor to view implantacao_etapas for their own projects
CREATE POLICY "Vendedor can view implantacao_etapas for own projects"
ON public.implantacao_etapas
FOR SELECT
USING (
  has_role(auth.uid(), 'vendedor'::app_role)
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = implantacao_etapas.project_id
    AND p.created_by_user_id = auth.uid()
  )
);

-- Allow gerente_comercial to view implantacao_etapas for projects in their filiais
CREATE POLICY "Gerente comercial can view implantacao_etapas"
ON public.implantacao_etapas
FOR SELECT
USING (
  has_role(auth.uid(), 'gerente_comercial'::app_role)
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = implantacao_etapas.project_id
    AND can_gerente_view_project(p.created_by_user_id)
  )
);

-- Also allow supervisor_operacoes and sucesso_cliente to view implantacao_etapas (they can see implantacao on dashboard)
CREATE POLICY "Supervisor Operacoes can view implantacao_etapas"
ON public.implantacao_etapas
FOR SELECT
USING (has_role(auth.uid(), 'supervisor_operacoes'::app_role));

CREATE POLICY "Sucesso Cliente can view implantacao_etapas"
ON public.implantacao_etapas
FOR SELECT
USING (has_role(auth.uid(), 'sucesso_cliente'::app_role));
