
CREATE TABLE public.orcamento_regras_precificacao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campo text NOT NULL UNIQUE,
  percentual numeric NOT NULL,
  base_campo text NOT NULL DEFAULT 'preco_unitario',
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_regras_precificacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage pricing rules"
ON public.orcamento_regras_precificacao
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view pricing rules"
ON public.orcamento_regras_precificacao
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Seed default rules
INSERT INTO public.orcamento_regras_precificacao (campo, percentual, base_campo, descricao) VALUES
  ('valor_minimo', 90, 'preco_unitario', 'Valor Mínimo = 90% do Valor Atual'),
  ('valor_locacao', 3.57, 'preco_unitario', 'Valor Locação = 3,57% do Valor Atual'),
  ('valor_minimo_locacao', 90, 'valor_locacao', 'Valor Mín. Locação = 90% do Valor Locação'),
  ('valor_instalacao', 10, 'preco_unitario', 'Valor Instalação = 10% do Valor Atual');
