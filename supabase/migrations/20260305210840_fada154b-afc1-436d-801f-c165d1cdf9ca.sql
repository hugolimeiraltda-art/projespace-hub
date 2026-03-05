
-- Table to store editable engineering referral rules
CREATE TABLE public.orcamento_regras_engenharia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_regra text NOT NULL,
  nome text NOT NULL,
  descricao text,
  valor_limite numeric,
  keywords text[],
  ativo boolean NOT NULL DEFAULT true,
  historico_alteracoes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_regras_engenharia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage regras engenharia" ON public.orcamento_regras_engenharia FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Projetos can view regras engenharia" ON public.orcamento_regras_engenharia FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'projetos'::app_role));

-- Seed initial rules
INSERT INTO public.orcamento_regras_engenharia (tipo_regra, nome, descricao, valor_limite) VALUES
('limite_numerico', 'Máximo de Acessos', 'Mais de 8 acessos controlados (portas + portões + cancelas + catracas + eclusas + totens)', 8),
('limite_numerico', 'Valor Total de Venda', 'Valor total de venda do projeto acima de R$ 300.000', 300000),
('limite_numerico', 'Mensalidade (Locação)', 'Mensalidade total (locação) acima de R$ 7.000', 7000),
('limite_numerico', 'Câmeras IP', 'Mais de 64 câmeras IP (digitais)', 64),
('limite_numerico', 'Unidades', 'Mais de 300 unidades (apartamentos/casas)', 300);

INSERT INTO public.orcamento_regras_engenharia (tipo_regra, nome, descricao, keywords) VALUES
('keyword', 'Proteção Perimetral com IA', 'Presença de proteção perimetral com IA (HikCentra)', ARRAY['hikcentra', 'hik centra', 'hikcentral', 'hik central']),
('keyword', 'Proteção Perimetral com Analíticos', 'Presença de proteção perimetral com analíticos', ARRAY['analítico', 'analitico', 'video analytics', 'detecção inteligente', 'deteccao inteligente']),
('keyword', 'LPR (Leitura de Placa)', 'Presença de LPR', ARRAY['lpr', 'leitura de placa', 'reconhecimento de placa', 'plate recognition']),
('keyword', 'Vendedor Solicitou Engenharia', 'Vendedor marcou requer engenharia', ARRAY['requer engenharia', 'precisa de engenharia', 'enviar para engenharia']);

-- Table to store training documents content
CREATE TABLE public.orcamento_treinamento_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT 'geral',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  historico_alteracoes jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_treinamento_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage treinamento docs" ON public.orcamento_treinamento_docs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Projetos can view treinamento docs" ON public.orcamento_treinamento_docs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'projetos'::app_role));

-- Seed initial training documents
INSERT INTO public.orcamento_treinamento_docs (titulo, categoria, ordem, conteudo) VALUES
('Portaria Digital', 'modalidades', 1, 'Autônoma. Visitante toca interfone → chamada vai ao App do morador via vídeo. Não passa pela central. Sistema inteligente de controle de acesso.'),
('Portaria Remota', 'modalidades', 2, 'Sem porteiro físico. Central Emive/Graber atende via câmeras e interfone (leitor facial SIP). Operadores humanos monitoram e controlam acessos.'),
('Portaria Assistida', 'modalidades', 3, 'Porteiro físico + software Emive. Porteiro usa sistema para atender interfones, registrar encomendas, cadastrar visitantes. Pode incluir Kit Estação de Trabalho.'),
('Portaria Expressa', 'modalidades', 4, 'Limitada: até 20 aptos, máximo 2 portas, sem CFTV, sem portão. Apenas alarme.'),
('CFTV e Câmeras', 'equipamentos', 5, 'Analógico ou digital (câmeras, DVR/NVR). Itens reaproveitados têm 50% de desconto. Novas câmeras exigem marcação de local. Cada porta/portão controlado deve ter uma câmera.'),
('Alarme e Perímetro', 'equipamentos', 6, 'IVA ou Cerca Elétrica. Para eclusas em portas de pedestres, não se adiciona módulo de intertravamento. Para portões/cancelas, o Módulo de Intertravamento é obrigatório.'),
('Controle de Acesso', 'equipamentos', 7, 'Pedestre: sempre leitor facial. Portas com ECLUSA. Veicular: Tag, Controle 433MHz, Facial. Portões: deslizante, pivotante, basculante, guilhotina. Cancelas: facial, controle ou tag. Catracas: sempre facial.'),
('Interfonia', 'equipamentos', 8, 'Híbrida: Central analógica + ATA KHOMP KAP 311-X + TDMI 300. Digital: TDMI 400 + ATA KHOMP 311x. Não permite aproveitamento. Se já existirem interfones, cobra-se serviço de manutenção.'),
('Vocabulário Comercial', 'comercial', 9, 'Use "iremos controlar" em vez de "existem" ou "possui". Linguagem profissional e consultiva. Regra do ATA: inclusão obriga 1 Nobreak 600VA e 100m cabo UTP Cat 5e.');
