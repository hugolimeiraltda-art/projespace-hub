CREATE TABLE IF NOT EXISTS public.configuracoes_pagamento (
  id text PRIMARY KEY DEFAULT 'default',
  valor_ponto numeric NOT NULL DEFAULT 19,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_by_name text
);

ALTER TABLE public.configuracoes_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read configuracoes_pagamento"
  ON public.configuracoes_pagamento FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can update configuracoes_pagamento"
  ON public.configuracoes_pagamento FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert configuracoes_pagamento"
  ON public.configuracoes_pagamento FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.configuracoes_pagamento (id, valor_ponto) VALUES ('default', 19) ON CONFLICT (id) DO NOTHING;