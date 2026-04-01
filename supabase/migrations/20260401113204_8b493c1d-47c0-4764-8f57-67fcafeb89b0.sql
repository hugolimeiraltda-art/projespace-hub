
-- Prestadores (instaladores/terceiros)
CREATE TABLE public.prestadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_pessoa TEXT NOT NULL DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  rg TEXT,
  data_nascimento DATE,
  email TEXT,
  telefone TEXT,
  telefone2 TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  razao_social TEXT,
  nome_fantasia TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta TEXT,
  pix TEXT,
  especialidade TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT
);

-- Documentos dos prestadores
CREATE TABLE public.prestador_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prestador_id UUID NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo_documento TEXT,
  tamanho INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Orçamento do setor (planejado vs executado por categoria/mês)
CREATE TABLE public.implantacao_orcamento_setor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  valor_planejado NUMERIC NOT NULL DEFAULT 0,
  valor_executado NUMERIC NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  UNIQUE(ano, mes, categoria)
);

-- RLS
ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestador_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implantacao_orcamento_setor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view prestadores" ON public.prestadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert prestadores" ON public.prestadores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update prestadores" ON public.prestadores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view prestador_documentos" ON public.prestador_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert prestador_documentos" ON public.prestador_documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete prestador_documentos" ON public.prestador_documentos FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view orcamento_setor" ON public.implantacao_orcamento_setor FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orcamento_setor" ON public.implantacao_orcamento_setor FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orcamento_setor" ON public.implantacao_orcamento_setor FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket for prestador documents
INSERT INTO storage.buckets (id, name, public) VALUES ('prestador-documentos', 'prestador-documentos', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Auth users can upload prestador docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'prestador-documentos');
CREATE POLICY "Anyone can view prestador docs" ON storage.objects FOR SELECT USING (bucket_id = 'prestador-documentos');
CREATE POLICY "Auth users can delete prestador docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'prestador-documentos');
