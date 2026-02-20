
CREATE POLICY "Sucesso Cliente can update comentario on manutencao_pendencias"
ON public.manutencao_pendencias
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'sucesso_cliente'::app_role))
WITH CHECK (has_role(auth.uid(), 'sucesso_cliente'::app_role));
