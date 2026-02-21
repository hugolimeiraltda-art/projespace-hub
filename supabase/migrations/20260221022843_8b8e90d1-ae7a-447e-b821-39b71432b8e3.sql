
-- Table to store admin feedback on AI-generated proposals
CREATE TABLE public.orcamento_proposta_feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sessao_id UUID NOT NULL REFERENCES public.orcamento_sessoes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  nota_precisao INTEGER CHECK (nota_precisao >= 1 AND nota_precisao <= 5),
  acertos TEXT,
  erros TEXT,
  sugestoes TEXT,
  proposta_adequada TEXT NOT NULL, -- 'sim', 'parcialmente', 'nao'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orcamento_proposta_feedbacks ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin can manage proposta feedbacks"
  ON public.orcamento_proposta_feedbacks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Other authorized roles can view
CREATE POLICY "Authorized roles can view proposta feedbacks"
  ON public.orcamento_proposta_feedbacks
  FOR SELECT
  USING (
    has_role(auth.uid(), 'implantacao'::app_role) OR
    has_role(auth.uid(), 'supervisor_operacoes'::app_role)
  );

-- Trigger for updated_at
CREATE TRIGGER update_orcamento_proposta_feedbacks_updated_at
  BEFORE UPDATE ON public.orcamento_proposta_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
