DROP POLICY IF EXISTS "Authorized roles can view customers" ON public.customer_portfolio;
CREATE POLICY "Authorized roles can view customers"
ON public.customer_portfolio
FOR SELECT
TO authenticated
USING (
  (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'projetos'::app_role)
      OR public.has_role(auth.uid(), 'implantacao'::app_role)
      OR public.has_role(auth.uid(), 'sucesso_cliente'::app_role)
      OR public.has_role(auth.uid(), 'administrativo'::app_role)
      OR public.has_role(auth.uid(), 'supervisor_operacoes'::app_role)
    )
    AND (
      NOT public.has_data_scope(auth.uid(), 'ppe_only')
      OR tipo_carteira = 'PPE'
    )
  )
  OR (
    public.has_data_scope(auth.uid(), 'ppe_only')
    AND tipo_carteira = 'PPE'
  )
);

DROP POLICY IF EXISTS "Projetos, Admin and Implantacao can insert customers" ON public.customer_portfolio;
CREATE POLICY "Projetos, Admin and Implantacao can insert customers"
ON public.customer_portfolio
FOR INSERT
TO authenticated
WITH CHECK (
  (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'projetos'::app_role)
      OR public.has_role(auth.uid(), 'implantacao'::app_role)
    )
    AND (
      NOT public.has_data_scope(auth.uid(), 'ppe_only')
      OR tipo_carteira = 'PPE'
    )
  )
  OR (
    public.has_data_scope(auth.uid(), 'ppe_only')
    AND tipo_carteira = 'PPE'
  )
);

DROP POLICY IF EXISTS "Projetos, Admin and Implantacao can update customers" ON public.customer_portfolio;
CREATE POLICY "Projetos, Admin and Implantacao can update customers"
ON public.customer_portfolio
FOR UPDATE
TO authenticated
USING (
  (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'projetos'::app_role)
      OR public.has_role(auth.uid(), 'implantacao'::app_role)
    )
    AND (
      NOT public.has_data_scope(auth.uid(), 'ppe_only')
      OR tipo_carteira = 'PPE'
    )
  )
  OR (
    public.has_data_scope(auth.uid(), 'ppe_only')
    AND tipo_carteira = 'PPE'
  )
)
WITH CHECK (
  (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'projetos'::app_role)
      OR public.has_role(auth.uid(), 'implantacao'::app_role)
    )
    AND (
      NOT public.has_data_scope(auth.uid(), 'ppe_only')
      OR tipo_carteira = 'PPE'
    )
  )
  OR (
    public.has_data_scope(auth.uid(), 'ppe_only')
    AND tipo_carteira = 'PPE'
  )
);

DROP POLICY IF EXISTS "Implantacao can view submitted projects" ON public.projects;
CREATE POLICY "Implantacao can view submitted projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'implantacao'::app_role)
    AND sale_status = 'CONCLUIDO'::sale_status
    AND (
      NOT public.has_data_scope(auth.uid(), 'ppe_only')
      OR tipo_implantacao = 'PPE'
    )
  )
  OR (
    public.has_data_scope(auth.uid(), 'ppe_only')
    AND sale_status = 'CONCLUIDO'::sale_status
    AND tipo_implantacao = 'PPE'
  )
);

DROP POLICY IF EXISTS "Implantacao can update implantacao status" ON public.projects;
CREATE POLICY "Implantacao can update implantacao status"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'implantacao'::app_role)
    AND sale_status = 'CONCLUIDO'::sale_status
    AND (
      NOT public.has_data_scope(auth.uid(), 'ppe_only')
      OR tipo_implantacao = 'PPE'
    )
  )
  OR (
    public.has_data_scope(auth.uid(), 'ppe_only')
    AND sale_status = 'CONCLUIDO'::sale_status
    AND tipo_implantacao = 'PPE'
  )
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'implantacao'::app_role)
    AND sale_status = 'CONCLUIDO'::sale_status
    AND (
      NOT public.has_data_scope(auth.uid(), 'ppe_only')
      OR tipo_implantacao = 'PPE'
    )
  )
  OR (
    public.has_data_scope(auth.uid(), 'ppe_only')
    AND sale_status = 'CONCLUIDO'::sale_status
    AND tipo_implantacao = 'PPE'
  )
);

DROP POLICY IF EXISTS "Implantacao can view and update implantacao_etapas" ON public.implantacao_etapas;
CREATE POLICY "Implantacao can view and update implantacao_etapas"
ON public.implantacao_etapas
FOR ALL
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'implantacao'::app_role)
    OR public.has_data_scope(auth.uid(), 'ppe_only')
  )
  AND (
    NOT public.has_data_scope(auth.uid(), 'ppe_only')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = implantacao_etapas.project_id
        AND p.tipo_implantacao = 'PPE'
    )
  )
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'implantacao'::app_role)
    OR public.has_data_scope(auth.uid(), 'ppe_only')
  )
  AND (
    NOT public.has_data_scope(auth.uid(), 'ppe_only')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = implantacao_etapas.project_id
        AND p.tipo_implantacao = 'PPE'
    )
  )
);

DROP POLICY IF EXISTS "Implantacao can view and update implantacao_checklists" ON public.implantacao_checklists;
CREATE POLICY "Implantacao can view and update implantacao_checklists"
ON public.implantacao_checklists
FOR ALL
TO authenticated
USING (
  (
    public.has_role(auth.uid(), 'implantacao'::app_role)
    OR public.has_data_scope(auth.uid(), 'ppe_only')
  )
  AND (
    NOT public.has_data_scope(auth.uid(), 'ppe_only')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = implantacao_checklists.project_id
        AND p.tipo_implantacao = 'PPE'
    )
  )
)
WITH CHECK (
  (
    public.has_role(auth.uid(), 'implantacao'::app_role)
    OR public.has_data_scope(auth.uid(), 'ppe_only')
  )
  AND (
    NOT public.has_data_scope(auth.uid(), 'ppe_only')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = implantacao_checklists.project_id
        AND p.tipo_implantacao = 'PPE'
    )
  )
);