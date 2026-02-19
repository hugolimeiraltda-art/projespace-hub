
-- Table for vendor access tokens
CREATE TABLE public.vendedor_acesso_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex') UNIQUE,
  vendedor_id UUID NOT NULL,
  vendedor_nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  expira_em TIMESTAMP WITH TIME ZONE,
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendedor_acesso_tokens ENABLE ROW LEVEL SECURITY;

-- Admin can manage all tokens
CREATE POLICY "Admin can manage vendedor tokens"
ON public.vendedor_acesso_tokens
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Gerente comercial can manage tokens
CREATE POLICY "Gerente can manage vendedor tokens"
ON public.vendedor_acesso_tokens
FOR ALL
USING (has_role(auth.uid(), 'gerente_comercial'::app_role))
WITH CHECK (has_role(auth.uid(), 'gerente_comercial'::app_role));

-- Vendedores can view their own tokens
CREATE POLICY "Vendedor can view own tokens"
ON public.vendedor_acesso_tokens
FOR SELECT
USING (vendedor_id = auth.uid());

-- Public read for token validation (needed for unauthenticated access)
CREATE POLICY "Anyone can validate tokens"
ON public.vendedor_acesso_tokens
FOR SELECT
USING (true);

-- Anyone can update ultimo_acesso
CREATE POLICY "Anyone can update last access"
ON public.vendedor_acesso_tokens
FOR UPDATE
USING (true)
WITH CHECK (true);
