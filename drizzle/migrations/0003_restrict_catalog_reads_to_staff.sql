DROP POLICY IF EXISTS "Authenticated can view active produtos" ON public.orcamento_produtos;
CREATE POLICY "Staff can view active produtos" ON public.orcamento_produtos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND ativo = true);
DROP POLICY IF EXISTS "Authenticated can view active kits" ON public.orcamento_kits;
CREATE POLICY "Staff can view active kits" ON public.orcamento_kits FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) AND ativo = true);