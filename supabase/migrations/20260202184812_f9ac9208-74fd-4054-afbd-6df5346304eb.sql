-- Add status column to customer_portfolio for implantation tracking
ALTER TABLE public.customer_portfolio 
ADD COLUMN IF NOT EXISTS status_implantacao text DEFAULT 'EM_IMPLANTACAO';

-- Add praca (regional) column to customer_portfolio
ALTER TABLE public.customer_portfolio 
ADD COLUMN IF NOT EXISTS praca text;

-- Add supervisor_responsavel to customer_portfolio
ALTER TABLE public.customer_portfolio 
ADD COLUMN IF NOT EXISTS supervisor_responsavel_id uuid REFERENCES auth.users(id);

-- Add project_id to customer_portfolio to link with projects
ALTER TABLE public.customer_portfolio 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);

-- Update manutencao_agendas_preventivas table
ALTER TABLE public.manutencao_agendas_preventivas 
ADD COLUMN IF NOT EXISTS praca text;

ALTER TABLE public.manutencao_agendas_preventivas 
ADD COLUMN IF NOT EXISTS supervisor_responsavel_id uuid REFERENCES auth.users(id);

ALTER TABLE public.manutencao_agendas_preventivas 
ADD COLUMN IF NOT EXISTS supervisor_responsavel_nome text;

ALTER TABLE public.manutencao_agendas_preventivas 
ADD COLUMN IF NOT EXISTS notificacao_enviada boolean DEFAULT false;

ALTER TABLE public.manutencao_agendas_preventivas 
ADD COLUMN IF NOT EXISTS notificacao_enviada_at timestamp with time zone;

-- Update manutencao_chamados table for preventive audit
ALTER TABLE public.manutencao_chamados 
ADD COLUMN IF NOT EXISTS praca text;

ALTER TABLE public.manutencao_chamados 
ADD COLUMN IF NOT EXISTS laudo_texto text;

ALTER TABLE public.manutencao_chamados 
ADD COLUMN IF NOT EXISTS tecnico_executor text;

ALTER TABLE public.manutencao_chamados 
ADD COLUMN IF NOT EXISTS cliente_acompanhante text;

ALTER TABLE public.manutencao_chamados 
ADD COLUMN IF NOT EXISTS is_auditoria boolean DEFAULT false;

-- Create table for pendencia comments
CREATE TABLE IF NOT EXISTS public.manutencao_pendencias_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pendencia_id uuid NOT NULL REFERENCES public.manutencao_pendencias(id) ON DELETE CASCADE,
  comentario text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on comments table
ALTER TABLE public.manutencao_pendencias_comentarios ENABLE ROW LEVEL SECURITY;

-- RLS policies for pendencia comments
CREATE POLICY "Admin can manage pendencia_comentarios"
ON public.manutencao_pendencias_comentarios
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Implantacao can manage pendencia_comentarios"
ON public.manutencao_pendencias_comentarios
FOR ALL
USING (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Supervisor Operacoes can manage pendencia_comentarios"
ON public.manutencao_pendencias_comentarios
FOR ALL
USING (has_role(auth.uid(), 'supervisor_operacoes'::app_role));

CREATE POLICY "Sucesso Cliente can view pendencia_comentarios"
ON public.manutencao_pendencias_comentarios
FOR SELECT
USING (has_role(auth.uid(), 'sucesso_cliente'::app_role));

CREATE POLICY "Administrativo can view pendencia_comentarios"
ON public.manutencao_pendencias_comentarios
FOR SELECT
USING (has_role(auth.uid(), 'administrativo'::app_role));

-- Create table for maintenance notifications
CREATE TABLE IF NOT EXISTS public.manutencao_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL, -- 'PREVENTIVA_48H', 'AUDITORIA_OBRA', etc.
  titulo text NOT NULL,
  mensagem text NOT NULL,
  agenda_id uuid REFERENCES public.manutencao_agendas_preventivas(id) ON DELETE CASCADE,
  chamado_id uuid REFERENCES public.manutencao_chamados(id) ON DELETE CASCADE,
  for_user_id uuid REFERENCES auth.users(id),
  for_role text,
  read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE public.manutencao_notificacoes ENABLE ROW LEVEL SECURITY;

-- RLS policies for maintenance notifications
CREATE POLICY "Users can view their notifications"
ON public.manutencao_notificacoes
FOR SELECT
USING (
  for_user_id = auth.uid() 
  OR (for_role IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role::text = for_role
  ))
);

CREATE POLICY "Users can update their notifications"
ON public.manutencao_notificacoes
FOR UPDATE
USING (
  for_user_id = auth.uid() 
  OR (for_role IS NOT NULL AND EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role::text = for_role
  ))
);

CREATE POLICY "Admin can manage all notifications"
ON public.manutencao_notificacoes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert notifications"
ON public.manutencao_notificacoes
FOR INSERT
WITH CHECK (true);