
-- Table to log engineering referrals (audit)
CREATE TABLE public.orcamento_encaminhamentos_engenharia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.orcamento_sessoes(id) ON DELETE CASCADE,
  gatilhos_disparados jsonb NOT NULL DEFAULT '[]'::jsonb,
  mensalidade_total numeric,
  taxa_conexao_total numeric,
  total_acessos integer,
  total_cameras integer,
  total_unidades integer,
  status text NOT NULL DEFAULT 'pendente',
  sla_prazo timestamptz,
  observacoes_engenharia text,
  itens_alterados jsonb,
  respondido_por uuid,
  respondido_por_nome text,
  respondido_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_encaminhamentos_engenharia ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage encaminhamentos" ON public.orcamento_encaminhamentos_engenharia FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Projetos can manage encaminhamentos" ON public.orcamento_encaminhamentos_engenharia FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'projetos'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'projetos'::app_role));

CREATE POLICY "Vendedor can view own encaminhamentos" ON public.orcamento_encaminhamentos_engenharia FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orcamento_sessoes s WHERE s.id = orcamento_encaminhamentos_engenharia.sessao_id AND (s.vendedor_id = auth.uid() OR s.created_by = auth.uid())));

CREATE POLICY "Gerente comercial can view encaminhamentos" ON public.orcamento_encaminhamentos_engenharia FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'gerente_comercial'::app_role));

CREATE POLICY "Implantacao can view encaminhamentos" ON public.orcamento_encaminhamentos_engenharia FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'implantacao'::app_role));

CREATE POLICY "Supervisor can view encaminhamentos" ON public.orcamento_encaminhamentos_engenharia FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'supervisor_operacoes'::app_role));

-- Add flag to sessoes for quick reference
ALTER TABLE public.orcamento_sessoes ADD COLUMN IF NOT EXISTS encaminhado_engenharia boolean DEFAULT false;
