-- Create project status enum
CREATE TYPE public.project_status AS ENUM (
  'RASCUNHO',
  'ENVIADO',
  'EM_ANALISE',
  'PENDENTE_INFO',
  'APROVADO_PROJETO',
  'RECUSADO',
  'CANCELADO'
);

-- Create engineering status enum
CREATE TYPE public.engineering_status AS ENUM (
  'EM_RECEBIMENTO',
  'EM_PRODUCAO',
  'CONCLUIDO'
);

-- Create sale status enum
CREATE TYPE public.sale_status AS ENUM (
  'NAO_INICIADO',
  'EM_ANDAMENTO',
  'CONCLUIDO'
);

-- Create attachment type enum
CREATE TYPE public.attachment_type AS ENUM (
  'CROQUI',
  'PLANTA_BAIXA',
  'CONTRATO',
  'FOTOS_LOCAL',
  'ORCAMENTO',
  'DOCUMENTOS_COMPLEMENTARES',
  'OUTRO'
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendedor_nome TEXT NOT NULL,
  vendedor_email TEXT NOT NULL,
  cliente_condominio_nome TEXT NOT NULL,
  cliente_cidade TEXT,
  cliente_estado TEXT,
  endereco_condominio TEXT,
  status project_status NOT NULL DEFAULT 'RASCUNHO',
  engineering_status engineering_status,
  engineering_received_at TIMESTAMP WITH TIME ZONE,
  engineering_production_at TIMESTAMP WITH TIME ZONE,
  engineering_completed_at TIMESTAMP WITH TIME ZONE,
  prazo_entrega_projeto DATE,
  data_assembleia DATE,
  sale_status sale_status NOT NULL DEFAULT 'NAO_INICIADO',
  email_padrao_gerado TEXT,
  observacoes TEXT
);

-- Create tap_forms table
CREATE TABLE public.tap_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  solicitacao_origem TEXT,
  email_origem_texto TEXT,
  portaria_virtual_atendimento_app TEXT,
  numero_blocos INTEGER,
  interfonia BOOLEAN DEFAULT false,
  controle_acessos_pedestre_descricao TEXT,
  controle_acessos_veiculo_descricao TEXT,
  alarme_descricao TEXT,
  cftv_dvr_descricao TEXT,
  cftv_elevador_possui TEXT,
  observacao_nao_assumir_cameras BOOLEAN DEFAULT false,
  marcacao_croqui_confirmada BOOLEAN DEFAULT false,
  marcacao_croqui_itens TEXT[],
  info_custo TEXT,
  info_cronograma TEXT,
  info_adicionais TEXT
);

-- Create project_attachments table
CREATE TABLE public.project_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  tipo attachment_type NOT NULL,
  arquivo_url TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_comments table
CREATE TABLE public.project_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  texto TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_status_history table
CREATE TABLE public.project_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_status project_status,
  to_status project_status NOT NULL,
  changed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by_user_name TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_notifications table
CREATE TABLE public.project_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  for_role TEXT,
  for_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tap_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notifications ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Vendedores can view their own projects"
ON public.projects FOR SELECT
USING (created_by_user_id = auth.uid());

CREATE POLICY "Projetos role can view all projects"
ON public.projects FOR SELECT
USING (public.has_role(auth.uid(), 'projetos'));

CREATE POLICY "Admin can view all projects"
ON public.projects FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gerente comercial can view projects from their filiais"
ON public.projects FOR SELECT
USING (public.has_role(auth.uid(), 'gerente_comercial'));

CREATE POLICY "Vendedores can create projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Vendedores can update their own draft projects"
ON public.projects FOR UPDATE
USING (created_by_user_id = auth.uid());

CREATE POLICY "Projetos role can update all projects"
ON public.projects FOR UPDATE
USING (public.has_role(auth.uid(), 'projetos'));

CREATE POLICY "Admin can update all projects"
ON public.projects FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete projects"
ON public.projects FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- TAP forms policies (same as projects - linked)
CREATE POLICY "Users can view tap_forms for projects they can see"
ON public.tap_forms FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

CREATE POLICY "Users can insert tap_forms for their projects"
ON public.tap_forms FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.created_by_user_id = auth.uid()
));

CREATE POLICY "Users can update tap_forms for projects they can update"
ON public.tap_forms FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

-- Attachments policies
CREATE POLICY "Users can view attachments for projects they can see"
ON public.project_attachments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

CREATE POLICY "Users can add attachments to their projects"
ON public.project_attachments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

CREATE POLICY "Users can delete their attachments"
ON public.project_attachments FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

-- Comments policies
CREATE POLICY "Users can view comments for projects they can see"
ON public.project_comments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

CREATE POLICY "Users can add comments to projects they can see"
ON public.project_comments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

-- Status history policies
CREATE POLICY "Users can view status history for projects they can see"
ON public.project_status_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

CREATE POLICY "Users can add status history"
ON public.project_status_history FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id
));

-- Notifications policies
CREATE POLICY "Users can view their notifications"
ON public.project_notifications FOR SELECT
USING (
  for_user_id = auth.uid() OR 
  (for_role IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = for_role
  ))
);

CREATE POLICY "Users can update their notifications"
ON public.project_notifications FOR UPDATE
USING (
  for_user_id = auth.uid() OR 
  (for_role IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = for_role
  ))
);

CREATE POLICY "System can insert notifications"
ON public.project_notifications FOR INSERT
WITH CHECK (true);

-- Add updated_at trigger to projects
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();