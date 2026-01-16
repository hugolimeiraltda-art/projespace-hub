-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners as well (extra security)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;