ALTER TABLE public.orcamento_sessoes ADD COLUMN filial text;
UPDATE public.orcamento_sessoes s SET filial=p.filial FROM public.profiles p WHERE p.id=COALESCE(s.vendedor_id,s.created_by) AND s.filial IS NULL;
COMMENT ON COLUMN public.orcamento_sessoes.filial IS 'Branch used to select the company catalog; independent of the viewer profile';