
CREATE POLICY "Administrativo can insert manutencao_pendencias"
ON public.manutencao_pendencias
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Administrativo can update manutencao_pendencias"
ON public.manutencao_pendencias
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'administrativo'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrativo'::app_role));
