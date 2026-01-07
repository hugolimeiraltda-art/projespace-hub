-- Create sale_forms table to store Form 2 data
CREATE TABLE public.sale_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Identificação
  vendedor_email TEXT,
  vendedor_nome TEXT,
  filial TEXT,
  nome_condominio TEXT,
  qtd_apartamentos INTEGER,
  qtd_blocos INTEGER,
  produto TEXT DEFAULT 'Portaria Digital',
  
  -- Infra / Central de Portaria
  acesso_local_central_portaria TEXT,
  cabo_metros_qdg_ate_central INTEGER,
  internet_exclusiva TEXT,
  obs_central_portaria_qdg TEXT,
  
  -- Telefonia / Interfonia
  transbordo_para_apartamentos TEXT,
  local_central_interfonia_descricao TEXT,
  
  -- Acessos - Portas
  qtd_portas_pedestre INTEGER,
  qtd_portas_bloco INTEGER,
  qtd_saida_autenticada INTEGER,
  obs_portas TEXT,
  
  -- Acessos - Portões
  qtd_portoes_deslizantes INTEGER,
  qtd_portoes_pivotantes INTEGER,
  qtd_portoes_basculantes INTEGER,
  metodo_acionamento_portoes TEXT,
  
  -- CFTV Aproveitado
  qtd_dvrs_aproveitados INTEGER,
  marca_modelo_dvr_aproveitado TEXT,
  qtd_cameras_aproveitadas INTEGER,
  
  -- CFTV Novo
  cftv_novo_qtd_dvr_4ch INTEGER,
  cftv_novo_qtd_dvr_8ch INTEGER,
  cftv_novo_qtd_dvr_16ch INTEGER,
  cftv_novo_qtd_total_cameras INTEGER,
  qtd_cameras_elevador INTEGER,
  acessos_tem_camera_int_ext BOOLEAN,
  
  -- Observações gerais
  obs_gerais TEXT,
  
  -- Alarme
  alarme_tipo TEXT,
  
  -- IVA
  iva_central_alarme_tipo TEXT,
  iva_qtd_pares_existentes INTEGER,
  iva_qtd_novos INTEGER,
  iva_qtd_cabo_blindado TEXT,
  
  -- Cerca Elétrica
  cerca_central_alarme_tipo TEXT,
  cerca_qtd_cabo_centenax INTEGER,
  cerca_local_central_choque TEXT,
  cerca_metragem_linear_total INTEGER,
  cerca_qtd_fios INTEGER,
  
  -- Controle de Acesso
  possui_cancela BOOLEAN,
  possui_catraca BOOLEAN,
  possui_totem BOOLEAN,
  
  -- Cancelas
  cancela_qtd_sentido_unico INTEGER,
  cancela_qtd_duplo_sentido INTEGER,
  cancela_aproveitada_detalhes TEXT,
  cancela_autenticacao TEXT,
  
  -- Catracas
  catraca_qtd_sentido_unico INTEGER,
  catraca_qtd_duplo_sentido INTEGER,
  catraca_aproveitada_detalhes TEXT,
  catraca_autenticacao TEXT,
  
  -- Totens
  totem_qtd_simples INTEGER,
  totem_qtd_duplo INTEGER,
  
  -- Generated content
  checklist_implantacao JSONB,
  resumo_tecnico_noc TEXT,
  
  UNIQUE(project_id)
);

-- Enable Row Level Security
ALTER TABLE public.sale_forms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view sale_forms for projects they can see"
ON public.sale_forms
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = sale_forms.project_id
));

CREATE POLICY "Users can insert sale_forms for their projects"
ON public.sale_forms
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects p 
  WHERE p.id = sale_forms.project_id 
  AND (p.created_by_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Users can update sale_forms for projects they can update"
ON public.sale_forms
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects p WHERE p.id = sale_forms.project_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sale_forms_updated_at
BEFORE UPDATE ON public.sale_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();