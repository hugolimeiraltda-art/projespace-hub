
CREATE TABLE public.customer_cancelamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer_portfolio(id) ON DELETE CASCADE,
  data_cancelamento date NOT NULL,
  data_visita_retirada date,
  valor_contrato numeric DEFAULT 0,
  motivo text NOT NULL,
  observacoes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_cancelamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin, Sucesso Cliente can manage cancelamentos"
  ON public.customer_cancelamentos FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role));

CREATE POLICY "Implantacao can view cancelamentos"
  ON public.customer_cancelamentos FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'implantacao'::app_role));
