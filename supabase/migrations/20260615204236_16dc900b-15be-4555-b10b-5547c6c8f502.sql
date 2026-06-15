DROP POLICY IF EXISTS "Authenticated users can insert email templates" ON public.email_templates;
DROP POLICY IF EXISTS "Authenticated users can update email templates" ON public.email_templates;
CREATE POLICY "Admins can insert email templates" ON public.email_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update email templates" ON public.email_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete email templates" ON public.email_templates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert orcamento_setor" ON public.implantacao_orcamento_setor;
DROP POLICY IF EXISTS "Authenticated users can update orcamento_setor" ON public.implantacao_orcamento_setor;
CREATE POLICY "Admin/implantacao can insert orcamento_setor" ON public.implantacao_orcamento_setor FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role));
CREATE POLICY "Admin/implantacao can update orcamento_setor" ON public.implantacao_orcamento_setor FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert certifications" ON public.tecnico_certificacoes;
DROP POLICY IF EXISTS "Authenticated users can update certifications" ON public.tecnico_certificacoes;
DROP POLICY IF EXISTS "Authenticated users can delete certifications" ON public.tecnico_certificacoes;
CREATE POLICY "Staff can insert certifications" ON public.tecnico_certificacoes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role));
CREATE POLICY "Staff can update certifications" ON public.tecnico_certificacoes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role));
CREATE POLICY "Staff can delete certifications" ON public.tecnico_certificacoes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role));

DROP POLICY IF EXISTS "Authenticated users can insert tecnico docs" ON public.manutencao_tecnico_documentos;
DROP POLICY IF EXISTS "Authenticated users can delete tecnico docs" ON public.manutencao_tecnico_documentos;
CREATE POLICY "Staff can insert tecnico docs" ON public.manutencao_tecnico_documentos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role));
CREATE POLICY "Staff can delete tecnico docs" ON public.manutencao_tecnico_documentos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'administrativo'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role));

DROP POLICY IF EXISTS "Users can add attachments to their projects" ON public.project_attachments;
DROP POLICY IF EXISTS "Users can delete their attachments" ON public.project_attachments;
CREATE POLICY "Owners/staff can add attachments" ON public.project_attachments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_attachments.project_id AND (p.created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'projetos'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role) OR (has_role(auth.uid(), 'gerente_comercial'::app_role) AND can_gerente_view_project(p.created_by_user_id)))));
CREATE POLICY "Owners/staff can delete attachments" ON public.project_attachments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_attachments.project_id AND (p.created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'projetos'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role))));

DROP POLICY IF EXISTS "Users can insert notifications for accessible projects" ON public.project_notifications;
CREATE POLICY "Staff can insert project notifications" ON public.project_notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'projetos'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role) OR has_role(auth.uid(), 'gerente_comercial'::app_role) OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_notifications.project_id AND p.created_by_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can add status history" ON public.project_status_history;
CREATE POLICY "Authorized users can add status history" ON public.project_status_history FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'projetos'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role) OR has_role(auth.uid(), 'supervisor_operacoes'::app_role) OR has_role(auth.uid(), 'gerente_comercial'::app_role) OR EXISTS (SELECT 1 FROM projects p WHERE p.id = project_status_history.project_id AND p.created_by_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update sale_forms for projects they can update" ON public.sale_forms;
CREATE POLICY "Authorized users can update sale_forms" ON public.sale_forms FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'projetos'::app_role) OR EXISTS (SELECT 1 FROM projects p WHERE p.id = sale_forms.project_id AND p.created_by_user_id = auth.uid())) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'projetos'::app_role) OR EXISTS (SELECT 1 FROM projects p WHERE p.id = sale_forms.project_id AND p.created_by_user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update tap_forms for projects they can update" ON public.tap_forms;
CREATE POLICY "Authorized users can update tap_forms" ON public.tap_forms FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'projetos'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role) OR EXISTS (SELECT 1 FROM projects p WHERE p.id = tap_forms.project_id AND p.created_by_user_id = auth.uid())) WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'projetos'::app_role) OR has_role(auth.uid(), 'implantacao'::app_role) OR EXISTS (SELECT 1 FROM projects p WHERE p.id = tap_forms.project_id AND p.created_by_user_id = auth.uid()));