
CREATE TABLE public.clientes_inativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato text NOT NULL,
  razao_social text NOT NULL,
  endereco text,
  cidade text,
  filial text,
  data_entrada date,
  data_cancelamento date NOT NULL,
  motivo text NOT NULL,
  observacoes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes_inativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin, Sucesso Cliente can manage clientes_inativos"
  ON public.clientes_inativos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role));

CREATE POLICY "Implantacao can view clientes_inativos"
  ON public.clientes_inativos FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'implantacao'::app_role));
