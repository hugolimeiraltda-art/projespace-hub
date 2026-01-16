-- ===========================================
-- SECURITY FIX: Improve RLS policies for profiles table
-- ===========================================

-- Drop existing SELECT policy and create more restrictive one
DROP POLICY IF EXISTS "Users can view profiles with proper access" ON public.profiles;

CREATE POLICY "Users can view profiles with proper access"
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

-- ===========================================
-- SECURITY FIX: Improve customer_portfolio RLS with sucesso_cliente access
-- ===========================================

-- Drop and recreate SELECT policy to include sucesso_cliente
DROP POLICY IF EXISTS "Projetos, Admin and Implantacao can view customers" ON public.customer_portfolio;

CREATE POLICY "Authorized roles can view customers"
ON public.customer_portfolio
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'projetos'::app_role) OR 
  has_role(auth.uid(), 'implantacao'::app_role) OR
  has_role(auth.uid(), 'sucesso_cliente'::app_role)
);

-- ===========================================
-- SECURITY FIX: Improve storage policies for project-attachments
-- ===========================================

-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'project-attachments';

-- Drop old overly permissive policy
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;

-- Create restrictive SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view project attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-attachments');

-- Update INSERT policy to be more explicit
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;

CREATE POLICY "Authenticated users can upload project attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-attachments');

-- Update DELETE policy
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;

CREATE POLICY "Authenticated users can delete project attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-attachments');