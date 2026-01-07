-- Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Gerente comercial can view projects from their filiais" ON public.projects;

-- Create a simpler policy for gerente_comercial using only profiles table with SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.can_gerente_view_project(project_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = project_user_id
      AND (
        p.filial = ANY(get_user_filiais(auth.uid()))
        OR p.filiais && get_user_filiais(auth.uid())
      )
  )
$$;

-- Recreate the policy using the helper function
CREATE POLICY "Gerente comercial can view projects from their filiais"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'gerente_comercial') 
  AND can_gerente_view_project(created_by_user_id)
);

-- Also fix sale_forms policies if they have similar issues
DROP POLICY IF EXISTS "Gerente comercial can view sale forms from their filiais" ON public.sale_forms;
DROP POLICY IF EXISTS "Gerente comercial can update sale forms from their filiais" ON public.sale_forms;

-- Create simpler sale_forms policies using SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.can_gerente_view_sale_form(sf_project_id uuid, sf_filial text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sf_filial = ANY(get_user_filiais(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = sf_project_id 
      AND can_gerente_view_project(p.created_by_user_id)
    )
$$;

CREATE POLICY "Gerente comercial can view sale forms from their filiais"
ON public.sale_forms
FOR SELECT
USING (
  has_role(auth.uid(), 'gerente_comercial') 
  AND can_gerente_view_sale_form(project_id, filial)
);

CREATE POLICY "Gerente comercial can update sale forms from their filiais"
ON public.sale_forms
FOR UPDATE
USING (
  has_role(auth.uid(), 'gerente_comercial') 
  AND can_gerente_view_sale_form(project_id, filial)
);