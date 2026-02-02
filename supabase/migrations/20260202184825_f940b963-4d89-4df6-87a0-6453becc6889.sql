-- Fix the overly permissive RLS policy for notifications insert
DROP POLICY IF EXISTS "System can insert notifications" ON public.manutencao_notificacoes;

-- Create proper insert policies
CREATE POLICY "Admin can insert notifications"
ON public.manutencao_notificacoes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Implantacao can insert notifications"
ON public.manutencao_notificacoes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Supervisor Operacoes can insert notifications"
ON public.manutencao_notificacoes
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'supervisor_operacoes'::app_role));