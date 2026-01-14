-- Create table for customer portfolio (Carteira de Clientes)
CREATE TABLE public.customer_portfolio (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato text NOT NULL UNIQUE,
  alarme_codigo text,
  razao_social text NOT NULL,
  mensalidade numeric(12,2),
  leitores text,
  quantidade_leitores integer,
  filial text,
  unidades integer,
  tipo text, -- VIRTUAL, PRESENCIAL, CA MONITORADO
  data_ativacao date,
  noc text, -- SIM, NÃO, RETROFIT, FAZER, OBRA NOVA
  sistema text, -- GEAR, SIAM
  transbordo boolean DEFAULT false,
  gateway boolean DEFAULT false,
  portoes integer DEFAULT 0,
  portas integer DEFAULT 0,
  dvr_nvr integer DEFAULT 0,
  cameras integer DEFAULT 0,
  zonas_perimetro integer DEFAULT 0,
  cancelas integer DEFAULT 0,
  totem_simples integer DEFAULT 0,
  totem_duplo integer DEFAULT 0,
  catracas integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customer_portfolio ENABLE ROW LEVEL SECURITY;

-- Policy for projetos, admin, and implantacao to view all customers
CREATE POLICY "Projetos, Admin and Implantacao can view customers"
ON public.customer_portfolio
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'projetos'::app_role) OR
  has_role(auth.uid(), 'implantacao'::app_role)
);

-- Policy for projetos, admin, and implantacao to insert customers
CREATE POLICY "Projetos, Admin and Implantacao can insert customers"
ON public.customer_portfolio
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'projetos'::app_role) OR
  has_role(auth.uid(), 'implantacao'::app_role)
);

-- Policy for projetos, admin, and implantacao to update customers
CREATE POLICY "Projetos, Admin and Implantacao can update customers"
ON public.customer_portfolio
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'projetos'::app_role) OR
  has_role(auth.uid(), 'implantacao'::app_role)
);

-- Policy for admin to delete customers
CREATE POLICY "Admin can delete customers"
ON public.customer_portfolio
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_customer_portfolio_updated_at
BEFORE UPDATE ON public.customer_portfolio
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();