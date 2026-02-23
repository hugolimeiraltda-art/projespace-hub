
-- Access level enum
CREATE TYPE public.access_level AS ENUM ('completo', 'visualizacao', 'nenhum');

-- Role-level menu permissions
CREATE TABLE public.role_menu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  menu_key text NOT NULL,
  access_level access_level NOT NULL DEFAULT 'nenhum',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, menu_key)
);

-- User-level overrides
CREATE TABLE public.user_menu_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  access_level access_level NOT NULL DEFAULT 'nenhum',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, menu_key)
);

-- Enable RLS
ALTER TABLE public.role_menu_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_menu_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone authenticated can read permissions (needed for nav)
CREATE POLICY "Authenticated can view role_menu_permissions"
  ON public.role_menu_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage role_menu_permissions"
  ON public.role_menu_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User overrides: users can read their own, admin can manage all
CREATE POLICY "Users can view own overrides"
  ON public.user_menu_overrides FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage user_menu_overrides"
  ON public.user_menu_overrides FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default permissions based on current hardcoded roles
-- Menu keys: dashboard, projetos, projetos/novo, projetos/informar-venda, projetos/lista,
-- implantacao, controle-estoque, manutencao, manutencao/preventivas, manutencao/chamados,
-- manutencao/pendencias, carteira-clientes, sucesso-cliente, orcamentos, orcamentos/sessoes,
-- orcamentos/propostas, orcamentos/produtos, orcamentos/regras, orcamentos/kit-regras,
-- painel-ia, configuracoes, configuracoes/usuarios

INSERT INTO public.role_menu_permissions (role, menu_key, access_level) VALUES
-- admin: full access to everything
('admin', 'dashboard', 'completo'),
('admin', 'projetos', 'completo'),
('admin', 'projetos/novo', 'completo'),
('admin', 'projetos/informar-venda', 'completo'),
('admin', 'projetos/lista', 'completo'),
('admin', 'implantacao', 'completo'),
('admin', 'controle-estoque', 'completo'),
('admin', 'manutencao', 'completo'),
('admin', 'manutencao/preventivas', 'completo'),
('admin', 'manutencao/chamados', 'completo'),
('admin', 'manutencao/pendencias', 'completo'),
('admin', 'carteira-clientes', 'completo'),
('admin', 'sucesso-cliente', 'completo'),
('admin', 'orcamentos', 'completo'),
('admin', 'orcamentos/sessoes', 'completo'),
('admin', 'orcamentos/propostas', 'completo'),
('admin', 'orcamentos/produtos', 'completo'),
('admin', 'orcamentos/regras', 'completo'),
('admin', 'orcamentos/kit-regras', 'completo'),
('admin', 'painel-ia', 'completo'),
('admin', 'configuracoes', 'completo'),
('admin', 'configuracoes/usuarios', 'completo'),

-- vendedor
('vendedor', 'dashboard', 'completo'),
('vendedor', 'projetos', 'completo'),
('vendedor', 'projetos/novo', 'completo'),
('vendedor', 'projetos/informar-venda', 'completo'),
('vendedor', 'projetos/lista', 'completo'),
('vendedor', 'orcamentos', 'visualizacao'),
('vendedor', 'orcamentos/sessoes', 'visualizacao'),

-- projetos
('projetos', 'dashboard', 'completo'),
('projetos', 'projetos', 'visualizacao'),
('projetos', 'projetos/lista', 'visualizacao'),
('projetos', 'carteira-clientes', 'completo'),
('projetos', 'sucesso-cliente', 'visualizacao'),
('projetos', 'orcamentos', 'visualizacao'),
('projetos', 'orcamentos/sessoes', 'visualizacao'),
('projetos', 'orcamentos/propostas', 'visualizacao'),
('projetos', 'orcamentos/produtos', 'visualizacao'),
('projetos', 'orcamentos/regras', 'visualizacao'),
('projetos', 'orcamentos/kit-regras', 'visualizacao'),

