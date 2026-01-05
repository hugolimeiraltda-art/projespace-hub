export type ProjectStatus = 
  | 'RASCUNHO' 
  | 'ENVIADO' 
  | 'EM_ANALISE' 
  | 'PENDENTE_INFO' 
  | 'APROVADO_PROJETO' 
  | 'CANCELADO';

export type SolicitacaoOrigem = 'EMAIL' | 'FORMS' | 'OUTRO';

export type PortariaVirtualApp = 'SIM_SEM_TRANSBORDO' | 'SIM_COM_TRANSBORDO' | 'NAO';

export type CFTVElevador = 'POSSUI' | 'NAO_POSSUI' | 'NAO_INFORMADO';

export type AttachmentType = 
  | 'PLANTA_BAIXA' 
  | 'CROQUI' 
  | 'IMAGENS' 
  | 'FOTOS_EQUIP_APROVEITADOS' 
  | 'OUTROS';

export type CroquiItem = 
  | 'CAMERAS_EXISTENTES' 
  | 'CAMERAS_NOVAS' 
  | 'PONTOS_CAMERAS' 
  | 'ALARME_PERIMETRAL' 
  | 'OUTROS';

export type UserRole = 'vendedor' | 'projetos' | 'admin';

export interface User {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
}

export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
  vendedor_nome: string;
  vendedor_email: string;
  cliente_condominio_nome: string;
  cliente_cidade: string;
  cliente_estado: string;
  endereco_condominio: string;
  status: ProjectStatus;
  prazo_entrega_projeto?: string;
  data_assembleia?: string;
  observacoes_gerais?: string;
  notas_projetos_internas?: string;
  email_padrao_gerado?: string;
}

export interface TapForm {
  project_id: string;
  solicitacao_origem: SolicitacaoOrigem;
  email_origem_texto?: string;
  portaria_virtual_atendimento_app: PortariaVirtualApp;
  numero_blocos: number;
  interfonia: boolean;
  controle_acessos_pedestre_descricao?: string;
  controle_acessos_veiculo_descricao?: string;
  alarme_descricao?: string;
  cftv_dvr_descricao?: string;
  cftv_elevador_possui: CFTVElevador;
  observacao_nao_assumir_cameras: boolean;
  marcacao_croqui_confirmada: boolean;
  marcacao_croqui_itens: CroquiItem[];
  info_custo?: string;
  info_cronograma?: string;
  info_adicionais?: string;
}

export interface Attachment {
  id: string;
  project_id: string;
  tipo: AttachmentType;
  arquivo_url: string;
  nome_arquivo: string;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface StatusChange {
  id: string;
  project_id: string;
  user_id: string;
  user_name: string;
  old_status: ProjectStatus;
  new_status: ProjectStatus;
  created_at: string;
}

export interface ProjectWithDetails extends Project {
  tap_form?: TapForm;
  attachments: Attachment[];
  comments: Comment[];
  status_history: StatusChange[];
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado',
  EM_ANALISE: 'Em Análise',
  PENDENTE_INFO: 'Pendente Info',
  APROVADO_PROJETO: 'Aprovado',
  CANCELADO: 'Cancelado',
};

export const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; dot: string }> = {
  RASCUNHO: { bg: 'bg-status-draft-bg', text: 'text-status-draft', dot: 'bg-status-draft' },
  ENVIADO: { bg: 'bg-status-sent-bg', text: 'text-status-sent', dot: 'bg-status-sent' },
  EM_ANALISE: { bg: 'bg-status-analysis-bg', text: 'text-status-analysis', dot: 'bg-status-analysis' },
  PENDENTE_INFO: { bg: 'bg-status-pending-bg', text: 'text-status-pending', dot: 'bg-status-pending' },
  APROVADO_PROJETO: { bg: 'bg-status-approved-bg', text: 'text-status-approved', dot: 'bg-status-approved' },
  CANCELADO: { bg: 'bg-status-cancelled-bg', text: 'text-status-cancelled', dot: 'bg-status-cancelled' },
};

export const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  PLANTA_BAIXA: 'Planta Baixa',
  CROQUI: 'Croqui',
  IMAGENS: 'Imagens',
  FOTOS_EQUIP_APROVEITADOS: 'Fotos Equipamentos Aproveitados',
  OUTROS: 'Outros',
};

export const CROQUI_ITEM_LABELS: Record<CroquiItem, string> = {
  CAMERAS_EXISTENTES: 'Câmeras Existentes',
  CAMERAS_NOVAS: 'Câmeras Novas',
  PONTOS_CAMERAS: 'Pontos de Câmeras',
  ALARME_PERIMETRAL: 'Alarme Perimetral',
  OUTROS: 'Outros',
};

export const PORTARIA_VIRTUAL_LABELS: Record<PortariaVirtualApp, string> = {
  SIM_SEM_TRANSBORDO: 'Sim, sem transbordo',
  SIM_COM_TRANSBORDO: 'Sim, com transbordo',
  NAO: 'Não',
};

export const CFTV_ELEVADOR_LABELS: Record<CFTVElevador, string> = {
  POSSUI: 'Possui',
  NAO_POSSUI: 'Não possui',
  NAO_INFORMADO: 'Não informado',
};
