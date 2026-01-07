-- Add must_change_password column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN must_change_password boolean NOT NULL DEFAULT true;

-- Update existing users to not require password change (assuming they already changed it)
UPDATE public.profiles SET must_change_password = false;