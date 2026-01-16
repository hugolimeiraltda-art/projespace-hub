-- Table for customer complaints/tickets
CREATE TABLE public.customer_chamados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_portfolio(id) ON DELETE CASCADE,
  assunto TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'aberto',
  created_by UUID,
  created_by_name TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolved_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for NPS surveys
CREATE TABLE public.customer_nps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_portfolio(id) ON DELETE CASCADE,
  nota INTEGER NOT NULL CHECK (nota >= 0 AND nota <= 10),
  comentario TEXT,
  ponto_forte TEXT,
  ponto_fraco TEXT,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for testimonials
CREATE TABLE public.customer_depoimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_portfolio(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  autor TEXT NOT NULL,
  cargo TEXT,
  tipo TEXT NOT NULL DEFAULT 'elogio',
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for satisfaction surveys
CREATE TABLE public.customer_satisfacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customer_portfolio(id) ON DELETE CASCADE,
  tempo_implantacao TEXT,
  ambiente_organizado TEXT,
  pendencias TEXT,
  comunicacao TEXT,
  facilidade_app TEXT,
  funcionalidades_sindico TEXT,
  treinamento_adequado TEXT,
  expectativa_atendida TEXT,
  nota_nps INTEGER CHECK (nota_nps >= 1 AND nota_nps <= 10),
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customer_chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_nps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_depoimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_satisfacao ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_chamados
CREATE POLICY "Admin, Sucesso Cliente can manage chamados"
ON public.customer_chamados FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role));

CREATE POLICY "Implantacao can view chamados"
ON public.customer_chamados FOR SELECT
USING (has_role(auth.uid(), 'implantacao'::app_role));

-- RLS Policies for customer_nps
CREATE POLICY "Admin, Sucesso Cliente can manage NPS"
ON public.customer_nps FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role));

CREATE POLICY "Implantacao can view NPS"
ON public.customer_nps FOR SELECT
USING (has_role(auth.uid(), 'implantacao'::app_role));

-- RLS Policies for customer_depoimentos
CREATE POLICY "Admin, Sucesso Cliente can manage depoimentos"
ON public.customer_depoimentos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role));

CREATE POLICY "Implantacao can view depoimentos"
ON public.customer_depoimentos FOR SELECT
USING (has_role(auth.uid(), 'implantacao'::app_role));

-- RLS Policies for customer_satisfacao
CREATE POLICY "Admin, Sucesso Cliente can manage satisfacao"
ON public.customer_satisfacao FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sucesso_cliente'::app_role));

CREATE POLICY "Implantacao can view satisfacao"
ON public.customer_satisfacao FOR SELECT
USING (has_role(auth.uid(), 'implantacao'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_customer_chamados_customer_id ON public.customer_chamados(customer_id);
CREATE INDEX idx_customer_chamados_status ON public.customer_chamados(status);
CREATE INDEX idx_customer_nps_customer_id ON public.customer_nps(customer_id);
CREATE INDEX idx_customer_nps_created_at ON public.customer_nps(created_at);
CREATE INDEX idx_customer_depoimentos_customer_id ON public.customer_depoimentos(customer_id);
CREATE INDEX idx_customer_satisfacao_customer_id ON public.customer_satisfacao(customer_id);
CREATE INDEX idx_customer_satisfacao_created_at ON public.customer_satisfacao(created_at);