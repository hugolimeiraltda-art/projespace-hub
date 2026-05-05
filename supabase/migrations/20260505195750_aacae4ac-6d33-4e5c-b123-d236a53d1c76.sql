
DROP POLICY IF EXISTS "Admins and implantation can create PPE customers" ON public.ppe_customers;
DROP POLICY IF EXISTS "Admins and implantation can update PPE customers" ON public.ppe_customers;
DROP POLICY IF EXISTS "Admins and implantation can delete PPE customers" ON public.ppe_customers;

CREATE POLICY "Allowed roles can create PPE customers" ON public.ppe_customers
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'implantacao'::app_role)
    OR has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  );

CREATE POLICY "Allowed roles can update PPE customers" ON public.ppe_customers
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'implantacao'::app_role)
    OR has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'implantacao'::app_role)
    OR has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  );

CREATE POLICY "Allowed roles can delete PPE customers" ON public.ppe_customers
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'implantacao'::app_role)
    OR has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  );
