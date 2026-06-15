-- Fix 1: Restrict manutencao-laudos bucket access to maintenance/admin roles
DROP POLICY IF EXISTS "Authenticated users can view manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users select manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users insert manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users update manutencao-laudos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete manutencao-laudos" ON storage.objects;

CREATE POLICY "Staff can select manutencao-laudos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'manutencao-laudos' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'supervisor_operacoes')
    OR public.has_role(auth.uid(), 'implantacao')
  )
);

CREATE POLICY "Staff can insert manutencao-laudos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'manutencao-laudos' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'supervisor_operacoes')
    OR public.has_role(auth.uid(), 'implantacao')
  )
);

CREATE POLICY "Staff can update manutencao-laudos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'manutencao-laudos' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'supervisor_operacoes')
    OR public.has_role(auth.uid(), 'implantacao')
  )
);

CREATE POLICY "Staff can delete manutencao-laudos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'manutencao-laudos' AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'administrativo')
    OR public.has_role(auth.uid(), 'supervisor_operacoes')
    OR public.has_role(auth.uid(), 'implantacao')
  )
);

-- Fix 2: Restrict project_comments INSERT to users who can view the project
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.project_comments;
DROP POLICY IF EXISTS "Users can insert comments on projects" ON public.project_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.project_comments;

CREATE POLICY "Users can insert comments on viewable projects"
ON public.project_comments FOR INSERT TO authenticated
WITH CHECK (
  public.can_view_project(project_id)
  AND user_id = auth.uid()
);