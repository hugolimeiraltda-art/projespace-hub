DROP POLICY IF EXISTS "Authenticated users can read email templates" ON public.email_templates;
CREATE POLICY "Staff can read email templates" ON public.email_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view kit_itens" ON public.orcamento_kit_itens;
CREATE POLICY "Staff can view kit_itens" ON public.orcamento_kit_itens FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view pricing rules" ON public.orcamento_regras_precificacao;
CREATE POLICY "Staff can view pricing rules" ON public.orcamento_regras_precificacao FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view role_menu_permissions" ON public.role_menu_permissions;
CREATE POLICY "Staff can view role_menu_permissions" ON public.role_menu_permissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can view tipos" ON public.rede_equipamento_tipos;
CREATE POLICY "Staff can view tipos" ON public.rede_equipamento_tipos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated can create tipos" ON public.rede_equipamento_tipos;
CREATE POLICY "Staff can create tipos" ON public.rede_equipamento_tipos FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view orcamento midias" ON storage.objects;
CREATE POLICY "Staff can view orcamento midias" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'orcamento-midias' AND public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can upload orcamento midias" ON storage.objects;
CREATE POLICY "Staff can upload orcamento midias" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'orcamento-midias' AND public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "Authenticated users can view project attachments" ON storage.objects;
CREATE POLICY "Staff can view project attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-attachments' AND public.is_staff(auth.uid()));