export type ProjectStatus = 
  | 'RASCUNHO' 
  | 'ENVIADO' 
  | 'EM_ANALISE' 
  | 'PENDENTE_INFO' 
  | 'APROVADO_PROJETO' 
  | 'CANCELADO';

// Engineering workflow status
export type EngineeringStatus = 
  | 'EM_RECEBIMENTO'
  | 'EM_PRODUCAO'
  | 'RETORNAR'
  | 'CONCLUIDO';

// Sale status for Form 2
export type SaleStatus = 
  | 'NAO_INICIADO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO';

export type SolicitacaoOrigem = 'EMAIL' | 'FORMS' | 'OUTRO';

export type PortariaVirtualApp = 'SIM_SEM_TRANSBORDO' | 'SIM_COM_TRANSBORDO' | 'NAO';

export type ModalidadePortaria = 'VIRTUAL' | 'PRESENCIAL' | 'CA_MONITORADO' | 'VIRTUAL_APOIO';

export type CFTVElevador = 'POSSUI' | 'NAO_POSSUI' | 'NAO_INFORMADO';

export type AlarmeTipo = 'IVA' | 'CERCA_ELETRICA' | 'NENHUM';

export type CentralAlarmeTipo = 'NOVA' | 'APROVEITADA';

export type MetodoAcionamentoPortoes = 
  | 'TAG_VEICULAR'
  | 'CONTROLE'
  | 'MULTIPLOS_ACIONAMENTOS'
  | 'FACIAL_PAREDE'
  | 'FACIAL_TOTEM';

export type AttachmentType = 
  | 'PLANTA_BAIXA' 
  | 'CROQUI' 
  | 'IMAGENS' 
  | 'FOTOS_EQUIP_APROVEITADOS' 
  | 'OUTROS'
  // Engineering deliverables
  | 'PLANTA_CROQUI_DEVOLUCAO'
  | 'LISTA_EQUIPAMENTOS'
  | 'LISTA_ATIVIDADES'
  // Form 2 attachment types
  | 'CENTRAL_PORTARIA_FOTOS'
  | 'QDG_FOTO'
  | 'INTERFONIA_FOTO'
  | 'PORTAS_FOTOS'
  | 'PORTOES_FOTOS'
  | 'CFTV_CENTRAL_FOTO'
  | 'DVRS_FOTOS'
  | 'CAMERAS_INSTALADAS_FOTOS'
  | 'ALARME_CENTRAL_FOTO_IVA'
  | 'ALARME_CENTRAL_FOTO_CERCA'
  | 'CHOQUE_FOTO'
  | 'CERCA_FOTOS'
  | 'CANCELA_FOTOS'
  | 'CATRACA_FOTOS'
  | 'TOTEM_FOTOS'
  | 'CAMERAS_NOVAS_FOTOS';

export type CroquiItem = 
  | 'CAMERAS_EXISTENTES' 
  | 'CAMERAS_NOVAS' 
  | 'PONTOS_CAMERAS' 
  | 'ALARME_PERIMETRAL' 
  | 'OUTROS';

export type UserRole = 'vendedor' | 'projetos' | 'admin' | 'gerente_comercial' | 'implantacao' | 'administrativo';

// Implantação status
export type ImplantacaoStatus = 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO';

export interface Project {
  id: string;
  numero_projeto?: number;
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
  numero_unidades?: number;
  // Engineering workflow
  engineering_status?: EngineeringStatus;
  engineering_received_at?: string;
  engineering_production_at?: string;
  engineering_completed_at?: string;
  // Engineering deliverables
  laudo_projeto?: string;
  // Sale status
  sale_status?: SaleStatus;
  sale_locked_at?: string;
  // Notifications
  notifications?: Notification[];
  // Original data before resubmission for change tracking
  dados_originais_pre_reenvio?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  type: 'PROJECT_COMPLETED' | 'STATUS_CHANGED' | 'COMMENT_ADDED';
  message: string;
  read: boolean;
  created_at: string;
  project_id: string;
}

export interface TapForm {
  project_id: string;
  solicitacao_origem: SolicitacaoOrigem;
  email_origem_texto?: string;
  modalidade_portaria?: ModalidadePortaria;
  portaria_virtual_atendimento_app: PortariaVirtualApp;
  numero_blocos: number;
  numero_unidades?: number;
  interfonia: boolean;
  interfonia_descricao?: string;
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

// Sale Completed Form (Form 2)
export interface SaleCompletedForm {
  project_id: string;
  
  // Identificação
  vendedor_email: string;
  vendedor_nome: string;
  filial: string;
  nome_condominio: string;
  qtd_apartamentos: number;
  qtd_blocos: number;
  produto: string;
  
  // Infra / Central de Portaria
  acesso_local_central_portaria?: string;
  cabo_metros_qdg_ate_central?: number;
  internet_exclusiva?: string;
  obs_central_portaria_qdg?: string;
  
  // Telefonia / Interfonia
  transbordo_para_apartamentos?: string;
  local_central_interfonia_descricao?: string;
  
  // Acessos - Portas
  qtd_portas_pedestre?: number;
  qtd_portas_bloco?: number;
  qtd_saida_autenticada?: number;
  obs_portas?: string;
  
  // Acessos - Portões
  qtd_portoes_deslizantes?: number;
  qtd_portoes_pivotantes?: number;
  qtd_portoes_basculantes?: number;
  metodo_acionamento_portoes?: MetodoAcionamentoPortoes;
  
