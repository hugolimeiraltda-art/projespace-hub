-- Create a function to get user's filiais array
CREATE OR REPLACE FUNCTION public.get_user_filiais(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(filiais, ARRAY[]::text[])
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Create a function to get user's single filial
CREATE OR REPLACE FUNCTION public.get_user_filial(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT filial
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Gerente comercial can view projects from their filiais" ON public.projects;

-- Create a properly restricted policy
-- Gerente comercial can only view projects where:
-- 1. The project creator's filial is in the gerente's filiais array, OR
-- 2. The project's associated sale_form's filial is in the gerente's filiais array
CREATE POLICY "Gerente comercial can view projects from their filiais"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'gerente_comercial'::app_role)
  AND (
    -- Check if the project creator's filial is in the gerente's assigned filiais
    get_user_filial(created_by_user_id) = ANY(get_user_filiais(auth.uid()))
    OR
    -- Check if the sale_form's filial matches
    EXISTS (
      SELECT 1 FROM public.sale_forms sf
      WHERE sf.project_id = projects.id
      AND sf.filial = ANY(get_user_filiais(auth.uid()))
    )
  )
);