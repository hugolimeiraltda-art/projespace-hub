
CREATE TABLE public.tecnico_certificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tecnico_id UUID NOT NULL REFERENCES public.manutencao_tecnicos(id) ON DELETE CASCADE,
  modulo INTEGER NOT NULL,
  nome_modulo TEXT NOT NULL,
  homologado BOOLEAN NOT NULL DEFAULT false,
  data_homologacao DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tecnico_id, modulo)
);

ALTER TABLE public.tecnico_certificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view certifications"
  ON public.tecnico_certificacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert certifications"
  ON public.tecnico_certificacoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update certifications"
  ON public.tecnico_certificacoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete certifications"
  ON public.tecnico_certificacoes FOR DELETE TO authenticated USING (true);