-- implantacao
('implantacao', 'dashboard', 'completo'),
('implantacao', 'implantacao', 'completo'),
('implantacao', 'manutencao', 'completo'),
('implantacao', 'manutencao/preventivas', 'completo'),
('implantacao', 'manutencao/chamados', 'completo'),
('implantacao', 'manutencao/pendencias', 'completo'),
('implantacao', 'carteira-clientes', 'completo'),
('implantacao', 'sucesso-cliente', 'visualizacao'),
('implantacao', 'orcamentos', 'completo'),
('implantacao', 'orcamentos/sessoes', 'completo'),
('implantacao', 'orcamentos/propostas', 'completo'),
('implantacao', 'orcamentos/produtos', 'completo'),
('implantacao', 'orcamentos/regras', 'completo'),
('implantacao', 'orcamentos/kit-regras', 'completo'),

-- administrativo
('administrativo', 'dashboard', 'completo'),
('administrativo', 'projetos', 'completo'),
('administrativo', 'projetos/novo', 'completo'),
('administrativo', 'projetos/informar-venda', 'completo'),
('administrativo', 'projetos/lista', 'completo'),
('administrativo', 'implantacao', 'visualizacao'),
('administrativo', 'controle-estoque', 'completo'),
('administrativo', 'manutencao', 'visualizacao'),
('administrativo', 'manutencao/preventivas', 'visualizacao'),
('administrativo', 'manutencao/chamados', 'visualizacao'),
('administrativo', 'manutencao/pendencias', 'visualizacao'),
('administrativo', 'carteira-clientes', 'completo'),
('administrativo', 'sucesso-cliente', 'visualizacao'),
('administrativo', 'configuracoes', 'completo'),
('administrativo', 'configuracoes/usuarios', 'completo'),

-- sucesso_cliente
('sucesso_cliente', 'dashboard', 'completo'),
('sucesso_cliente', 'projetos', 'visualizacao'),
('sucesso_cliente', 'projetos/novo', 'completo'),
('sucesso_cliente', 'projetos/informar-venda', 'completo'),
('sucesso_cliente', 'projetos/lista', 'visualizacao'),
('sucesso_cliente', 'implantacao', 'visualizacao'),
('sucesso_cliente', 'carteira-clientes', 'completo'),
('sucesso_cliente', 'sucesso-cliente', 'completo'),
('sucesso_cliente', 'configuracoes/usuarios', 'visualizacao'),

-- supervisor_operacoes
('supervisor_operacoes', 'dashboard', 'completo'),
('supervisor_operacoes', 'projetos', 'completo'),
('supervisor_operacoes', 'projetos/novo', 'completo'),
('supervisor_operacoes', 'projetos/informar-venda', 'completo'),
('supervisor_operacoes', 'projetos/lista', 'completo'),
('supervisor_operacoes', 'implantacao', 'completo'),
('supervisor_operacoes', 'controle-estoque', 'completo'),
('supervisor_operacoes', 'manutencao', 'completo'),
('supervisor_operacoes', 'manutencao/preventivas', 'completo'),
('supervisor_operacoes', 'manutencao/chamados', 'completo'),
('supervisor_operacoes', 'manutencao/pendencias', 'completo'),
('supervisor_operacoes', 'carteira-clientes', 'completo'),
('supervisor_operacoes', 'orcamentos', 'completo'),
('supervisor_operacoes', 'orcamentos/sessoes', 'completo'),
('supervisor_operacoes', 'orcamentos/propostas', 'completo'),
('supervisor_operacoes', 'orcamentos/produtos', 'completo'),
('supervisor_operacoes', 'orcamentos/regras', 'completo'),
('supervisor_operacoes', 'orcamentos/kit-regras', 'completo'),

-- gerente_comercial
('gerente_comercial', 'dashboard', 'completo'),
('gerente_comercial', 'projetos', 'visualizacao'),
('gerente_comercial', 'projetos/lista', 'visualizacao'),
('gerente_comercial', 'orcamentos', 'visualizacao'),
('gerente_comercial', 'orcamentos/sessoes', 'visualizacao'),
('gerente_comercial', 'configuracoes/usuarios', 'visualizacao');
