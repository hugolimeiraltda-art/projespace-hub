-- Drop the current policy
DROP POLICY IF EXISTS "Users can view profiles with proper access" ON public.profiles;

-- Create a more restrictive policy
CREATE POLICY "Users can view profiles with proper access"
ON public.profiles
FOR SELECT
USING (
  -- Users can always see their own profile
  auth.uid() = id
  
  -- Admins can see all profiles
  OR has_role(auth.uid(), 'admin'::app_role)
  
  -- Gerente comercial can only see profiles from users in their filiais
  OR (
    has_role(auth.uid(), 'gerente_comercial'::app_role)
    AND (
      filial = ANY(get_user_filiais(auth.uid()))
      OR filiais && get_user_filiais(auth.uid())
    )
  )
  
  -- Projetos can only see profiles of users who created projects
  OR (
    has_role(auth.uid(), 'projetos'::app_role)
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.created_by_user_id = profiles.id
    )
  )
  
  -- Implantacao can only see profiles of users who created projects with completed sales
  OR (
    has_role(auth.uid(), 'implantacao'::app_role)
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.created_by_user_id = profiles.id
      AND p.sale_status = 'CONCLUIDO'
    )
  )
);