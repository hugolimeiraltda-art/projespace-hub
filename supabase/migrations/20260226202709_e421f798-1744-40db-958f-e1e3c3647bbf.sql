
-- Chamados: administrativo can insert and update
CREATE POLICY "Administrativo can insert manutencao_chamados"
ON public.manutencao_chamados
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Administrativo can update manutencao_chamados"
ON public.manutencao_chamados
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'administrativo'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrativo'::app_role));

-- Agendas Preventivas: administrativo can insert and update
CREATE POLICY "Administrativo can insert manutencao_agendas_preventivas"
ON public.manutencao_agendas_preventivas
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Administrativo can update manutencao_agendas_preventivas"
ON public.manutencao_agendas_preventivas
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'administrativo'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrativo'::app_role));

-- Pendencias comentarios: administrativo can insert and view
CREATE POLICY "Administrativo can view pendencias_comentarios"
ON public.manutencao_pendencias_comentarios
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Administrativo can insert pendencias_comentarios"
ON public.manutencao_pendencias_comentarios
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'administrativo'::app_role));
