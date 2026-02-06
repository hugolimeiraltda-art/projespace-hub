-- Add explicit WITH CHECK for admin INSERT on manutencao_pendencias
DROP POLICY IF EXISTS "Admin can do everything on manutencao_pendencias" ON manutencao_pendencias;

CREATE POLICY "Admin can do everything on manutencao_pendencias" 
ON manutencao_pendencias 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Same for Implantacao
DROP POLICY IF EXISTS "Implantacao can manage manutencao_pendencias" ON manutencao_pendencias;

CREATE POLICY "Implantacao can manage manutencao_pendencias" 
ON manutencao_pendencias 
FOR ALL 
USING (has_role(auth.uid(), 'implantacao'::app_role))
WITH CHECK (has_role(auth.uid(), 'implantacao'::app_role));

-- Same for Supervisor Operacoes
DROP POLICY IF EXISTS "Supervisor Operacoes can manage manutencao_pendencias" ON manutencao_pendencias;

CREATE POLICY "Supervisor Operacoes can manage manutencao_pendencias" 
ON manutencao_pendencias 
FOR ALL 
USING (has_role(auth.uid(), 'supervisor_operacoes'::app_role))
WITH CHECK (has_role(auth.uid(), 'supervisor_operacoes'::app_role));