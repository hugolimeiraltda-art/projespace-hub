-- Create enum for chamado types
CREATE TYPE manutencao_chamado_tipo AS ENUM ('PREVENTIVO', 'ELETIVO', 'CORRETIVO');

-- Create enum for chamado status
CREATE TYPE manutencao_chamado_status AS ENUM ('AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO', 'REAGENDADO');

-- Create enum for recurrence frequency
CREATE TYPE recorrencia_frequencia AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- Create table for maintenance chamados
CREATE TABLE public.manutencao_chamados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customer_portfolio(id) ON DELETE SET NULL,
  contrato TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  tipo manutencao_chamado_tipo NOT NULL,
  status manutencao_chamado_status NOT NULL DEFAULT 'AGENDADO',
  descricao TEXT,
  equipamentos TEXT,
  tecnico_responsavel TEXT,
  data_agendada DATE NOT NULL,
  data_previsao_conclusao DATE,
  data_inicio TIMESTAMP WITH TIME ZONE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  observacoes_conclusao TEXT,
  historico JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for recurring preventive schedules
CREATE TABLE public.manutencao_agendas_preventivas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customer_portfolio(id) ON DELETE CASCADE NOT NULL,
  contrato TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  descricao TEXT NOT NULL,
  equipamentos TEXT,
  frequencia recorrencia_frequencia NOT NULL,
  tecnico_responsavel TEXT,
  proxima_execucao DATE NOT NULL,
  ultima_execucao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.manutencao_chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao_agendas_preventivas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manutencao_chamados
CREATE POLICY "Admin can manage manutencao_chamados"
ON public.manutencao_chamados
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisor Operacoes can manage manutencao_chamados"
ON public.manutencao_chamados
FOR ALL
USING (has_role(auth.uid(), 'supervisor_operacoes'::app_role));

CREATE POLICY "Implantacao can manage manutencao_chamados"
ON public.manutencao_chamados
FOR ALL
USING (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Administrativo can view manutencao_chamados"
ON public.manutencao_chamados
FOR SELECT
USING (has_role(auth.uid(), 'administrativo'::app_role));

-- RLS Policies for manutencao_agendas_preventivas
CREATE POLICY "Admin can manage manutencao_agendas_preventivas"
ON public.manutencao_agendas_preventivas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisor Operacoes can manage manutencao_agendas_preventivas"
ON public.manutencao_agendas_preventivas
FOR ALL
USING (has_role(auth.uid(), 'supervisor_operacoes'::app_role));

CREATE POLICY "Implantacao can manage manutencao_agendas_preventivas"
ON public.manutencao_agendas_preventivas
FOR ALL
USING (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Administrativo can view manutencao_agendas_preventivas"
ON public.manutencao_agendas_preventivas
FOR SELECT
USING (has_role(auth.uid(), 'administrativo'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_manutencao_chamados_updated_at
BEFORE UPDATE ON public.manutencao_chamados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manutencao_agendas_preventivas_updated_at
BEFORE UPDATE ON public.manutencao_agendas_preventivas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();