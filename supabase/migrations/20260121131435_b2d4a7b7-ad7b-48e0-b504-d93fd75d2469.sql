-- Add RLS policy for sucesso_cliente to view manutencao_pendencias
CREATE POLICY "Sucesso Cliente can view manutencao_pendencias"
ON public.manutencao_pendencias
FOR SELECT
USING (has_role(auth.uid(), 'sucesso_cliente'::app_role));