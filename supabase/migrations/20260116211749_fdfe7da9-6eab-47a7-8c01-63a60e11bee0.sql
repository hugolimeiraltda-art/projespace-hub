-- Drop existing SELECT policy that may allow public access
DROP POLICY IF EXISTS "Users can view profiles with proper access" ON public.profiles;

-- Create new policy that ONLY allows authenticated users
CREATE POLICY "Authenticated users can view profiles with proper access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can always see their own profile
  auth.uid() = id
  OR 
  -- Admins can see all profiles
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Gerentes comerciais can see profiles in their filiais
  (has_role(auth.uid(), 'gerente_comercial'::app_role) AND 
   (filial = ANY (get_user_filiais(auth.uid())) OR filiais && get_user_filiais(auth.uid())))
  OR
  -- Implantação can see profiles for coordination
  has_role(auth.uid(), 'implantacao'::app_role)
  OR
  -- Sucesso cliente can see profiles for customer support
  has_role(auth.uid(), 'sucesso_cliente'::app_role)
  OR
  -- Projetos can see profiles for project management
  has_role(auth.uid(), 'projetos'::app_role)
);