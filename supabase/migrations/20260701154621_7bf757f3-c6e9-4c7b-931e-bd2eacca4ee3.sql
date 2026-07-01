
-- Allow standalone totens tied directly to a customer (no implantation project yet)
ALTER TABLE public.implantacao_totens ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customer_portfolio(id) ON DELETE CASCADE;
ALTER TABLE public.implantacao_totens ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE public.implantacao_totens DROP CONSTRAINT IF EXISTS implantacao_totens_owner_check;
ALTER TABLE public.implantacao_totens ADD CONSTRAINT implantacao_totens_owner_check CHECK (project_id IS NOT NULL OR customer_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_implantacao_totens_customer_id ON public.implantacao_totens(customer_id);

-- Update policies to allow customer-owned totens (any authenticated user with portfolio visibility can manage)
DROP POLICY IF EXISTS "Users can view totens of projects they can see" ON public.implantacao_totens;
DROP POLICY IF EXISTS "Users can insert totens of projects they can see" ON public.implantacao_totens;
DROP POLICY IF EXISTS "Users can update totens of projects they can see" ON public.implantacao_totens;
DROP POLICY IF EXISTS "Users can delete totens of projects they can see" ON public.implantacao_totens;

CREATE POLICY "View totens" ON public.implantacao_totens FOR SELECT TO authenticated
USING (
  (project_id IS NOT NULL AND public.can_view_project(project_id))
  OR (customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.customer_portfolio c WHERE c.id = customer_id))
);
CREATE POLICY "Insert totens" ON public.implantacao_totens FOR INSERT TO authenticated
WITH CHECK (
  (project_id IS NOT NULL AND public.can_view_project(project_id))
  OR (customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.customer_portfolio c WHERE c.id = customer_id))
);
CREATE POLICY "Update totens" ON public.implantacao_totens FOR UPDATE TO authenticated
USING (
  (project_id IS NOT NULL AND public.can_view_project(project_id))
  OR (customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.customer_portfolio c WHERE c.id = customer_id))
)
WITH CHECK (
  (project_id IS NOT NULL AND public.can_view_project(project_id))
  OR (customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.customer_portfolio c WHERE c.id = customer_id))
);
CREATE POLICY "Delete totens" ON public.implantacao_totens FOR DELETE TO authenticated
USING (
  (project_id IS NOT NULL AND public.can_view_project(project_id))
  OR (customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.customer_portfolio c WHERE c.id = customer_id))
);
