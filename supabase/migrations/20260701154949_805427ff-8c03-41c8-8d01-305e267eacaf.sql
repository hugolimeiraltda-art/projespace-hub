
DROP POLICY IF EXISTS "Authenticated users can upload laudos" ON storage.objects;

CREATE POLICY "Staff roles can upload laudos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'manutencao-laudos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'supervisor_operacoes')
    OR public.has_role(auth.uid(), 'implantacao')
  )
);
