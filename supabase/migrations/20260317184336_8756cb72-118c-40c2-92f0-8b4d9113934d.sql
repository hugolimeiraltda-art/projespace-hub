
-- Table to store NOC integration chamados and snapshots
CREATE TABLE public.implantacao_noc_chamados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  implantacao_id uuid NOT NULL REFERENCES public.implantacao_etapas(id) ON DELETE CASCADE,
  
  -- Idempotency key
  transicao_noc text NOT NULL DEFAULT 'abertura_secao_6',
  
  -- Integration result
  chamado_id text,
  chamado_numero text,
  chamado_url text,
  integration_status text NOT NULL DEFAULT 'pending', -- pending, success, error, duplicate
  integration_message text,
  
  -- Audit
  opened_by uuid,
  opened_by_name text,
  opened_at timestamptz,
  
  -- Request tracking
  request_id uuid DEFAULT gen_random_uuid(),
  payload_snapshot jsonb,
  response_snapshot jsonb,
  
  -- Status of section 6 sub-items
  item_6_1_status text NOT NULL DEFAULT 'pending', -- pending, loading, success, error
  item_6_2_status text NOT NULL DEFAULT 'blocked', -- blocked, pending, done
  item_6_3_status text NOT NULL DEFAULT 'blocked', -- blocked, pending, done
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint for idempotency
  UNIQUE(project_id, transicao_noc)
);

-- Enable RLS
ALTER TABLE public.implantacao_noc_chamados ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin can manage noc chamados"
ON public.implantacao_noc_chamados
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Implantacao can manage noc chamados"
ON public.implantacao_noc_chamados
FOR ALL
USING (has_role(auth.uid(), 'implantacao'::app_role))
WITH CHECK (has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Administrativo can manage noc chamados"
ON public.implantacao_noc_chamados
FOR ALL
USING (has_role(auth.uid(), 'administrativo'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrativo'::app_role));

CREATE POLICY "Projetos can view noc chamados"
ON public.implantacao_noc_chamados
FOR SELECT
USING (has_role(auth.uid(), 'projetos'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_implantacao_noc_chamados_updated_at
BEFORE UPDATE ON public.implantacao_noc_chamados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
