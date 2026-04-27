CREATE TABLE IF NOT EXISTS public.ppe_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legacy_customer_id UUID UNIQUE,
  contrato TEXT NOT NULL,
  alarme_codigo TEXT,
  razao_social TEXT NOT NULL,
  endereco TEXT,
  contato_nome TEXT,
  contato_telefone TEXT,
  mensalidade NUMERIC,
  taxa_ativacao NUMERIC,
  filial TEXT,
  tipo TEXT,
  data_ativacao DATE,
  data_termino DATE,
  noc TEXT,
  sistema TEXT,
  app TEXT,
  cameras INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ppe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view PPE customers"
ON public.ppe_customers
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and implantation can create PPE customers"
ON public.ppe_customers
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'implantacao')
);

CREATE POLICY "Admins and implantation can update PPE customers"
ON public.ppe_customers
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'implantacao')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'implantacao')
);

CREATE POLICY "Admins and implantation can delete PPE customers"
ON public.ppe_customers
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'implantacao')
);

CREATE INDEX IF NOT EXISTS idx_ppe_customers_contrato ON public.ppe_customers (contrato);
CREATE INDEX IF NOT EXISTS idx_ppe_customers_filial ON public.ppe_customers (filial);
CREATE INDEX IF NOT EXISTS idx_ppe_customers_tipo ON public.ppe_customers (tipo);
CREATE INDEX IF NOT EXISTS idx_ppe_customers_razao_social ON public.ppe_customers (razao_social);

CREATE TRIGGER update_ppe_customers_updated_at
BEFORE UPDATE ON public.ppe_customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ppe_customers (
  legacy_customer_id,
  contrato,
  alarme_codigo,
  razao_social,
  endereco,
  contato_nome,
  contato_telefone,
  mensalidade,
  taxa_ativacao,
  filial,
  tipo,
  data_ativacao,
  data_termino,
  noc,
  sistema,
  app,
  cameras,
  observacoes,
  created_at,
  updated_at
)
SELECT
  id,
  contrato,
  alarme_codigo,
  razao_social,
  endereco,
  contato_nome,
  contato_telefone,
  mensalidade,
  taxa_ativacao,
  filial,
  tipo,
  data_ativacao,
  data_termino,
  noc,
  sistema,
  app,
  COALESCE(cameras, 0),
  leitores,
  created_at,
  updated_at
FROM public.customer_portfolio
WHERE tipo_carteira = 'PPE'
ON CONFLICT (legacy_customer_id) DO NOTHING;