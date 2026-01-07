-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_summary;

CREATE VIEW public.profiles_summary 
WITH (security_invoker = true) AS
SELECT 
  id,
  nome,
  foto,
  filial,
  filiais
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_summary TO authenticated;