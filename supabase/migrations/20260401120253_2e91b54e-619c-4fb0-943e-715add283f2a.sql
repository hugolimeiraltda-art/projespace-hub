
ALTER TABLE public.prestadores 
  ADD COLUMN empresa text[] DEFAULT '{}',
  ADD COLUMN praca text[] DEFAULT '{}',
  ADD COLUMN produtos_homologados text[] DEFAULT '{}';
