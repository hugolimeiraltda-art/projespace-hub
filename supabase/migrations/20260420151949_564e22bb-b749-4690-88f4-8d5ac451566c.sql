-- Cria tabela de validações de venda
CREATE TABLE public.sale_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  -- Dados do vendedor submetendo
  submitted_by UUID,
  submitted_by_name TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Resposta do vendedor
  mesmo_projeto BOOLEAN NOT NULL,
  alteracoes TEXT,
  justificativa_alteracoes TEXT,
  -- Validação da engenharia
  validation_status TEXT NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, APROVADA, REPROVADA
  validated_by UUID,
  validated_by_name TEXT,
  validated_at TIMESTAMP WITH TIME ZONE,
  engenharia_observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para busca rápida por projeto
CREATE INDEX idx_sale_validations_project_id ON public.sale_validations(project_id);
CREATE INDEX idx_sale_validations_status ON public.sale_validations(validation_status);

-- Habilita RLS
ALTER TABLE public.sale_validations ENABLE ROW LEVEL SECURITY;

-- Admin pode tudo
CREATE POLICY "Admin can manage sale_validations"
ON public.sale_validations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Projetos pode ver e atualizar (para validar)
CREATE POLICY "Projetos can view sale_validations"
ON public.sale_validations
FOR SELECT
USING (has_role(auth.uid(), 'projetos'::app_role));

CREATE POLICY "Projetos can update sale_validations"
ON public.sale_validations
FOR UPDATE
USING (has_role(auth.uid(), 'projetos'::app_role))
WITH CHECK (has_role(auth.uid(), 'projetos'::app_role));

-- Implantação pode ver
CREATE POLICY "Implantacao can view sale_validations"
ON public.sale_validations
FOR SELECT
USING (has_role(auth.uid(), 'implantacao'::app_role));

-- Gerente comercial, administrativo podem ver
CREATE POLICY "Gerente comercial can view sale_validations"
ON public.sale_validations
FOR SELECT
USING (has_role(auth.uid(), 'gerente_comercial'::app_role));

CREATE POLICY "Administrativo can view sale_validations"
ON public.sale_validations
FOR SELECT
USING (has_role(auth.uid(), 'administrativo'::app_role));

-- Vendedor pode criar e ver apenas para seus próprios projetos
CREATE POLICY "Vendedor can create sale_validations for own projects"
ON public.sale_validations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'vendedor'::app_role) AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = sale_validations.project_id
    AND p.created_by_user_id = auth.uid()
  )
);

CREATE POLICY "Vendedor can view own sale_validations"
ON public.sale_validations
FOR SELECT
USING (
  has_role(auth.uid(), 'vendedor'::app_role) AND
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = sale_validations.project_id
    AND p.created_by_user_id = auth.uid()
  )
);

-- Admin, gerente comercial, administrativo, implantação podem criar (caso submetam em nome do vendedor)
CREATE POLICY "Authorized roles can create sale_validations"
ON public.sale_validations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'gerente_comercial'::app_role) OR
  has_role(auth.uid(), 'administrativo'::app_role) OR
  has_role(auth.uid(), 'implantacao'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_sale_validations_updated_at
BEFORE UPDATE ON public.sale_validations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();