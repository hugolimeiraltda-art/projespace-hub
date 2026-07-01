DROP POLICY IF EXISTS "Insert totens" ON public.implantacao_totens;
DROP POLICY IF EXISTS "Update totens" ON public.implantacao_totens;
DROP POLICY IF EXISTS "Delete totens" ON public.implantacao_totens;
DROP POLICY IF EXISTS "View totens" ON public.implantacao_totens;

CREATE POLICY "View totens" ON public.implantacao_totens FOR SELECT
USING (
  (project_id IS NOT NULL AND can_view_project(project_id))
  OR (customer_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM customer_portfolio c WHERE c.id = implantacao_totens.customer_id)
    OR EXISTS (SELECT 1 FROM ppe_customers p WHERE p.id = implantacao_totens.customer_id)
  ))
);

CREATE POLICY "Insert totens" ON public.implantacao_totens FOR INSERT
WITH CHECK (
  (project_id IS NOT NULL AND can_view_project(project_id))
  OR (customer_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM customer_portfolio c WHERE c.id = implantacao_totens.customer_id)
    OR EXISTS (SELECT 1 FROM ppe_customers p WHERE p.id = implantacao_totens.customer_id)
  ))
);

CREATE POLICY "Update totens" ON public.implantacao_totens FOR UPDATE
USING (
  (project_id IS NOT NULL AND can_view_project(project_id))
  OR (customer_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM customer_portfolio c WHERE c.id = implantacao_totens.customer_id)
    OR EXISTS (SELECT 1 FROM ppe_customers p WHERE p.id = implantacao_totens.customer_id)
  ))
)
WITH CHECK (
  (project_id IS NOT NULL AND can_view_project(project_id))
  OR (customer_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM customer_portfolio c WHERE c.id = implantacao_totens.customer_id)
    OR EXISTS (SELECT 1 FROM ppe_customers p WHERE p.id = implantacao_totens.customer_id)
  ))
);

CREATE POLICY "Delete totens" ON public.implantacao_totens FOR DELETE
USING (
  (project_id IS NOT NULL AND can_view_project(project_id))
  OR (customer_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM customer_portfolio c WHERE c.id = implantacao_totens.customer_id)
    OR EXISTS (SELECT 1 FROM ppe_customers p WHERE p.id = implantacao_totens.customer_id)
  ))
);