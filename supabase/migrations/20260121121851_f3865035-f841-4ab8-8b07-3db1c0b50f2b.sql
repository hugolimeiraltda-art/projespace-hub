-- Create enum for pendency types
CREATE TYPE public.pendencia_tipo AS ENUM (
  'CLIENTE_OBRA',
  'CLIENTE_AGENDA',
  'CLIENTE_LIMPEZA_VEGETACAO',
  'CLIENTE_CONTRATACAO_SERVICOS',
  'DEPT_COMPRAS',
  'DEPT_CADASTRO',
  'DEPT_ALMOXARIFADO',
  'DEPT_FATURAMENTO',
  'DEPT_CONTAS_RECEBER',
  'DEPT_FISCAL'
);

-- Create enum for pendency status
CREATE TYPE public.pendencia_status AS ENUM (
  'ABERTO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO'
);

-- Create table for maintenance pendencies
CREATE TABLE public.manutencao_pendencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_os TEXT NOT NULL,
  customer_id UUID REFERENCES public.customer_portfolio(id) ON DELETE CASCADE,
  contrato TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  numero_ticket TEXT,
  tipo public.pendencia_tipo NOT NULL,
  setor TEXT NOT NULL,
  descricao TEXT,
  status public.pendencia_status NOT NULL DEFAULT 'ABERTO',
  sla_dias INTEGER NOT NULL DEFAULT 0,
  data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_prazo TIMESTAMP WITH TIME ZONE NOT NULL,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manutencao_pendencias ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can do everything on manutencao_pendencias"
  ON public.manutencao_pendencias
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Implantacao can manage manutencao_pendencias"
  ON public.manutencao_pendencias
  FOR ALL
  USING (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Supervisor Operacoes can manage manutencao_pendencias"
  ON public.manutencao_pendencias
  FOR ALL
  USING (has_role(auth.uid(), 'supervisor_operacoes'::app_role));

CREATE POLICY "Administrativo can view manutencao_pendencias"
  ON public.manutencao_pendencias
  FOR SELECT
  USING (has_role(auth.uid(), 'administrativo'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_manutencao_pendencias_updated_at
  BEFORE UPDATE ON public.manutencao_pendencias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();