  // CFTV Aproveitado
  qtd_dvrs_aproveitados?: number;
  marca_modelo_dvr_aproveitado?: string;
  qtd_cameras_aproveitadas?: number;
  
  // CFTV Novo
  cftv_novo_qtd_dvr_4ch?: number;
  cftv_novo_qtd_dvr_8ch?: number;
  cftv_novo_qtd_dvr_16ch?: number;
  cftv_novo_qtd_total_cameras?: number;
  qtd_cameras_elevador?: number;
  acessos_tem_camera_int_ext?: boolean;
  
  // Observações gerais
  obs_gerais?: string;
  
  // Alarme
  alarme_tipo?: AlarmeTipo;
  
  // IVA
  iva_central_alarme_tipo?: CentralAlarmeTipo;
  iva_qtd_pares_existentes?: number;
  iva_qtd_novos?: number;
  iva_qtd_cabo_blindado?: string;
  
  // Cerca Elétrica
  cerca_central_alarme_tipo?: CentralAlarmeTipo;
  cerca_qtd_cabo_centenax?: number;
  cerca_local_central_choque?: string;
  cerca_metragem_linear_total?: number;
  cerca_qtd_fios?: number;
  
  // Controle de Acesso – Equipamentos
  possui_cancela?: boolean;
  possui_catraca?: boolean;
  possui_totem?: boolean;
  
  // Cancelas
  cancela_qtd_sentido_unico?: number;
  cancela_qtd_duplo_sentido?: number;
  cancela_aproveitada_detalhes?: string;
  cancela_autenticacao?: string;
  
  // Catracas
  catraca_qtd_sentido_unico?: number;
  catraca_qtd_duplo_sentido?: number;
  catraca_aproveitada_detalhes?: string;
  catraca_autenticacao?: string;
  
  // Totens
  totem_qtd_simples?: number;
  totem_qtd_duplo?: number;
  
  // Generated content
  checklist_implantacao?: Record<string, boolean>;
  resumo_tecnico_noc?: string;
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
  sale_form?: SaleCompletedForm;
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

export const ENGINEERING_STATUS_LABELS: Record<EngineeringStatus, string> = {
  EM_RECEBIMENTO: 'Em Recebimento',
  EM_PRODUCAO: 'Em Produção',
  RETORNAR: 'Retornar',
  CONCLUIDO: 'Concluído',
};

export const ENGINEERING_STATUS_DAYS: Record<EngineeringStatus, number> = {
  EM_RECEBIMENTO: 1,
  EM_PRODUCAO: 5,
  RETORNAR: 0,
  CONCLUIDO: 0,
};

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  NAO_INICIADO: 'Não Iniciado',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
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
  PLANTA_CROQUI_DEVOLUCAO: 'Planta/Croqui (Devolução)',
  LISTA_EQUIPAMENTOS: 'Lista de Equipamentos',
  LISTA_ATIVIDADES: 'Lista de Atividades',
  CENTRAL_PORTARIA_FOTOS: 'Fotos Central de Portaria',
  QDG_FOTO: 'Foto QDG',
  INTERFONIA_FOTO: 'Foto Interfonia',
  PORTAS_FOTOS: 'Fotos das Portas',
  PORTOES_FOTOS: 'Fotos dos Portões',
  CFTV_CENTRAL_FOTO: 'Foto Central CFTV',
  DVRS_FOTOS: 'Fotos dos DVRs',
  CAMERAS_INSTALADAS_FOTOS: 'Fotos Câmeras Instaladas',
  ALARME_CENTRAL_FOTO_IVA: 'Foto Central Alarme (IVA)',
  ALARME_CENTRAL_FOTO_CERCA: 'Foto Central Alarme (Cerca)',
  CHOQUE_FOTO: 'Foto Central de Choque',
  CERCA_FOTOS: 'Fotos da Cerca Elétrica',
  CANCELA_FOTOS: 'Fotos das Cancelas',
  CATRACA_FOTOS: 'Fotos das Catracas',
  TOTEM_FOTOS: 'Fotos dos Totens',
  CAMERAS_NOVAS_FOTOS: 'Fotos Câmeras Novas',
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

export const MODALIDADE_PORTARIA_LABELS: Record<ModalidadePortaria, string> = {
  VIRTUAL: 'Portaria Virtual',
  PRESENCIAL: 'Portaria Presencial',
  CA_MONITORADO: 'CA Monitorado',
  VIRTUAL_APOIO: 'Virtual + Apoio',
};

export const CFTV_ELEVADOR_LABELS: Record<CFTVElevador, string> = {
  POSSUI: 'Possui',
  NAO_POSSUI: 'Não possui',
  NAO_INFORMADO: 'Não informado',
};

export const METODO_ACIONAMENTO_LABELS: Record<MetodoAcionamentoPortoes, string> = {
  TAG_VEICULAR: 'Tag Veicular',
  CONTROLE: 'Controle',
  MULTIPLOS_ACIONAMENTOS: 'Múltiplos Acionamentos',
  FACIAL_PAREDE: 'Facial na Parede',
  FACIAL_TOTEM: 'Facial de Totem',
};

export const ALARME_TIPO_LABELS: Record<AlarmeTipo, string> = {
  IVA: 'IVA',
  CERCA_ELETRICA: 'Cerca Elétrica',
  NENHUM: 'Nenhum',
};
