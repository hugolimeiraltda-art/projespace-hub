CREATE TABLE public.customer_rede_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  equipamento text NOT NULL,
  ip text,
  ddns text,
  usuario text,
  senha text,
  porta_web text,
  porta_tcp text,
  porta_rtsp text,
  ramal text,
  senha_ramal text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_rede_equipamentos TO authenticated;
GRANT ALL ON public.customer_rede_equipamentos TO service_role;
ALTER TABLE public.customer_rede_equipamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe interna pode ver documentacao de rede"
ON public.customer_rede_equipamentos FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'projetos')
  OR public.has_role(auth.uid(), 'implantacao') OR public.has_role(auth.uid(), 'sucesso_cliente')
  OR public.has_role(auth.uid(), 'supervisor_operacoes')
);
CREATE POLICY "Equipe interna pode gerenciar documentacao de rede"
ON public.customer_rede_equipamentos FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'implantacao')
  OR public.has_role(auth.uid(), 'sucesso_cliente') OR public.has_role(auth.uid(), 'supervisor_operacoes')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'implantacao')
  OR public.has_role(auth.uid(), 'sucesso_cliente') OR public.has_role(auth.uid(), 'supervisor_operacoes')
);

CREATE TRIGGER update_customer_rede_equipamentos_updated_at
BEFORE UPDATE ON public.customer_rede_equipamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customer_rede_equipamentos_customer ON public.customer_rede_equipamentos(customer_id);

CREATE TABLE public.customer_rede_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  provedor text NOT NULL,
  contato text,
  usuario text,
  senha text,
  ip_global text,
  ip text,
  mask text,
  gateway text,
  dns1 text,
  dns2 text,
  observacoes text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_rede_links TO authenticated;
GRANT ALL ON public.customer_rede_links TO service_role;
ALTER TABLE public.customer_rede_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe interna pode ver links de internet"
ON public.customer_rede_links FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'projetos')
  OR public.has_role(auth.uid(), 'implantacao') OR public.has_role(auth.uid(), 'sucesso_cliente')
  OR public.has_role(auth.uid(), 'supervisor_operacoes')
);
CREATE POLICY "Equipe interna pode gerenciar links de internet"
ON public.customer_rede_links FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'implantacao')
  OR public.has_role(auth.uid(), 'sucesso_cliente') OR public.has_role(auth.uid(), 'supervisor_operacoes')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'implantacao')
  OR public.has_role(auth.uid(), 'sucesso_cliente') OR public.has_role(auth.uid(), 'supervisor_operacoes')
);

CREATE TRIGGER update_customer_rede_links_updated_at
BEFORE UPDATE ON public.customer_rede_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_customer_rede_links_customer ON public.customer_rede_links(customer_id);