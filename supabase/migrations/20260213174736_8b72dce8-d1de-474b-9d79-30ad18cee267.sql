
-- Table to store AI-generated summaries and feedback for machine learning
CREATE TABLE public.project_ai_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'projeto', -- 'projeto' (engineering) or 'implantacao'
  resumo_gerado TEXT NOT NULL,
  
  -- Engineering feedback (filled when engineer completes project)
  eng_resumo_adequado BOOLEAN,
  eng_pontos_ajuste TEXT,
  eng_nota_precisao INTEGER, -- 1-5 rating
  eng_feedback_by UUID,
  eng_feedback_by_name TEXT,
  eng_feedback_at TIMESTAMP WITH TIME ZONE,
  
  -- Implantation feedback (filled during/after implantation)
  impl_projeto_bateu_realidade BOOLEAN,
  impl_divergencias TEXT,
  impl_sugestoes_melhoria TEXT,
  impl_nota_precisao INTEGER, -- 1-5 rating
  impl_feedback_by UUID,
  impl_feedback_by_name TEXT,
  impl_feedback_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(project_id, tipo)
);

-- Enable RLS
ALTER TABLE public.project_ai_summaries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view AI summaries for projects they can see"
ON public.project_ai_summaries FOR SELECT
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_ai_summaries.project_id));

CREATE POLICY "Projetos and Admin can insert AI summaries"
ON public.project_ai_summaries FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'projetos'::app_role) OR
  has_role(auth.uid(), 'implantacao'::app_role) OR
  has_role(auth.uid(), 'vendedor'::app_role)
);

CREATE POLICY "Projetos, Admin and Implantacao can update AI summaries"
ON public.project_ai_summaries FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'projetos'::app_role) OR
  has_role(auth.uid(), 'implantacao'::app_role)
);

-- Trigger for updated_at
CREATE TRIGGER update_project_ai_summaries_updated_at
BEFORE UPDATE ON public.project_ai_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
