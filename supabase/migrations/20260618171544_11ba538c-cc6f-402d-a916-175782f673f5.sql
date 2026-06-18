
-- Allow users holding the dedicated 'vendedor_plus' data scope to act as a vendedor
-- on sale_validations for projects they own. Cirurgical — does not affect other users.

CREATE POLICY "Vendedor plus scope can create sale_validations for own projects"
ON public.sale_validations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_data_scope(auth.uid(), 'vendedor_plus')
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sale_validations.project_id
      AND p.created_by_user_id = auth.uid()
  )
);

CREATE POLICY "Vendedor plus scope can view own sale_validations"
ON public.sale_validations
FOR SELECT
TO authenticated
USING (
  public.has_data_scope(auth.uid(), 'vendedor_plus')
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sale_validations.project_id
      AND p.created_by_user_id = auth.uid()
  )
);
