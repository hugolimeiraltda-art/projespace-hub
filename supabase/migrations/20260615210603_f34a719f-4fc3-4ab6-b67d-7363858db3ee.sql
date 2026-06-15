
-- 1. Helper: mirrors all SELECT rules on public.projects
CREATE OR REPLACE FUNCTION public.can_view_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'projetos')
        OR p.created_by_user_id = auth.uid()
        OR (
          public.has_role(auth.uid(), 'gerente_comercial')
          AND public.can_gerente_view_project(p.created_by_user_id)
        )
        OR (
          public.has_role(auth.uid(), 'implantacao')
          AND p.sale_status = 'CONCLUIDO'
          AND (
            NOT public.has_data_scope(auth.uid(), 'ppe_only')
            OR p.tipo_implantacao = 'PPE'
          )
        )
        OR (
          public.has_data_scope(auth.uid(), 'ppe_only')
          AND p.sale_status = 'CONCLUIDO'
          AND p.tipo_implantacao = 'PPE'
        )
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.can_view_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_project(uuid) TO authenticated;

-- 2. Storage: remove the legacy public/auth-wide policies on prestador-documentos.
--    The new staff-only policies installed earlier remain in place.
DROP POLICY IF EXISTS "Anyone can view prestador docs" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload prestador docs" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete prestador docs" ON storage.objects;

-- 3. prestador_documentos table: restrict to staff roles
DROP POLICY IF EXISTS "Authenticated users can view prestador_documentos" ON public.prestador_documentos;
DROP POLICY IF EXISTS "Authenticated users can insert prestador_documentos" ON public.prestador_documentos;
DROP POLICY IF EXISTS "Authenticated users can delete prestador_documentos" ON public.prestador_documentos;

CREATE POLICY "Staff can view prestador_documentos"
  ON public.prestador_documentos FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'administrativo')
    OR public.has_role(auth.uid(),'supervisor_operacoes')
    OR public.has_role(auth.uid(),'implantacao')
  );

CREATE POLICY "Staff can insert prestador_documentos"
  ON public.prestador_documentos FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'administrativo')
    OR public.has_role(auth.uid(),'supervisor_operacoes')
    OR public.has_role(auth.uid(),'implantacao')
  );

CREATE POLICY "Staff can delete prestador_documentos"
  ON public.prestador_documentos FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'administrativo')
    OR public.has_role(auth.uid(),'supervisor_operacoes')
    OR public.has_role(auth.uid(),'implantacao')
  );

-- 4. manutencao_tecnico_documentos: restrict SELECT to same staff roles
DROP POLICY IF EXISTS "Authenticated users can view tecnico docs" ON public.manutencao_tecnico_documentos;
CREATE POLICY "Staff can view tecnico docs"
  ON public.manutencao_tecnico_documentos FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'administrativo')
    OR public.has_role(auth.uid(),'supervisor_operacoes')
    OR public.has_role(auth.uid(),'implantacao')
  );

-- 5. sale_form_attachments: scope to project visibility + sale_forms-authorized roles
DROP POLICY IF EXISTS "Authenticated users can view sale form attachments" ON public.sale_form_attachments;
DROP POLICY IF EXISTS "Authenticated users can insert sale form attachments" ON public.sale_form_attachments;
DROP POLICY IF EXISTS "Authenticated users can delete sale form attachments" ON public.sale_form_attachments;

CREATE POLICY "Authorized users can view sale form attachments"
  ON public.sale_form_attachments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'projetos')
    OR public.can_view_project(project_id)
  );

CREATE POLICY "Authorized users can insert sale form attachments"
  ON public.sale_form_attachments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'projetos')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = sale_form_attachments.project_id
        AND p.created_by_user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can delete sale form attachments"
  ON public.sale_form_attachments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'projetos')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = sale_form_attachments.project_id
        AND p.created_by_user_id = auth.uid()
    )
  );

-- 6. Replace broad EXISTS-only SELECT policies with project-visibility-aware ones
DROP POLICY IF EXISTS "Users can view tap_forms for projects they can see" ON public.tap_forms;
CREATE POLICY "Users can view tap_forms for projects they can see"
  ON public.tap_forms FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "Users can view attachments for projects they can see" ON public.project_attachments;
CREATE POLICY "Users can view attachments for projects they can see"
  ON public.project_attachments FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "Users can view AI summaries for projects they can see" ON public.project_ai_summaries;
CREATE POLICY "Users can view AI summaries for projects they can see"
  ON public.project_ai_summaries FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "Users can view status history for projects they can see" ON public.project_status_history;
CREATE POLICY "Users can view status history for projects they can see"
  ON public.project_status_history FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "Users can view comments for projects they can see" ON public.project_comments;
CREATE POLICY "Users can view comments for projects they can see"
  ON public.project_comments FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

-- Also scope existing sale_forms SELECT to project visibility (was EXISTS-only)
DROP POLICY IF EXISTS "Users can view sale_forms for projects they can see" ON public.sale_forms;
CREATE POLICY "Users can view sale_forms for projects they can see"
  ON public.sale_forms FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'projetos')
    OR public.can_view_project(project_id)
  );
