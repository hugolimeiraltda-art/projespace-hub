CREATE TABLE public.implantacao_eap_ambientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  nome text NOT NULL DEFAULT 'Ambiente',
  tipo text,
  descricao text,
  equipamentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  fotos_antes text[] NOT NULL DEFAULT ARRAY[]::text[],
  fotos_depois text[] NOT NULL DEFAULT ARRAY[]::text[],
  concluido boolean NOT NULL DEFAULT false,
  concluido_at timestamptz,
  concluido_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_impl_eap_amb_project ON public.implantacao_eap_ambientes(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.implantacao_eap_ambientes TO authenticated;
GRANT ALL ON public.implantacao_eap_ambientes TO service_role;
ALTER TABLE public.implantacao_eap_ambientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage eap ambientes" ON public.implantacao_eap_ambientes
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER update_implantacao_eap_ambientes_updated_at
  BEFORE UPDATE ON public.implantacao_eap_ambientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();