
-- Drop the overly permissive update policy
DROP POLICY "Anyone can update last access" ON public.vendedor_acesso_tokens;

-- Create a more restrictive update policy - only authenticated users or via service role
CREATE POLICY "Authenticated can update last access"
ON public.vendedor_acesso_tokens
FOR UPDATE
USING (
  auth.uid() IS NOT NULL OR 
  vendedor_id = auth.uid()
);
