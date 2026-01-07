-- Criar enum para status de implantação
CREATE TYPE public.implantacao_status AS ENUM ('A_EXECUTAR', 'EM_EXECUCAO', 'CONCLUIDO_IMPLANTACAO');

-- Adicionar coluna de status de implantação na tabela projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS implantacao_status public.implantacao_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS implantacao_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS implantacao_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS implantacao_assigned_to UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Criar política para implantação ver projetos com sale_status = CONCLUIDO
CREATE POLICY "Implantacao can view submitted projects" 
ON public.projects 
FOR SELECT 
USING (
  has_role(auth.uid(), 'implantacao'::app_role) 
  AND sale_status = 'CONCLUIDO'::sale_status
);

-- Criar política para implantação atualizar status de implantação
CREATE POLICY "Implantacao can update implantacao status" 
ON public.projects 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'implantacao'::app_role) 
  AND sale_status = 'CONCLUIDO'::sale_status
);