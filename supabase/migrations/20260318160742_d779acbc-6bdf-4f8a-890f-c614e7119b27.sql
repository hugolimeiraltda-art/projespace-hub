
CREATE TABLE public.implantacao_planejamento_ativacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2040),
  qtd_contratos INTEGER NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mes, ano)
);

ALTER TABLE public.implantacao_planejamento_ativacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage planejamento_ativacoes"
  ON public.implantacao_planejamento_ativacoes
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Implantacao can manage planejamento_ativacoes"
  ON public.implantacao_planejamento_ativacoes
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'implantacao'::app_role))
  WITH CHECK (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Projetos can view planejamento_ativacoes"
  ON public.implantacao_planejamento_ativacoes
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'projetos'::app_role));
