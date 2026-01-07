import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Project, 
  TapForm, 
  SaleCompletedForm,
  Attachment, 
  Comment, 
  StatusChange,
  ProjectStatus,
  EngineeringStatus,
  SaleStatus,
  ProjectWithDetails,
  Notification,
  AttachmentType,
  CroquiItem,
  SolicitacaoOrigem,
  PortariaVirtualApp,
  CFTVElevador,
  MetodoAcionamentoPortoes,
  AlarmeTipo,
  CentralAlarmeTipo
} from '@/types/project';

interface ProjectsContextType {
  projects: ProjectWithDetails[];
  isLoading: boolean;
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>, tapForm: Omit<TapForm, 'project_id'>) => Promise<string | null>;
  updateProject: (id: string, project: Partial<Project>, tapForm?: Partial<TapForm>) => Promise<boolean>;
  getProject: (id: string) => ProjectWithDetails | undefined;
  fetchProject: (id: string) => Promise<ProjectWithDetails | null>;
  addAttachment: (projectId: string, attachment: Omit<Attachment, 'id' | 'project_id' | 'created_at'>) => Promise<boolean>;
  removeAttachment: (projectId: string, attachmentId: string) => Promise<boolean>;
  addComment: (projectId: string, comment: Omit<Comment, 'id' | 'project_id' | 'created_at'>) => Promise<boolean>;
  updateStatus: (projectId: string, newStatus: ProjectStatus, userId: string, userName: string, reason?: string) => Promise<boolean>;
  updateEngineeringStatus: (projectId: string, newStatus: EngineeringStatus, userId: string, userName: string) => Promise<boolean>;
  getProjectsByUser: (userId: string) => ProjectWithDetails[];
  // Sale Form functions
  initSaleForm: (projectId: string) => Promise<boolean>;
  updateSaleForm: (projectId: string, saleForm: Partial<SaleCompletedForm>) => Promise<boolean>;
  submitSaleForm: (projectId: string) => Promise<boolean>;
  // Notification functions
  addNotification: (projectId: string, notification: Omit<Notification, 'id' | 'created_at'>) => Promise<boolean>;
  markNotificationRead: (projectId: string, notificationId: string) => Promise<boolean>;
  getUnreadNotifications: (userId: string) => Notification[];
  // Project completion
  markProjectCompleted: (projectId: string, userId: string, userName: string) => Promise<boolean>;
  // Delete project (admin only)
  deleteProject: (projectId: string) => Promise<boolean>;
  // Refresh
  refreshProjects: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

// Helper to map database attachment type to our type
const mapAttachmentType = (dbType: string): AttachmentType => {
  const typeMap: Record<string, AttachmentType> = {
    'CROQUI': 'CROQUI',
    'PLANTA_BAIXA': 'PLANTA_BAIXA',
    'CONTRATO': 'OUTROS',
    'FOTOS_LOCAL': 'IMAGENS',
    'ORCAMENTO': 'OUTROS',
    'DOCUMENTOS_COMPLEMENTARES': 'OUTROS',
    'OUTRO': 'OUTROS',
    'PLANTA_CROQUI_DEVOLUCAO': 'PLANTA_CROQUI_DEVOLUCAO',
    'LISTA_EQUIPAMENTOS': 'LISTA_EQUIPAMENTOS',
    'LISTA_ATIVIDADES': 'LISTA_ATIVIDADES',
  };
  return typeMap[dbType] || 'OUTROS';
};

