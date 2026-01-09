-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new update policy with proper WITH CHECK clause
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);