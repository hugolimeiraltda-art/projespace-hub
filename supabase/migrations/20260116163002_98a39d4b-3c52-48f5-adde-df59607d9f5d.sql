-- Criar tabela para armazenar o progresso das etapas de implantação
CREATE TABLE public.implantacao_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Etapa 1: Contrato assinado
  contrato_assinado BOOLEAN DEFAULT false,
  contrato_assinado_at TIMESTAMP WITH TIME ZONE,
  
  -- Etapa 2: Contrato cadastrado
  contrato_cadastrado BOOLEAN DEFAULT false,
  contrato_cadastrado_at TIMESTAMP WITH TIME ZONE,
  
  -- Etapa 3: Boas Vindas - On Boarding
  ligacao_boas_vindas BOOLEAN DEFAULT false,
  ligacao_boas_vindas_at TIMESTAMP WITH TIME ZONE,
  cadastro_gear BOOLEAN DEFAULT false,
  cadastro_gear_at TIMESTAMP WITH TIME ZONE,
  sindico_app BOOLEAN DEFAULT false,
  sindico_app_at TIMESTAMP WITH TIME ZONE,
  conferencia_tags BOOLEAN DEFAULT false,
  conferencia_tags_at TIMESTAMP WITH TIME ZONE,
  
  -- Etapa 4: Visita de Start-up
  check_projeto BOOLEAN DEFAULT false,
  check_projeto_at TIMESTAMP WITH TIME ZONE,
  agendamento_visita_startup BOOLEAN DEFAULT false,
  agendamento_visita_startup_at TIMESTAMP WITH TIME ZONE,
  agendamento_visita_startup_data DATE,
  laudo_visita_startup BOOLEAN DEFAULT false,
  laudo_visita_startup_at TIMESTAMP WITH TIME ZONE,
  
  -- Etapa 5: Execução da Obra
  laudo_instalador BOOLEAN DEFAULT false,
  laudo_instalador_at TIMESTAMP WITH TIME ZONE,
  laudo_vidraceiro BOOLEAN DEFAULT false,
  laudo_vidraceiro_at TIMESTAMP WITH TIME ZONE,
  laudo_serralheiro BOOLEAN DEFAULT false,
  laudo_serralheiro_at TIMESTAMP WITH TIME ZONE,
  laudo_conclusao_supervisor BOOLEAN DEFAULT false,
  laudo_conclusao_supervisor_at TIMESTAMP WITH TIME ZONE,
  
  -- Etapa 6: Programação e Ativação
  check_programacao BOOLEAN DEFAULT false,
  check_programacao_at TIMESTAMP WITH TIME ZONE,
  confirmacao_ativacao_financeira BOOLEAN DEFAULT false,
  confirmacao_ativacao_financeira_at TIMESTAMP WITH TIME ZONE,
  
  -- Etapa 7: Entrega Comercial
  agendamento_visita_comercial BOOLEAN DEFAULT false,
  agendamento_visita_comercial_at TIMESTAMP WITH TIME ZONE,
  agendamento_visita_comercial_data DATE,
  laudo_visita_comercial BOOLEAN DEFAULT false,
  laudo_visita_comercial_at TIMESTAMP WITH TIME ZONE,
  laudo_visita_comercial_texto TEXT,
  
  -- Etapa 8: Operação assistida (30 dias)
  operacao_assistida_inicio TIMESTAMP WITH TIME ZONE,
  operacao_assistida_fim TIMESTAMP WITH TIME ZONE,
  operacao_assistida_interacoes JSONB DEFAULT '[]'::jsonb,
  
  -- Etapa 9: Concluído
  concluido BOOLEAN DEFAULT false,
  concluido_at TIMESTAMP WITH TIME ZONE,
  observacoes_manutencao TEXT,
  
  -- Etapa atual (para facilitar navegação)
  etapa_atual INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(project_id)
);

-- Criar tabela para armazenar os checklists
CREATE TABLE public.implantacao_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'check_projeto', 'laudo_visita_startup', 'laudo_instalador', 'laudo_vidraceiro', 'laudo_serralheiro', 'laudo_conclusao', 'check_programacao'
  dados JSONB DEFAULT '{}'::jsonb,
  observacoes TEXT,
  fotos TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, tipo)
);

-- Enable RLS
ALTER TABLE public.implantacao_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implantacao_checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for implantacao_etapas
CREATE POLICY "Admin can do everything on implantacao_etapas" 
ON public.implantacao_etapas 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Implantacao can view and update implantacao_etapas" 
ON public.implantacao_etapas 
FOR ALL 
USING (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Administrativo can view and update implantacao_etapas" 
ON public.implantacao_etapas 
FOR ALL 
USING (has_role(auth.uid(), 'administrativo'::app_role));

-- RLS Policies for implantacao_checklists
CREATE POLICY "Admin can do everything on implantacao_checklists" 
ON public.implantacao_checklists 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Implantacao can view and update implantacao_checklists" 
ON public.implantacao_checklists 
FOR ALL 
USING (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Administrativo can view and update implantacao_checklists" 
ON public.implantacao_checklists 
FOR ALL 
USING (has_role(auth.uid(), 'administrativo'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_implantacao_etapas_updated_at
BEFORE UPDATE ON public.implantacao_etapas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_implantacao_checklists_updated_at
BEFORE UPDATE ON public.implantacao_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();