// Helper to map our type to database type
const mapToDbAttachmentType = (type: AttachmentType): string => {
  const typeMap: Record<AttachmentType, string> = {
    'CROQUI': 'CROQUI',
    'PLANTA_BAIXA': 'PLANTA_BAIXA',
    'IMAGENS': 'FOTOS_LOCAL',
    'FOTOS_EQUIP_APROVEITADOS': 'FOTOS_LOCAL',
    'OUTROS': 'OUTRO',
    'PLANTA_CROQUI_DEVOLUCAO': 'PLANTA_CROQUI_DEVOLUCAO',
    'LISTA_EQUIPAMENTOS': 'LISTA_EQUIPAMENTOS',
    'LISTA_ATIVIDADES': 'LISTA_ATIVIDADES',
    'CENTRAL_PORTARIA_FOTOS': 'FOTOS_LOCAL',
    'QDG_FOTO': 'FOTOS_LOCAL',
    'INTERFONIA_FOTO': 'FOTOS_LOCAL',
    'PORTAS_FOTOS': 'FOTOS_LOCAL',
    'PORTOES_FOTOS': 'FOTOS_LOCAL',
    'CFTV_CENTRAL_FOTO': 'FOTOS_LOCAL',
    'DVRS_FOTOS': 'FOTOS_LOCAL',
    'CAMERAS_INSTALADAS_FOTOS': 'FOTOS_LOCAL',
    'ALARME_CENTRAL_FOTO_IVA': 'FOTOS_LOCAL',
    'ALARME_CENTRAL_FOTO_CERCA': 'FOTOS_LOCAL',
    'CHOQUE_FOTO': 'FOTOS_LOCAL',
    'CERCA_FOTOS': 'FOTOS_LOCAL',
    'CANCELA_FOTOS': 'FOTOS_LOCAL',
    'CATRACA_FOTOS': 'FOTOS_LOCAL',
    'TOTEM_FOTOS': 'FOTOS_LOCAL',
    'CAMERAS_NOVAS_FOTOS': 'FOTOS_LOCAL',
  };
  return typeMap[type] || 'OUTRO';
};

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        setProjects([]);
        setIsLoading(false);
        return;
      }

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        setIsLoading(false);
        return;
      }

      const projectIds = projectsData.map(p => p.id);

      // Fetch related data in parallel
      const [tapFormsRes, saleFormsRes, attachmentsRes, commentsRes, historyRes, notificationsRes] = await Promise.all([
        supabase.from('tap_forms').select('*').in('project_id', projectIds),
        supabase.from('sale_forms').select('*').in('project_id', projectIds),
        supabase.from('project_attachments').select('*').in('project_id', projectIds),
        supabase.from('project_comments').select('*').in('project_id', projectIds).order('created_at', { ascending: false }),
        supabase.from('project_status_history').select('*').in('project_id', projectIds).order('created_at', { ascending: false }),
        supabase.from('project_notifications').select('*').in('project_id', projectIds),
      ]);

      const tapFormsMap = new Map(tapFormsRes.data?.map(t => [t.project_id, t]) || []);
      const saleFormsMap = new Map(saleFormsRes.data?.map(s => [s.project_id, s]) || []);
      const attachmentsMap = new Map<string, Attachment[]>();
      const commentsMap = new Map<string, Comment[]>();
      const historyMap = new Map<string, StatusChange[]>();
      const notificationsMap = new Map<string, Notification[]>();

      attachmentsRes.data?.forEach(a => {
        const list = attachmentsMap.get(a.project_id) || [];
        list.push({
          id: a.id,
          project_id: a.project_id,
          tipo: mapAttachmentType(a.tipo),
          arquivo_url: a.arquivo_url,
          nome_arquivo: a.nome_arquivo,
          created_at: a.created_at,
        });
        attachmentsMap.set(a.project_id, list);
      });

      commentsRes.data?.forEach(c => {
        const list = commentsMap.get(c.project_id) || [];
        list.push({
          id: c.id,
          project_id: c.project_id,
          user_id: c.user_id,
          user_name: c.user_name,
          content: c.texto,
          is_internal: c.is_internal,
          created_at: c.created_at,
        });
        commentsMap.set(c.project_id, list);
      });

      historyRes.data?.forEach(h => {
        const list = historyMap.get(h.project_id) || [];
        list.push({
          id: h.id,
          project_id: h.project_id,
          user_id: h.changed_by_user_id,
          user_name: h.changed_by_user_name,
          old_status: h.from_status as ProjectStatus,
          new_status: h.to_status as ProjectStatus,
          created_at: h.created_at,
        });
        historyMap.set(h.project_id, list);
      });

      notificationsRes.data?.forEach(n => {
        const list = notificationsMap.get(n.project_id) || [];
        list.push({
          id: n.id,
          type: n.type as 'PROJECT_COMPLETED' | 'STATUS_CHANGED' | 'COMMENT_ADDED',
          message: n.message,
          read: n.read,
          created_at: n.created_at,
          project_id: n.project_id,
        });
        notificationsMap.set(n.project_id, list);
      });

      const fullProjects: ProjectWithDetails[] = projectsData.map(p => {
        const tapForm = tapFormsMap.get(p.id);
        const saleForm = saleFormsMap.get(p.id);
        return {
          id: p.id,
          numero_projeto: (p as Record<string, unknown>).numero_projeto as number | undefined,
          created_at: p.created_at,
          updated_at: p.updated_at,
          created_by_user_id: p.created_by_user_id,
          vendedor_nome: p.vendedor_nome,
          vendedor_email: p.vendedor_email,
          cliente_condominio_nome: p.cliente_condominio_nome,
          cliente_cidade: p.cliente_cidade || '',
          cliente_estado: p.cliente_estado || '',
          endereco_condominio: p.endereco_condominio || '',
          status: p.status as ProjectStatus,
          prazo_entrega_projeto: p.prazo_entrega_projeto || undefined,
          data_assembleia: p.data_assembleia || undefined,
          email_padrao_gerado: p.email_padrao_gerado || undefined,
          engineering_status: p.engineering_status as EngineeringStatus | undefined,
          engineering_received_at: p.engineering_received_at || undefined,
          engineering_production_at: p.engineering_production_at || undefined,
          engineering_completed_at: p.engineering_completed_at || undefined,
          laudo_projeto: (p as Record<string, unknown>).laudo_projeto as string | undefined,
          sale_status: (p.sale_status as SaleStatus) || 'NAO_INICIADO',
          dados_originais_pre_reenvio: (p as Record<string, unknown>).dados_originais_pre_reenvio as Record<string, unknown> | undefined,
          notifications: notificationsMap.get(p.id) || [],
          tap_form: tapForm ? {
            project_id: tapForm.project_id,
            solicitacao_origem: (tapForm.solicitacao_origem || 'EMAIL') as SolicitacaoOrigem,
            email_origem_texto: tapForm.email_origem_texto || undefined,
            portaria_virtual_atendimento_app: (tapForm.portaria_virtual_atendimento_app || 'NAO') as PortariaVirtualApp,
            numero_blocos: tapForm.numero_blocos || 0,
            interfonia: tapForm.interfonia || false,
            controle_acessos_pedestre_descricao: tapForm.controle_acessos_pedestre_descricao || undefined,
            controle_acessos_veiculo_descricao: tapForm.controle_acessos_veiculo_descricao || undefined,
            alarme_descricao: tapForm.alarme_descricao || undefined,
            cftv_dvr_descricao: tapForm.cftv_dvr_descricao || undefined,
            cftv_elevador_possui: (tapForm.cftv_elevador_possui || 'NAO_INFORMADO') as CFTVElevador,
            observacao_nao_assumir_cameras: tapForm.observacao_nao_assumir_cameras || false,
            marcacao_croqui_confirmada: tapForm.marcacao_croqui_confirmada || false,
            marcacao_croqui_itens: (tapForm.marcacao_croqui_itens as CroquiItem[]) || [],
            info_custo: tapForm.info_custo || undefined,
            info_cronograma: tapForm.info_cronograma || undefined,
            info_adicionais: tapForm.info_adicionais || undefined,
          } : undefined,
          sale_form: saleForm ? {
            project_id: saleForm.project_id,
            vendedor_email: saleForm.vendedor_email || '',
            vendedor_nome: saleForm.vendedor_nome || '',
            filial: saleForm.filial || '',
            nome_condominio: saleForm.nome_condominio || '',
            qtd_apartamentos: saleForm.qtd_apartamentos || 0,
            qtd_blocos: saleForm.qtd_blocos || 0,
            produto: saleForm.produto || 'Portaria Digital',
            acesso_local_central_portaria: saleForm.acesso_local_central_portaria || undefined,
            cabo_metros_qdg_ate_central: saleForm.cabo_metros_qdg_ate_central || undefined,
            internet_exclusiva: saleForm.internet_exclusiva || undefined,
            obs_central_portaria_qdg: saleForm.obs_central_portaria_qdg || undefined,
            transbordo_para_apartamentos: saleForm.transbordo_para_apartamentos || undefined,
            local_central_interfonia_descricao: saleForm.local_central_interfonia_descricao || undefined,
            qtd_portas_pedestre: saleForm.qtd_portas_pedestre || undefined,
            qtd_portas_bloco: saleForm.qtd_portas_bloco || undefined,
            qtd_saida_autenticada: saleForm.qtd_saida_autenticada || undefined,
            obs_portas: saleForm.obs_portas || undefined,
            qtd_portoes_deslizantes: saleForm.qtd_portoes_deslizantes || undefined,
            qtd_portoes_pivotantes: saleForm.qtd_portoes_pivotantes || undefined,
            qtd_portoes_basculantes: saleForm.qtd_portoes_basculantes || undefined,
            metodo_acionamento_portoes: saleForm.metodo_acionamento_portoes as MetodoAcionamentoPortoes || undefined,
            qtd_dvrs_aproveitados: saleForm.qtd_dvrs_aproveitados || undefined,
            marca_modelo_dvr_aproveitado: saleForm.marca_modelo_dvr_aproveitado || undefined,
            qtd_cameras_aproveitadas: saleForm.qtd_cameras_aproveitadas || undefined,
            cftv_novo_qtd_dvr_4ch: saleForm.cftv_novo_qtd_dvr_4ch || undefined,
            cftv_novo_qtd_dvr_8ch: saleForm.cftv_novo_qtd_dvr_8ch || undefined,
            cftv_novo_qtd_dvr_16ch: saleForm.cftv_novo_qtd_dvr_16ch || undefined,
            cftv_novo_qtd_total_cameras: saleForm.cftv_novo_qtd_total_cameras || undefined,
            qtd_cameras_elevador: saleForm.qtd_cameras_elevador || undefined,
            acessos_tem_camera_int_ext: saleForm.acessos_tem_camera_int_ext || undefined,
            obs_gerais: saleForm.obs_gerais || undefined,
            alarme_tipo: saleForm.alarme_tipo as AlarmeTipo || undefined,
            iva_central_alarme_tipo: saleForm.iva_central_alarme_tipo as CentralAlarmeTipo || undefined,
            iva_qtd_pares_existentes: saleForm.iva_qtd_pares_existentes || undefined,
            iva_qtd_novos: saleForm.iva_qtd_novos || undefined,
            iva_qtd_cabo_blindado: saleForm.iva_qtd_cabo_blindado || undefined,
            cerca_central_alarme_tipo: saleForm.cerca_central_alarme_tipo as CentralAlarmeTipo || undefined,
            cerca_qtd_cabo_centenax: saleForm.cerca_qtd_cabo_centenax || undefined,
            cerca_local_central_choque: saleForm.cerca_local_central_choque || undefined,
            cerca_metragem_linear_total: saleForm.cerca_metragem_linear_total || undefined,
            cerca_qtd_fios: saleForm.cerca_qtd_fios || undefined,
            possui_cancela: saleForm.possui_cancela || undefined,
            possui_catraca: saleForm.possui_catraca || undefined,
            possui_totem: saleForm.possui_totem || undefined,
            cancela_qtd_sentido_unico: saleForm.cancela_qtd_sentido_unico || undefined,
            cancela_qtd_duplo_sentido: saleForm.cancela_qtd_duplo_sentido || undefined,
            cancela_aproveitada_detalhes: saleForm.cancela_aproveitada_detalhes || undefined,
            cancela_autenticacao: saleForm.cancela_autenticacao || undefined,
            catraca_qtd_sentido_unico: saleForm.catraca_qtd_sentido_unico || undefined,
            catraca_qtd_duplo_sentido: saleForm.catraca_qtd_duplo_sentido || undefined,
            catraca_aproveitada_detalhes: saleForm.catraca_aproveitada_detalhes || undefined,
            catraca_autenticacao: saleForm.catraca_autenticacao || undefined,
            totem_qtd_simples: saleForm.totem_qtd_simples || undefined,
            totem_qtd_duplo: saleForm.totem_qtd_duplo || undefined,
            checklist_implantacao: saleForm.checklist_implantacao as Record<string, boolean> || undefined,
            resumo_tecnico_noc: saleForm.resumo_tecnico_noc || undefined,
          } : undefined,
          attachments: attachmentsMap.get(p.id) || [],
          comments: commentsMap.get(p.id) || [],
          status_history: historyMap.get(p.id) || [],
        };
      });

      setProjects(fullProjects);
    } catch (error) {
      console.error('Error in fetchProjects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const refreshProjects = async () => {
    await fetchProjects();
  };

  const addProject = async (
    project: Omit<Project, 'id' | 'created_at' | 'updated_at'>, 
    tapForm: Omit<TapForm, 'project_id'>
  ): Promise<string | null> => {
    try {
      // Insert project
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          created_by_user_id: project.created_by_user_id,
          vendedor_nome: project.vendedor_nome,
          vendedor_email: project.vendedor_email,
          cliente_condominio_nome: project.cliente_condominio_nome,
          cliente_cidade: project.cliente_cidade || null,
          cliente_estado: project.cliente_estado || null,
          endereco_condominio: project.endereco_condominio || null,
          status: project.status,
          prazo_entrega_projeto: project.prazo_entrega_projeto || null,
          data_assembleia: project.data_assembleia || null,
          email_padrao_gerado: project.email_padrao_gerado || null,
          engineering_status: project.status === 'ENVIADO' ? 'EM_RECEBIMENTO' : null,
          engineering_received_at: project.status === 'ENVIADO' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (projectError || !newProject) {
        console.error('Error creating project:', projectError);
        return null;
      }

      // Insert TAP form
      const { error: tapError } = await supabase
        .from('tap_forms')
        .insert({
          project_id: newProject.id,
          solicitacao_origem: tapForm.solicitacao_origem || null,
          email_origem_texto: tapForm.email_origem_texto || null,
          portaria_virtual_atendimento_app: tapForm.portaria_virtual_atendimento_app || null,
          numero_blocos: tapForm.numero_blocos || null,
          interfonia: tapForm.interfonia || false,
          controle_acessos_pedestre_descricao: tapForm.controle_acessos_pedestre_descricao || null,
          controle_acessos_veiculo_descricao: tapForm.controle_acessos_veiculo_descricao || null,
          alarme_descricao: tapForm.alarme_descricao || null,
          cftv_dvr_descricao: tapForm.cftv_dvr_descricao || null,
          cftv_elevador_possui: tapForm.cftv_elevador_possui || null,
          observacao_nao_assumir_cameras: tapForm.observacao_nao_assumir_cameras || false,
          marcacao_croqui_confirmada: tapForm.marcacao_croqui_confirmada || false,
          marcacao_croqui_itens: tapForm.marcacao_croqui_itens || [],
          info_custo: tapForm.info_custo || null,
          info_cronograma: tapForm.info_cronograma || null,
          info_adicionais: tapForm.info_adicionais || null,
        });

      if (tapError) {
        console.error('Error creating TAP form:', tapError);
      }

      // If project is being sent (not draft), notify project team
      if (project.status === 'ENVIADO') {
        try {
          await supabase.functions.invoke('notify-project-submitted', {
            body: {
              projectId: newProject.id,
              projectName: project.cliente_condominio_nome,
              vendedorNome: project.vendedor_nome,
              vendedorEmail: project.vendedor_email,
              cidade: project.cliente_cidade,
              estado: project.cliente_estado,
            },
          });
        } catch (notifyError) {
          console.error('Error notifying project team:', notifyError);
          // Don't fail the project creation if notification fails
        }
      }

      // Refresh projects list
      await fetchProjects();

      return newProject.id;
    } catch (error) {
      console.error('Error in addProject:', error);
      return null;
    }
  };

  const updateProject = async (id: string, projectUpdate: Partial<Project>, tapFormUpdate?: Partial<TapForm>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (projectUpdate.cliente_condominio_nome !== undefined) updateData.cliente_condominio_nome = projectUpdate.cliente_condominio_nome;
      if (projectUpdate.cliente_cidade !== undefined) updateData.cliente_cidade = projectUpdate.cliente_cidade;
      if (projectUpdate.cliente_estado !== undefined) updateData.cliente_estado = projectUpdate.cliente_estado;
      if (projectUpdate.endereco_condominio !== undefined) updateData.endereco_condominio = projectUpdate.endereco_condominio;
      if (projectUpdate.status !== undefined) updateData.status = projectUpdate.status;
      if (projectUpdate.prazo_entrega_projeto !== undefined) updateData.prazo_entrega_projeto = projectUpdate.prazo_entrega_projeto;
      if (projectUpdate.data_assembleia !== undefined) updateData.data_assembleia = projectUpdate.data_assembleia;
      if (projectUpdate.email_padrao_gerado !== undefined) updateData.email_padrao_gerado = projectUpdate.email_padrao_gerado;
      if (projectUpdate.engineering_status !== undefined) updateData.engineering_status = projectUpdate.engineering_status;
      if (projectUpdate.engineering_received_at !== undefined) updateData.engineering_received_at = projectUpdate.engineering_received_at;
      if (projectUpdate.engineering_production_at !== undefined) updateData.engineering_production_at = projectUpdate.engineering_production_at;
      if (projectUpdate.engineering_completed_at !== undefined) updateData.engineering_completed_at = projectUpdate.engineering_completed_at;
      if (projectUpdate.laudo_projeto !== undefined) updateData.laudo_projeto = projectUpdate.laudo_projeto;
      if (projectUpdate.sale_status !== undefined) updateData.sale_status = projectUpdate.sale_status;

      if (Object.keys(updateData).length > 0) {
        const { error: projectError } = await supabase
          .from('projects')
          .update(updateData)
          .eq('id', id);

        if (projectError) {
          console.error('Error updating project:', projectError);
          return false;
        }
      }

      if (tapFormUpdate) {
        const tapUpdateData: Record<string, unknown> = {};
        
        if (tapFormUpdate.solicitacao_origem !== undefined) tapUpdateData.solicitacao_origem = tapFormUpdate.solicitacao_origem;
        if (tapFormUpdate.email_origem_texto !== undefined) tapUpdateData.email_origem_texto = tapFormUpdate.email_origem_texto;
        if (tapFormUpdate.portaria_virtual_atendimento_app !== undefined) tapUpdateData.portaria_virtual_atendimento_app = tapFormUpdate.portaria_virtual_atendimento_app;
        if (tapFormUpdate.numero_blocos !== undefined) tapUpdateData.numero_blocos = tapFormUpdate.numero_blocos;
        if (tapFormUpdate.interfonia !== undefined) tapUpdateData.interfonia = tapFormUpdate.interfonia;
        if (tapFormUpdate.controle_acessos_pedestre_descricao !== undefined) tapUpdateData.controle_acessos_pedestre_descricao = tapFormUpdate.controle_acessos_pedestre_descricao;
        if (tapFormUpdate.controle_acessos_veiculo_descricao !== undefined) tapUpdateData.controle_acessos_veiculo_descricao = tapFormUpdate.controle_acessos_veiculo_descricao;
        if (tapFormUpdate.alarme_descricao !== undefined) tapUpdateData.alarme_descricao = tapFormUpdate.alarme_descricao;
        if (tapFormUpdate.cftv_dvr_descricao !== undefined) tapUpdateData.cftv_dvr_descricao = tapFormUpdate.cftv_dvr_descricao;
        if (tapFormUpdate.cftv_elevador_possui !== undefined) tapUpdateData.cftv_elevador_possui = tapFormUpdate.cftv_elevador_possui;
        if (tapFormUpdate.observacao_nao_assumir_cameras !== undefined) tapUpdateData.observacao_nao_assumir_cameras = tapFormUpdate.observacao_nao_assumir_cameras;
        if (tapFormUpdate.marcacao_croqui_confirmada !== undefined) tapUpdateData.marcacao_croqui_confirmada = tapFormUpdate.marcacao_croqui_confirmada;
        if (tapFormUpdate.marcacao_croqui_itens !== undefined) tapUpdateData.marcacao_croqui_itens = tapFormUpdate.marcacao_croqui_itens;
        if (tapFormUpdate.info_custo !== undefined) tapUpdateData.info_custo = tapFormUpdate.info_custo;
        if (tapFormUpdate.info_cronograma !== undefined) tapUpdateData.info_cronograma = tapFormUpdate.info_cronograma;
        if (tapFormUpdate.info_adicionais !== undefined) tapUpdateData.info_adicionais = tapFormUpdate.info_adicionais;

        if (Object.keys(tapUpdateData).length > 0) {
          const { error: tapError } = await supabase
            .from('tap_forms')
            .update(tapUpdateData)
            .eq('project_id', id);

          if (tapError) {
            console.error('Error updating TAP form:', tapError);
          }
        }
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in updateProject:', error);
      return false;
    }
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  const fetchProject = async (id: string): Promise<ProjectWithDetails | null> => {
    // First try from cache
    const cached = projects.find(p => p.id === id);
    if (cached) return cached;

    // Fetch from database
    await fetchProjects();
    return projects.find(p => p.id === id) || null;
  };

  const addAttachment = async (projectId: string, attachment: Omit<Attachment, 'id' | 'project_id' | 'created_at'>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_attachments')
        .insert({
          project_id: projectId,
          tipo: mapToDbAttachmentType(attachment.tipo) as "CROQUI" | "PLANTA_BAIXA" | "CONTRATO" | "FOTOS_LOCAL" | "ORCAMENTO" | "DOCUMENTOS_COMPLEMENTARES" | "OUTRO",
          arquivo_url: attachment.arquivo_url,
          nome_arquivo: attachment.nome_arquivo,
        });

      if (error) {
        console.error('Error adding attachment:', error);
        return false;
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in addAttachment:', error);
      return false;
    }
  };

  const removeAttachment = async (projectId: string, attachmentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_attachments')
        .delete()
        .eq('id', attachmentId)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error removing attachment:', error);
        return false;
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in removeAttachment:', error);
      return false;
    }
  };

  const addComment = async (projectId: string, comment: Omit<Comment, 'id' | 'project_id' | 'created_at'>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_comments')
        .insert({
          project_id: projectId,
          user_id: comment.user_id,
          user_name: comment.user_name,
          user_role: user?.role || 'vendedor',
          texto: comment.content,
          is_internal: comment.is_internal,
        });

      if (error) {
        console.error('Error adding comment:', error);
        return false;
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in addComment:', error);
      return false;
    }
  };

  const updateStatus = async (projectId: string, newStatus: ProjectStatus, userId: string, userName: string, reason?: string): Promise<boolean> => {
    try {
      const project = projects.find(p => p.id === projectId);
      const oldStatus = project?.status;

      // Update project status
      const updateData: Record<string, unknown> = { status: newStatus };
      
      // Set engineering status when project is sent
      if (newStatus === 'ENVIADO' && !project?.engineering_status) {
        updateData.engineering_status = 'EM_RECEBIMENTO';
        updateData.engineering_received_at = new Date().toISOString();
      }

      // When marking as PENDENTE_INFO, save current data for comparison later
      if (newStatus === 'PENDENTE_INFO' && project) {
        const originalData = {
          cliente_condominio_nome: project.cliente_condominio_nome,
          cliente_cidade: project.cliente_cidade,
          cliente_estado: project.cliente_estado,
          endereco_condominio: project.endereco_condominio,
          prazo_entrega_projeto: project.prazo_entrega_projeto,
          data_assembleia: project.data_assembleia,
          tap_form: project.tap_form ? {
            portaria_virtual_atendimento_app: project.tap_form.portaria_virtual_atendimento_app,
            numero_blocos: project.tap_form.numero_blocos,
            interfonia: project.tap_form.interfonia,
            controle_acessos_pedestre_descricao: project.tap_form.controle_acessos_pedestre_descricao,
            controle_acessos_veiculo_descricao: project.tap_form.controle_acessos_veiculo_descricao,
            alarme_descricao: project.tap_form.alarme_descricao,
            cftv_dvr_descricao: project.tap_form.cftv_dvr_descricao,
            cftv_elevador_possui: project.tap_form.cftv_elevador_possui,
            marcacao_croqui_confirmada: project.tap_form.marcacao_croqui_confirmada,
            info_custo: project.tap_form.info_custo,
            info_cronograma: project.tap_form.info_cronograma,
            info_adicionais: project.tap_form.info_adicionais,
          } : null,
        };
        updateData.dados_originais_pre_reenvio = originalData;
      }

      // Clear original data when project is approved or analyzed
      if (['EM_ANALISE', 'APROVADO_PROJETO'].includes(newStatus)) {
        updateData.dados_originais_pre_reenvio = null;
      }

      const { error: projectError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (projectError) {
        console.error('Error updating status:', projectError);
        return false;
      }

      // Add status history
      const { error: historyError } = await supabase
        .from('project_status_history')
        .insert({
          project_id: projectId,
          from_status: oldStatus || null,
          to_status: newStatus,
          changed_by_user_id: userId,
          changed_by_user_name: userName,
          reason: reason || null,
        });

      if (historyError) {
        console.error('Error adding status history:', historyError);
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in updateStatus:', error);
      return false;
    }
  };

  const updateEngineeringStatus = async (projectId: string, newStatus: EngineeringStatus, userId: string, userName: string): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { engineering_status: newStatus };

      if (newStatus === 'EM_PRODUCAO') {
        updateData.engineering_production_at = new Date().toISOString();
      } else if (newStatus === 'CONCLUIDO') {
        updateData.engineering_completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);

      if (error) {
        console.error('Error updating engineering status:', error);
        return false;
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in updateEngineeringStatus:', error);
      return false;
    }
  };

  const getProjectsByUser = (userId: string) => {
    return projects.filter(p => p.created_by_user_id === userId);
  };

  const initSaleForm = async (projectId: string): Promise<boolean> => {
    try {
      // Check if sale_form already exists
      const { data: existingForm } = await supabase
        .from('sale_forms')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (!existingForm) {
        // Get project data to pre-fill the form
        const project = projects.find(p => p.id === projectId);
        
        // Fetch vendedor's filial from their profile
        let vendedorFilial = '';
        if (project?.created_by_user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('filial')
            .eq('id', project.created_by_user_id)
            .maybeSingle();
          vendedorFilial = profile?.filial || '';
        }
        
        // Create sale form with pre-filled data
        const { error: insertError } = await supabase
          .from('sale_forms')
          .insert({
            project_id: projectId,
            nome_condominio: project?.cliente_condominio_nome || '',
            vendedor_nome: project?.vendedor_nome || '',
            vendedor_email: project?.vendedor_email || '',
            qtd_blocos: project?.tap_form?.numero_blocos || null,
            produto: 'Portaria Digital',
            filial: vendedorFilial,
          });

        if (insertError) {
          console.error('Error creating sale form:', insertError);
          return false;
        }
      }

      // Update project sale_status
      const { error } = await supabase
        .from('projects')
        .update({ sale_status: 'EM_ANDAMENTO' })
        .eq('id', projectId);

      if (error) {
        console.error('Error initializing sale form:', error);
        return false;
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in initSaleForm:', error);
      return false;
    }
  };

  const updateSaleForm = async (projectId: string, saleForm: Partial<SaleCompletedForm>): Promise<boolean> => {
    try {
      // Remove project_id from the update data if present
      const { project_id: _, ...updateData } = saleForm as Record<string, unknown>;
      
      // Check if sale_form exists
      const { data: existingForm } = await supabase
        .from('sale_forms')
        .select('id')
        .eq('project_id', projectId)
        .maybeSingle();

      if (existingForm) {
        // Update existing form
        const { error } = await supabase
          .from('sale_forms')
          .update(updateData)
          .eq('project_id', projectId);

        if (error) {
          console.error('Error updating sale form:', error);
          return false;
        }
      } else {
        // Create new form with the data
        const { error } = await supabase
          .from('sale_forms')
          .insert({
            project_id: projectId,
            ...updateData,
          });

        if (error) {
          console.error('Error creating sale form:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in updateSaleForm:', error);
      return false;
    }
  };

  const submitSaleForm = async (projectId: string): Promise<boolean> => {
    try {
      // Get project info for notification message
      const project = projects.find(p => p.id === projectId);
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          sale_status: 'CONCLUIDO',
          implantacao_status: 'A_EXECUTAR'
        })
        .eq('id', projectId);

      if (error) {
        console.error('Error submitting sale form:', error);
        return false;
      }

      // Create notification for implantacao role
      if (project) {
        await supabase
          .from('project_notifications')
          .insert({
            project_id: projectId,
            type: 'SALE_COMPLETED',
            title: 'Nova Venda Concluída',
            message: `O projeto "${project.cliente_condominio_nome}" foi enviado para implantação.`,
            read: false,
            for_role: 'implantacao',
          });
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in submitSaleForm:', error);
      return false;
    }
  };

  const addNotification = async (projectId: string, notification: Omit<Notification, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_notifications')
        .insert({
          project_id: projectId,
          type: notification.type,
          title: notification.type,
          message: notification.message,
          read: false,
        });

      if (error) {
        console.error('Error adding notification:', error);
        return false;
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in addNotification:', error);
      return false;
    }
  };

  const markNotificationRead = async (projectId: string, notificationId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification read:', error);
        return false;
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in markNotificationRead:', error);
      return false;
    }
  };

  const getUnreadNotifications = (userId: string): Notification[] => {
    const allNotifications: Notification[] = [];
    projects.forEach(p => {
      p.notifications?.forEach(n => {
        if (!n.read) {
          allNotifications.push(n);
        }
      });
    });
    return allNotifications;
  };

  const markProjectCompleted = async (projectId: string, userId: string, userName: string): Promise<boolean> => {
    try {
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          engineering_status: 'CONCLUIDO',
          engineering_completed_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (projectError) {
        console.error('Error marking project completed:', projectError);
        return false;
      }

      // Add notification
      await addNotification(projectId, {
        type: 'PROJECT_COMPLETED',
        message: `Projeto marcado como concluído por ${userName}`,
        read: false,
        project_id: projectId,
      });

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in markProjectCompleted:', error);
      return false;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        return false;
      }

      await fetchProjects();
      return true;
    } catch (error) {
      console.error('Error in deleteProject:', error);
      return false;
    }
  };

  return (
    <ProjectsContext.Provider value={{
      projects,
      isLoading,
      addProject,
      updateProject,
      getProject,
      fetchProject,
      addAttachment,
      removeAttachment,
      addComment,
      updateStatus,
      updateEngineeringStatus,
      getProjectsByUser,
      initSaleForm,
      updateSaleForm,
      submitSaleForm,
      addNotification,
      markNotificationRead,
      getUnreadNotifications,
      markProjectCompleted,
      deleteProject,
      refreshProjects,
    }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
