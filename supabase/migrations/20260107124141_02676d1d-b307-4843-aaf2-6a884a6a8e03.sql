-- Create a view with only safe profile fields (no email, phone)
CREATE OR REPLACE VIEW public.profiles_summary AS
SELECT 
  id,
  nome,
  foto,
  filial,
  filiais
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_summary TO authenticated;

-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles with proper access" ON public.profiles;

-- Create a more restrictive policy for the full profiles table
-- Only users who truly need all data get access
CREATE POLICY "Users can view profiles with proper access"
ON public.profiles
FOR SELECT
USING (
  -- Users can always see their own full profile
  auth.uid() = id
  
  -- Admins can see all full profiles (for user management)
  OR has_role(auth.uid(), 'admin'::app_role)
  
  -- Gerente comercial can see full profiles from users in their filiais (for team management)
  OR (
    has_role(auth.uid(), 'gerente_comercial'::app_role)
    AND (
      filial = ANY(get_user_filiais(auth.uid()))
      OR filiais && get_user_filiais(auth.uid())
    )
  )
  -- NOTE: projetos and implantacao roles should use profiles_summary view
  -- They no longer have direct access to full profiles with email/phone
);