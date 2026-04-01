
-- Tabela para armazenar alertas de reincidência do NOC
CREATE TABLE public.noc_alertas_reincidencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato text NOT NULL,
  razao_social text NOT NULL,
  customer_id uuid REFERENCES public.customer_portfolio(id) ON DELETE SET NULL,
  tipo_alerta text NOT NULL DEFAULT 'reincidencia',
  categoria text,
  descricao text,
  severidade text NOT NULL DEFAULT 'media',
  quantidade_ocorrencias integer DEFAULT 1,
  periodo_referencia text,
  dados_extras jsonb DEFAULT '{}'::jsonb,
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_at timestamptz,
  resolvido_por text,
  notificado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.noc_alertas_reincidencia ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin can manage noc_alertas"
  ON public.noc_alertas_reincidencia FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Implantacao can manage noc_alertas"
  ON public.noc_alertas_reincidencia FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'implantacao'))
  WITH CHECK (public.has_role(auth.uid(), 'implantacao'));

CREATE POLICY "Administrativo can view noc_alertas"
  ON public.noc_alertas_reincidencia FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrativo'));

CREATE POLICY "Sucesso Cliente can view noc_alertas"
  ON public.noc_alertas_reincidencia FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'sucesso_cliente'));

CREATE POLICY "Supervisor can manage noc_alertas"
  ON public.noc_alertas_reincidencia FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor_operacoes'))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor_operacoes'));

-- Trigger updated_at
CREATE TRIGGER update_noc_alertas_updated_at
  BEFORE UPDATE ON public.noc_alertas_reincidencia
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
