-- Allow vendedores to see notifications targeted to them
CREATE POLICY "Vendedor can view own notifications"
ON public.manutencao_notificacoes
FOR SELECT
TO authenticated
USING (for_user_id = auth.uid() AND has_role(auth.uid(), 'vendedor'::app_role));

-- Allow vendedores to mark notifications as read
CREATE POLICY "Vendedor can update own notifications"
ON public.manutencao_notificacoes
FOR UPDATE
TO authenticated
USING (for_user_id = auth.uid() AND has_role(auth.uid(), 'vendedor'::app_role));