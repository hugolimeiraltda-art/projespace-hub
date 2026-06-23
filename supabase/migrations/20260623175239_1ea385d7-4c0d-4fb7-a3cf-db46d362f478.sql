CREATE TABLE public.implantacao_totens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  modelo TEXT NOT NULL CHECK (modelo IN ('Totem 360','Totem Parede','Totem Mini')),
  cameras INTEGER NOT NULL DEFAULT 0 CHECK (cameras >= 0),
  codigo_alarme TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.implantacao_totens TO authenticated;
GRANT ALL ON public.implantacao_totens TO service_role;

ALTER TABLE public.implantacao_totens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view totens of projects they can see"
  ON public.implantacao_totens FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

CREATE POLICY "Users can insert totens of projects they can see"
  ON public.implantacao_totens FOR INSERT TO authenticated
  WITH CHECK (public.can_view_project(project_id));

CREATE POLICY "Users can update totens of projects they can see"
  ON public.implantacao_totens FOR UPDATE TO authenticated
  USING (public.can_view_project(project_id))
  WITH CHECK (public.can_view_project(project_id));

CREATE POLICY "Users can delete totens of projects they can see"
  ON public.implantacao_totens FOR DELETE TO authenticated
  USING (public.can_view_project(project_id));

CREATE INDEX idx_implantacao_totens_project_id ON public.implantacao_totens(project_id);

CREATE TRIGGER update_implantacao_totens_updated_at
  BEFORE UPDATE ON public.implantacao_totens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();