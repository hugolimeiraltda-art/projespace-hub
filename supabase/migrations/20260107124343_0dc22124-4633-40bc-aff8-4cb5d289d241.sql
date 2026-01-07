-- Drop the current policy
DROP POLICY IF EXISTS "Users can view profiles with proper access" ON public.profiles;

-- Create a more restrictive policy that explicitly requires authentication
CREATE POLICY "Users can view profiles with proper access"
ON public.profiles
FOR SELECT
USING (
  -- MUST be authenticated - explicitly check auth.uid() is not null
  auth.uid() IS NOT NULL
  AND (
    -- Users can see their own full profile
    auth.uid() = id
    
    -- Admins can see all full profiles
    OR has_role(auth.uid(), 'admin'::app_role)
    
    -- Gerente comercial can see full profiles from users in their filiais
    OR (
      has_role(auth.uid(), 'gerente_comercial'::app_role)
      AND (
        filial = ANY(get_user_filiais(auth.uid()))
        OR filiais && get_user_filiais(auth.uid())
      )
    )
  )
);

-- Revoke all access from anon role to ensure anonymous users cannot access
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles_summary FROM anon;

-- Grant access only to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles_summary TO authenticated;