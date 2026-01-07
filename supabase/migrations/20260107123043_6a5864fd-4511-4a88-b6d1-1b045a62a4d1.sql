-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive policy:
-- Users can view their own profile
-- Admins can view all profiles
-- Gerente comercial can view all profiles (needed for project management)
-- Projetos role can view all profiles (needed for project workflows)
CREATE POLICY "Users can view profiles with proper access"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id  -- Users can always see their own profile
  OR has_role(auth.uid(), 'admin'::app_role)  -- Admins can see all
  OR has_role(auth.uid(), 'gerente_comercial'::app_role)  -- Managers can see all for team management
  OR has_role(auth.uid(), 'projetos'::app_role)  -- Project team can see all for workflow
  OR has_role(auth.uid(), 'implantacao'::app_role)  -- Implementation team can see all
);