
-- Tighten cs_politicas write access
DROP POLICY IF EXISTS "Authenticated users can insert cs_politicas" ON public.cs_politicas;
DROP POLICY IF EXISTS "Authenticated users can update cs_politicas" ON public.cs_politicas;
CREATE POLICY "Admin and Sucesso Cliente can write cs_politicas"
ON public.cs_politicas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sucesso_cliente'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'sucesso_cliente'::app_role));

-- Restrict manutencao_tecnicos to authorized roles for all operations
DROP POLICY IF EXISTS "Authenticated users can view tecnicos" ON public.manutencao_tecnicos;
DROP POLICY IF EXISTS "Authenticated users can insert tecnicos" ON public.manutencao_tecnicos;
DROP POLICY IF EXISTS "Authenticated users can update tecnicos" ON public.manutencao_tecnicos;
DROP POLICY IF EXISTS "Authenticated users can delete tecnicos" ON public.manutencao_tecnicos;
CREATE POLICY "Authorized roles manage tecnicos"
ON public.manutencao_tecnicos FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  OR public.has_role(auth.uid(), 'implantacao'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  OR public.has_role(auth.uid(), 'implantacao'::app_role)
);

-- Restrict prestadores to authorized roles for all operations
DROP POLICY IF EXISTS "Authenticated users can view prestadores" ON public.prestadores;
DROP POLICY IF EXISTS "Authenticated users can insert prestadores" ON public.prestadores;
DROP POLICY IF EXISTS "Authenticated users can update prestadores" ON public.prestadores;
CREATE POLICY "Authorized roles manage prestadores"
ON public.prestadores FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  OR public.has_role(auth.uid(), 'implantacao'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'administrativo'::app_role)
  OR public.has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  OR public.has_role(auth.uid(), 'implantacao'::app_role)
);

-- Restrict orcamento_midias to session owners and authorized roles
DROP POLICY IF EXISTS "Authenticated can manage orcamento_midias" ON public.orcamento_midias;
CREATE POLICY "Session owners and authorized roles manage orcamento_midias"
ON public.orcamento_midias FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gerente_comercial'::app_role)
  OR public.has_role(auth.uid(), 'projetos'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.orcamento_sessoes s
    WHERE s.id = orcamento_midias.sessao_id
      AND (s.vendedor_id = auth.uid() OR s.created_by = auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'gerente_comercial'::app_role)
  OR public.has_role(auth.uid(), 'projetos'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.orcamento_sessoes s
    WHERE s.id = orcamento_midias.sessao_id
      AND (s.vendedor_id = auth.uid() OR s.created_by = auth.uid())
  )
);
