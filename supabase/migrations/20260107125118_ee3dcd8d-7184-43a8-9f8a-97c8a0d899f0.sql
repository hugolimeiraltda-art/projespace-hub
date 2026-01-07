-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Gerente comercial can view projects from their filiais" ON public.projects;

-- Create a simpler policy that doesn't cause recursion
-- Instead of checking the seller's filial via get_user_filial (which queries profiles),
-- we use a direct join approach or rely on the sale_forms filial
CREATE POLICY "Gerente comercial can view projects from their filiais"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'gerente_comercial'::app_role)
  AND (
    -- Check if the project's sale_form has a filial matching the gerente's filiais
    EXISTS (
      SELECT 1
      FROM sale_forms sf
      WHERE sf.project_id = projects.id
      AND sf.filial = ANY (get_user_filiais(auth.uid()))
    )
    -- OR check if the project creator is in the gerente's filiais using a direct subquery
    -- that doesn't trigger RLS recursion (using profiles directly)
    OR EXISTS (
      SELECT 1 
      FROM profiles p
      WHERE p.id = projects.created_by_user_id
      AND (
        p.filial = ANY (get_user_filiais(auth.uid()))
        OR p.filiais && get_user_filiais(auth.uid())
      )
    )
  )
);