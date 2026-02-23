CREATE POLICY "Vendedor can insert own sessoes"
ON public.orcamento_sessoes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (vendedor_id = auth.uid() OR created_by = auth.uid()));