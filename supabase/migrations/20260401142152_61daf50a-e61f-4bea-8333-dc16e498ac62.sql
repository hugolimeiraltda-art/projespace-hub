
-- Tabela de técnicos de manutenção (PJ e CLT)
CREATE TABLE public.manutencao_tecnicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo_pessoa TEXT NOT NULL DEFAULT 'PJ',
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  rg TEXT,
  data_nascimento TEXT,
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
  empresa TEXT[] DEFAULT '{}',
  praca TEXT[] DEFAULT '{}',
  tipo_vinculo TEXT NOT NULL DEFAULT 'PJ',
  cargo TEXT,
  data_admissao TEXT,
  ctps TEXT,
  pis TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT
);

ALTER TABLE public.manutencao_tecnicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tecnicos" ON public.manutencao_tecnicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tecnicos" ON public.manutencao_tecnicos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update tecnicos" ON public.manutencao_tecnicos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete tecnicos" ON public.manutencao_tecnicos FOR DELETE TO authenticated USING (true);

-- Tabela de documentos dos técnicos
CREATE TABLE public.manutencao_tecnico_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tecnico_id UUID NOT NULL REFERENCES public.manutencao_tecnicos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo_documento TEXT,
  tamanho BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.manutencao_tecnico_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tecnico docs" ON public.manutencao_tecnico_documentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert tecnico docs" ON public.manutencao_tecnico_documentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete tecnico docs" ON public.manutencao_tecnico_documentos FOR DELETE TO authenticated USING (true);
