
CREATE TABLE public.email_templates (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  assunto TEXT NOT NULL,
  corpo_html TEXT,
  variaveis TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read email templates"
  ON public.email_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update email templates"
  ON public.email_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can insert email templates"
  ON public.email_templates FOR INSERT TO authenticated WITH CHECK (true);

-- Seed default templates
INSERT INTO public.email_templates (id, nome, descricao, assunto, variaveis) VALUES
  ('recuperacao_senha', 'Recuperação de Senha', 'Enviado quando o usuário solicita redefinição de senha', 'Redefinição de Senha - Eixo PCI', ARRAY['{{nome}}', '{{link_redefinicao}}', '{{validade}}']),
  ('boas_vindas', 'Boas-vindas (Conta Nova)', 'Enviado quando um novo usuário é criado no sistema', 'Bem-vindo ao Eixo PCI - Seus dados de acesso', ARRAY['{{nome}}', '{{email}}', '{{senha_temporaria}}', '{{link_login}}']),
  ('status_projeto', 'Atualização de Status do Projeto', 'Enviado quando o status de um projeto é alterado', 'Atualização: Projeto "{{projeto_nome}}" - {{novo_status}}', ARRAY['{{nome}}', '{{projeto_nome}}', '{{status_anterior}}', '{{novo_status}}', '{{alterado_por}}', '{{link_projeto}}']),
  ('relatorio_visita', 'Relatório de Visita Técnica', 'Enviado ao vendedor após gerar relatório de visita', 'Relatório de Visita Técnica - {{cliente}}', ARRAY['{{nome}}', '{{cliente}}', '{{conteudo_relatorio}}']),
  ('chamado_manutencao', 'Notificação de Chamado', 'Enviado quando um chamado de manutenção é criado ou atualizado', 'Chamado de Manutenção - {{cliente}} - {{status}}', ARRAY['{{nome}}', '{{cliente}}', '{{tipo_chamado}}', '{{status}}', '{{link_chamado}}']),
  ('preventiva_agendada', 'Preventiva Agendada', 'Lembrete de manutenção preventiva próxima', 'Lembrete: Preventiva agendada para {{data}} - {{cliente}}', ARRAY['{{nome}}', '{{cliente}}', '{{data}}', '{{descricao}}']);
