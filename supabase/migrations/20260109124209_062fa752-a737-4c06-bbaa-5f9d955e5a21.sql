-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new update policy for authenticated users
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);