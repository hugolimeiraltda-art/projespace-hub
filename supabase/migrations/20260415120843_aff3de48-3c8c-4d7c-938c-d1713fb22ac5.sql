
CREATE TABLE public.cs_politicas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  icone TEXT NOT NULL DEFAULT 'ClipboardCheck',
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT NULL,
  updated_by_name TEXT NULL
);

ALTER TABLE public.cs_politicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cs_politicas"
  ON public.cs_politicas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update cs_politicas"
  ON public.cs_politicas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert cs_politicas"
  ON public.cs_politicas FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default policies
INSERT INTO public.cs_politicas (id, titulo, descricao, icone, itens) VALUES
('pesquisa-satisfacao', 'Política de Pesquisa de Satisfação', 'Diretrizes para aplicação e acompanhamento das pesquisas de satisfação com os clientes.', 'ClipboardCheck', '["Pesquisa aplicada após 30 dias da ativação do condomínio","Periodicidade: a cada 6 meses para clientes ativos","Canais de aplicação: telefone, e-mail ou presencial","Resultados devem ser registrados no sistema em até 48h","Pesquisas com nota abaixo de 7 devem gerar plano de ação imediato","Responsável: Analista de Sucesso do Cliente designado à conta"]'),
('nps', 'Política de NPS', 'Regras para coleta, análise e atuação sobre o Net Promoter Score.', 'BarChart3', '["NPS coletado trimestralmente para toda a base ativa","Classificação: Promotores (9-10), Neutros (7-8), Detratores (0-6)","Detratores devem ser contatados em até 24h após a resposta","Meta mínima de NPS da operação: 50 pontos","Relatório consolidado apresentado mensalmente à diretoria","Ações corretivas para contas detratoras com prazo máximo de 15 dias"]'),
('insatisfacoes', 'Política de Tratamento de Insatisfações e Reclamações', 'Fluxo de tratativa para clientes insatisfeitos ou com reclamações formais.', 'AlertTriangle', '["Toda reclamação deve ser registrada como chamado no sistema","Primeiro contato de retorno em até 4 horas úteis","Escalonamento automático para supervisor se não resolvido em 48h","Visita técnica presencial obrigatória para casos críticos","Plano de ação documentado com responsável e prazo definidos","Follow-up obrigatório após resolução: 7 e 30 dias","Casos reincidentes (3+ reclamações) geram reunião de alinhamento com gestão"]'),
('renovacao', 'Política de Renovação Contratual', 'Procedimentos para gestão de renovações e retenção de contratos.', 'RefreshCw', '["Início do processo de renovação: 90 dias antes do vencimento","Análise de saúde da conta (NPS, chamados, pendências) antes da abordagem","Proposta de renovação enviada com no mínimo 60 dias de antecedência","Negociações de reajuste seguem tabela aprovada pela diretoria","Contas com risco de churn devem ter plano de retenção ativo","Renovação concluída deve ser registrada com novo prazo no sistema","Relatório mensal de contratos a vencer nos próximos 90 dias"]'),
('reunioes-ticket', 'Política de Reuniões de CS com Clientes por Ticket', 'Frequência e formato das reuniões periódicas com clientes conforme faixa de ticket.', 'Users', '["Ticket Premium (acima de R$ 5.000/mês): reunião mensal presencial ou online","Ticket Alto (R$ 3.000 a R$ 5.000/mês): reunião bimestral","Ticket Médio (R$ 1.500 a R$ 3.000/mês): reunião trimestral","Ticket Básico (abaixo de R$ 1.500/mês): reunião semestral","Pauta mínima: indicadores de operação, pendências, satisfação e melhorias","Ata de reunião registrada no sistema em até 24h","Itens de ação com responsável e prazo devem ser acompanhados no follow-up"]'),
('indicadores', 'Indicadores de Desempenho do CS', 'KPIs monitorados para avaliar a performance do Sucesso do Cliente.', 'TrendingUp', '["NPS (Net Promoter Score) — meta mínima de 50 pontos","Taxa de cancelamento (%) — acompanhamento mensal por praça e filial","Tempo médio de resposta e resolução de chamados e reclamações","Taxa de engajamento nas reuniões de sucesso (presença vs. agendadas)","Taxa de renovação contratual — meta acima de 90%","Índice de satisfação geral (média das pesquisas aplicadas)","Volume de pendências abertas por cliente e tempo médio de resolução"]');
