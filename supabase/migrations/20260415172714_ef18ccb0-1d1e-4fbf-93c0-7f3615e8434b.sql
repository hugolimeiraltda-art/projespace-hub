DROP POLICY "Authenticated users can view profiles with proper access" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles with proper access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'gerente_comercial'::app_role) AND ((filial = ANY (get_user_filiais(auth.uid()))) OR (filiais && get_user_filiais(auth.uid()))))
  OR has_role(auth.uid(), 'implantacao'::app_role)
  OR has_role(auth.uid(), 'sucesso_cliente'::app_role)
  OR has_role(auth.uid(), 'projetos'::app_role)
  OR has_role(auth.uid(), 'supervisor_operacoes'::app_role)
);