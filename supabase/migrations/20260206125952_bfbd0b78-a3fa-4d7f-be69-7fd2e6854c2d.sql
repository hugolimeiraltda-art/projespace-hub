-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Authorized roles can view customers" ON customer_portfolio;

-- Create new SELECT policy including administrativo and supervisor_operacoes
CREATE POLICY "Authorized roles can view customers" 
ON customer_portfolio 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'projetos'::app_role) OR 
  has_role(auth.uid(), 'implantacao'::app_role) OR 
  has_role(auth.uid(), 'sucesso_cliente'::app_role) OR
  has_role(auth.uid(), 'administrativo'::app_role) OR
  has_role(auth.uid(), 'supervisor_operacoes'::app_role)
);