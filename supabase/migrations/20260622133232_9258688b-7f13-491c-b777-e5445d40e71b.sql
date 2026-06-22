
-- Fix project_comments duplicate insert policy (unauthenticated insert)
DROP POLICY IF EXISTS "Users can add comments to projects they can see" ON public.project_comments;

-- Remove sucesso_cliente broad access to implantacao_etapas (contractor financials)
DROP POLICY IF EXISTS "Sucesso Cliente can view implantacao_etapas" ON public.implantacao_etapas;

-- Remove overly broad storage policies for manutencao-laudos (keep Staff-only policies)
DROP POLICY IF EXISTS "authenticated read manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated write manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated update manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "authenticated delete manutencao-laudos" ON storage.objects;

-- Tighten project-attachments storage: restrict INSERT/DELETE to project owner or staff
DROP POLICY IF EXISTS "Authenticated users can upload project attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project attachments" ON storage.objects;

CREATE POLICY "Project owners and staff can upload project attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-attachments' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'projetos'::public.app_role)
    OR public.has_role(auth.uid(), 'implantacao'::public.app_role)
    OR public.has_role(auth.uid(), 'administrativo'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.created_by_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Project owners and staff can delete project attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-attachments' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'projetos'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.created_by_user_id = auth.uid()
    )
  )
);
