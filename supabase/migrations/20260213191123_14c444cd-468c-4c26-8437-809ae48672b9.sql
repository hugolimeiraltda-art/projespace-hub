
-- Tabela de produtos individuais
CREATE TABLE public.orcamento_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL, -- 'central', 'acesso_pedestre', 'acesso_veiculos', 'cftv', 'perimetro', 'infraestrutura', 'interfonia'
  preco_unitario numeric NOT NULL DEFAULT 0,
  unidade text NOT NULL DEFAULT 'un', -- 'un', 'metro', 'metro_linear', 'kit'
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de kits (agrupamento de produtos)
CREATE TABLE public.orcamento_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  categoria text NOT NULL,
  preco_kit numeric NOT NULL DEFAULT 0, -- preço do kit (pode ser diferente da soma dos produtos)
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Itens de cada kit
CREATE TABLE public.orcamento_kit_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.orcamento_kits(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.orcamento_produtos(id) ON DELETE CASCADE,
  quantidade integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de mídia das sessões de orçamento (fotos, vídeos, áudios do vendedor)
CREATE TABLE public.orcamento_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL REFERENCES public.orcamento_sessoes(id) ON DELETE CASCADE,
  mensagem_id uuid REFERENCES public.orcamento_mensagens(id) ON DELETE SET NULL,
  tipo text NOT NULL, -- 'foto', 'video', 'audio'
  arquivo_url text NOT NULL,
  nome_arquivo text NOT NULL,
  tamanho bigint,
  descricao text, -- descrição/contexto da mídia (ex: "foto fachada")
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bucket para mídia de orçamentos
INSERT INTO storage.buckets (id, name, public) VALUES ('orcamento-midias', 'orcamento-midias', false);

-- RLS para produtos
ALTER TABLE public.orcamento_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage produtos" ON public.orcamento_produtos
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view active produtos" ON public.orcamento_produtos
FOR SELECT USING (auth.uid() IS NOT NULL AND ativo = true);

-- RLS para kits
ALTER TABLE public.orcamento_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage kits" ON public.orcamento_kits
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view active kits" ON public.orcamento_kits
FOR SELECT USING (auth.uid() IS NOT NULL AND ativo = true);

-- RLS para kit_itens
ALTER TABLE public.orcamento_kit_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage kit_itens" ON public.orcamento_kit_itens
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view kit_itens" ON public.orcamento_kit_itens
FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS para mídias
ALTER TABLE public.orcamento_midias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage orcamento_midias" ON public.orcamento_midias
FOR ALL USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Storage policies para bucket de mídia
CREATE POLICY "Authenticated users can upload orcamento midias"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'orcamento-midias' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view orcamento midias"
ON storage.objects FOR SELECT
USING (bucket_id = 'orcamento-midias' AND auth.uid() IS NOT NULL);

-- Alterar sessão para vincular ao vendedor logado
ALTER TABLE public.orcamento_sessoes ADD COLUMN IF NOT EXISTS vendedor_id uuid REFERENCES auth.users(id);
ALTER TABLE public.orcamento_sessoes ADD COLUMN IF NOT EXISTS vendedor_nome text;

-- Permitir vendedores acessar suas sessões
CREATE POLICY "Vendedor can view own sessoes" ON public.orcamento_sessoes
FOR SELECT USING (auth.uid() = vendedor_id OR auth.uid() = created_by::uuid);

CREATE POLICY "Vendedor can update own sessoes" ON public.orcamento_sessoes
FOR UPDATE USING (auth.uid() = vendedor_id OR auth.uid() = created_by::uuid);

-- Permitir vendedores gerenciar mensagens de suas sessões
CREATE POLICY "Vendedor can manage own session messages" ON public.orcamento_mensagens
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orcamento_sessoes s 
    WHERE s.id = orcamento_mensagens.sessao_id 
    AND (s.vendedor_id = auth.uid() OR s.created_by::uuid = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orcamento_sessoes s 
    WHERE s.id = orcamento_mensagens.sessao_id 
    AND (s.vendedor_id = auth.uid() OR s.created_by::uuid = auth.uid())
  )
);

-- Triggers de updated_at
CREATE TRIGGER update_orcamento_produtos_updated_at
BEFORE UPDATE ON public.orcamento_produtos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orcamento_kits_updated_at
BEFORE UPDATE ON public.orcamento_kits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
