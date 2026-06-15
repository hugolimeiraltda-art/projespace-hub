
-- Remove broad public SELECT policies for these now-private buckets
DROP POLICY IF EXISTS "Anyone can view laudos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view laudos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view prestador documentos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view prestador documentos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view prestador-documentos" ON storage.objects;

-- manutencao-laudos: any authenticated user can read/write (existing app surfaces)
DROP POLICY IF EXISTS "authenticated read manutencao-laudos" ON storage.objects;
CREATE POLICY "authenticated read manutencao-laudos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'manutencao-laudos');

DROP POLICY IF EXISTS "authenticated write manutencao-laudos" ON storage.objects;
CREATE POLICY "authenticated write manutencao-laudos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manutencao-laudos');

DROP POLICY IF EXISTS "authenticated update manutencao-laudos" ON storage.objects;
CREATE POLICY "authenticated update manutencao-laudos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'manutencao-laudos');

DROP POLICY IF EXISTS "authenticated delete manutencao-laudos" ON storage.objects;
CREATE POLICY "authenticated delete manutencao-laudos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'manutencao-laudos');

-- prestador-documentos: restrict to staff roles (PII: CPF, contracts, etc.)
DROP POLICY IF EXISTS "staff read prestador-documentos" ON storage.objects;
CREATE POLICY "staff read prestador-documentos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'prestador-documentos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'administrativo')
      OR public.has_role(auth.uid(), 'supervisor_operacoes')
      OR public.has_role(auth.uid(), 'implantacao')
    )
  );

DROP POLICY IF EXISTS "staff write prestador-documentos" ON storage.objects;
CREATE POLICY "staff write prestador-documentos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'prestador-documentos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'administrativo')
      OR public.has_role(auth.uid(), 'supervisor_operacoes')
      OR public.has_role(auth.uid(), 'implantacao')
    )
  );

DROP POLICY IF EXISTS "staff update prestador-documentos" ON storage.objects;
CREATE POLICY "staff update prestador-documentos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'prestador-documentos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'administrativo')
      OR public.has_role(auth.uid(), 'supervisor_operacoes')
      OR public.has_role(auth.uid(), 'implantacao')
    )
  );

DROP POLICY IF EXISTS "staff delete prestador-documentos" ON storage.objects;
CREATE POLICY "staff delete prestador-documentos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'prestador-documentos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'administrativo')
      OR public.has_role(auth.uid(), 'supervisor_operacoes')
      OR public.has_role(auth.uid(), 'implantacao')
    )
  );
