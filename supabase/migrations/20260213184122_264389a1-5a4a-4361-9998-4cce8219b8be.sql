
-- Table to store orcamento (proposal) sessions
CREATE TABLE public.orcamento_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  nome_cliente text NOT NULL,
  email_cliente text,
  telefone_cliente text,
  status text NOT NULL DEFAULT 'ativo',
  proposta_gerada text,
  proposta_gerada_at timestamptz,
  created_by uuid NOT NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table to store chat messages for each session
CREATE TABLE public.orcamento_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.orcamento_sessoes(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orcamento_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_mensagens ENABLE ROW LEVEL SECURITY;

-- RLS for orcamento_sessoes: only admins can manage
CREATE POLICY "Admin can manage orcamento_sessoes"
ON public.orcamento_sessoes FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for orcamento_mensagens: only admins can view
CREATE POLICY "Admin can manage orcamento_mensagens"
ON public.orcamento_mensagens FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_orcamento_sessoes_updated_at
BEFORE UPDATE ON public.orcamento_sessoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for token lookups (public access)
CREATE INDEX idx_orcamento_sessoes_token ON public.orcamento_sessoes(token);
