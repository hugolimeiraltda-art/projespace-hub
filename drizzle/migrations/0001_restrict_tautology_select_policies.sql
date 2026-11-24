CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can view certifications" ON public.tecnico_certificacoes;
CREATE POLICY "Staff can view certifications" ON public.tecnico_certificacoes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view PPE customers" ON public.ppe_customers;
CREATE POLICY "Staff can view PPE customers" ON public.ppe_customers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read cs_politicas" ON public.cs_politicas;
CREATE POLICY "Staff can read cs_politicas" ON public.cs_politicas FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read configuracoes_pagamento" ON public.configuracoes_pagamento;
CREATE POLICY "Staff can read configuracoes_pagamento" ON public.configuracoes_pagamento FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view orcamento_setor" ON public.implantacao_orcamento_setor;
CREATE POLICY "Staff can view orcamento_setor" ON public.implantacao_orcamento_setor FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;
CREATE POLICY "Staff can view roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));