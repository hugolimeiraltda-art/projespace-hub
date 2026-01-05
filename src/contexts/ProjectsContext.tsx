import React, { createContext, useContext, useState, ReactNode } from 'react';
import { 
  Project, 
  TapForm, 
  Attachment, 
  Comment, 
  StatusChange,
  ProjectStatus,
  ProjectWithDetails 
} from '@/types/project';

interface ProjectsContextType {
  projects: ProjectWithDetails[];
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>, tapForm: Omit<TapForm, 'project_id'>) => string;
  updateProject: (id: string, project: Partial<Project>, tapForm?: Partial<TapForm>) => void;
  getProject: (id: string) => ProjectWithDetails | undefined;
  addAttachment: (projectId: string, attachment: Omit<Attachment, 'id' | 'project_id' | 'created_at'>) => void;
  removeAttachment: (projectId: string, attachmentId: string) => void;
  addComment: (projectId: string, comment: Omit<Comment, 'id' | 'project_id' | 'created_at'>) => void;
  updateStatus: (projectId: string, newStatus: ProjectStatus, userId: string, userName: string) => void;
  getProjectsByUser: (userId: string) => ProjectWithDetails[];
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

// Generate mock data
const generateMockProjects = (): ProjectWithDetails[] => {
  return [
    {
      id: 'proj-001',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-16T14:30:00Z',
      created_by_user_id: '1',
      vendedor_nome: 'João Vendedor',
      vendedor_email: 'vendedor@empresa.com',
      cliente_condominio_nome: 'Residencial Sol Nascente',
      cliente_cidade: 'São Paulo',
      cliente_estado: 'SP',
      endereco_condominio: 'Rua das Flores, 123 - Jardim América',
      status: 'EM_ANALISE',
      prazo_entrega_projeto: '2024-02-15',
      data_assembleia: '2024-02-01',
      tap_form: {
        project_id: 'proj-001',
        solicitacao_origem: 'EMAIL',
        email_origem_texto: 'Solicitação recebida via email do síndico',
        portaria_virtual_atendimento_app: 'SIM_COM_TRANSBORDO',
        numero_blocos: 3,
        interfonia: true,
        controle_acessos_pedestre_descricao: 'Catracas com biometria na entrada principal',
        controle_acessos_veiculo_descricao: 'Cancela automática com TAG',
        alarme_descricao: 'Alarme perimetral com sensores de presença',
        cftv_dvr_descricao: 'DVR 16 canais com 12 câmeras instaladas',
        cftv_elevador_possui: 'POSSUI',
        observacao_nao_assumir_cameras: true,
        marcacao_croqui_confirmada: true,
        marcacao_croqui_itens: ['CAMERAS_EXISTENTES', 'CAMERAS_NOVAS', 'ALARME_PERIMETRAL'],
        info_custo: 'Orçamento inicial: R$ 45.000,00',
        info_cronograma: 'Prazo de instalação: 30 dias',
        info_adicionais: 'Cliente prefere instalação aos finais de semana',
      },
      attachments: [
        {
          id: 'att-001',
          project_id: 'proj-001',
          tipo: 'CROQUI',
          arquivo_url: '/placeholder.svg',
          nome_arquivo: 'croqui_sol_nascente.pdf',
          created_at: '2024-01-15T10:05:00Z',
        },
        {
          id: 'att-002',
          project_id: 'proj-001',
          tipo: 'PLANTA_BAIXA',
          arquivo_url: '/placeholder.svg',
          nome_arquivo: 'planta_baixa.pdf',
          created_at: '2024-01-15T10:06:00Z',
        },
      ],
      comments: [
        {
          id: 'com-001',
          project_id: 'proj-001',
          user_id: '2',
          user_name: 'Maria Projetos',
          content: 'Projeto recebido e em análise. Verificando compatibilidade dos equipamentos.',
          is_internal: true,
          created_at: '2024-01-16T09:00:00Z',
        },
      ],
      status_history: [
        {
          id: 'sh-001',
          project_id: 'proj-001',
          user_id: '1',
          user_name: 'João Vendedor',
          old_status: 'RASCUNHO',
          new_status: 'ENVIADO',
          created_at: '2024-01-15T10:30:00Z',
        },
        {
          id: 'sh-002',
          project_id: 'proj-001',
          user_id: '2',
          user_name: 'Maria Projetos',
          old_status: 'ENVIADO',
          new_status: 'EM_ANALISE',
          created_at: '2024-01-16T08:00:00Z',
        },
      ],
    },
    {
      id: 'proj-002',
      created_at: '2024-01-10T08:00:00Z',
      updated_at: '2024-01-18T11:00:00Z',
      created_by_user_id: '1',
      vendedor_nome: 'João Vendedor',
      vendedor_email: 'vendedor@empresa.com',
      cliente_condominio_nome: 'Edifício Torre Alta',
      cliente_cidade: 'Campinas',
      cliente_estado: 'SP',
      endereco_condominio: 'Av. Brasil, 500 - Centro',
      status: 'APROVADO_PROJETO',
      prazo_entrega_projeto: '2024-01-20',
      tap_form: {
        project_id: 'proj-002',
        solicitacao_origem: 'FORMS',
        portaria_virtual_atendimento_app: 'SIM_SEM_TRANSBORDO',
        numero_blocos: 1,
        interfonia: true,
        controle_acessos_pedestre_descricao: 'Portão com senha numérica',
        controle_acessos_veiculo_descricao: 'Controle remoto',
        cftv_dvr_descricao: 'Sistema novo a ser instalado',
        cftv_elevador_possui: 'NAO_POSSUI',
        observacao_nao_assumir_cameras: true,
        marcacao_croqui_confirmada: true,
        marcacao_croqui_itens: ['CAMERAS_NOVAS', 'PONTOS_CAMERAS'],
        info_cronograma: 'Urgente - cliente aguardando',
      },
      attachments: [
        {
          id: 'att-003',
          project_id: 'proj-002',
          tipo: 'CROQUI',
          arquivo_url: '/placeholder.svg',
          nome_arquivo: 'croqui_torre_alta.jpg',
          created_at: '2024-01-10T08:10:00Z',
        },
      ],
      comments: [],
      status_history: [
        {
          id: 'sh-003',
          project_id: 'proj-002',
          user_id: '2',
          user_name: 'Maria Projetos',
          old_status: 'EM_ANALISE',
          new_status: 'APROVADO_PROJETO',
          created_at: '2024-01-18T11:00:00Z',
        },
      ],
    },
    {
      id: 'proj-003',
      created_at: '2024-01-17T14:00:00Z',
      updated_at: '2024-01-17T14:00:00Z',
      created_by_user_id: '1',
      vendedor_nome: 'João Vendedor',
      vendedor_email: 'vendedor@empresa.com',
      cliente_condominio_nome: 'Condomínio Parque das Árvores',
      cliente_cidade: 'Santos',
      cliente_estado: 'SP',
      endereco_condominio: 'Rua da Praia, 789 - Gonzaga',
      status: 'RASCUNHO',
      tap_form: {
        project_id: 'proj-003',
        solicitacao_origem: 'EMAIL',
        portaria_virtual_atendimento_app: 'NAO',
        numero_blocos: 5,
        interfonia: false,
        cftv_elevador_possui: 'NAO_INFORMADO',
        observacao_nao_assumir_cameras: true,
        marcacao_croqui_confirmada: false,
        marcacao_croqui_itens: [],
      },
      attachments: [],
      comments: [],
      status_history: [],
    },
  ];
};

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectWithDetails[]>(() => {
    const saved = localStorage.getItem('portaria_projects');
    return saved ? JSON.parse(saved) : generateMockProjects();
  });

  const saveProjects = (newProjects: ProjectWithDetails[]) => {
    setProjects(newProjects);
    localStorage.setItem('portaria_projects', JSON.stringify(newProjects));
  };

  const addProject = (
    project: Omit<Project, 'id' | 'created_at' | 'updated_at'>, 
    tapForm: Omit<TapForm, 'project_id'>
  ): string => {
    const id = `proj-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newProject: ProjectWithDetails = {
      ...project,
      id,
      created_at: now,
      updated_at: now,
      tap_form: { ...tapForm, project_id: id },
      attachments: [],
      comments: [],
      status_history: [],
    };

    saveProjects([...projects, newProject]);
    return id;
  };

  const updateProject = (id: string, projectUpdate: Partial<Project>, tapFormUpdate?: Partial<TapForm>) => {
    const updated = projects.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...projectUpdate,
          updated_at: new Date().toISOString(),
          tap_form: tapFormUpdate ? { ...p.tap_form!, ...tapFormUpdate } : p.tap_form,
        };
      }
      return p;
    });
    saveProjects(updated);
  };

  const getProject = (id: string) => projects.find(p => p.id === id);

  const addAttachment = (projectId: string, attachment: Omit<Attachment, 'id' | 'project_id' | 'created_at'>) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          attachments: [
            ...p.attachments,
            {
              ...attachment,
              id: `att-${Date.now()}`,
              project_id: projectId,
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      return p;
    });
    saveProjects(updated);
  };

  const removeAttachment = (projectId: string, attachmentId: string) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          attachments: p.attachments.filter(a => a.id !== attachmentId),
        };
      }
      return p;
    });
    saveProjects(updated);
  };

  const addComment = (projectId: string, comment: Omit<Comment, 'id' | 'project_id' | 'created_at'>) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              ...comment,
              id: `com-${Date.now()}`,
              project_id: projectId,
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      return p;
    });
    saveProjects(updated);
  };

  const updateStatus = (projectId: string, newStatus: ProjectStatus, userId: string, userName: string) => {
    const updated = projects.map(p => {
      if (p.id === projectId) {
        const statusChange: StatusChange = {
          id: `sh-${Date.now()}`,
          project_id: projectId,
          user_id: userId,
          user_name: userName,
          old_status: p.status,
          new_status: newStatus,
          created_at: new Date().toISOString(),
        };
        return {
          ...p,
          status: newStatus,
          updated_at: new Date().toISOString(),
          status_history: [...p.status_history, statusChange],
        };
      }
      return p;
    });
    saveProjects(updated);
  };

  const getProjectsByUser = (userId: string) => {
    return projects.filter(p => p.created_by_user_id === userId);
  };

  return (
    <ProjectsContext.Provider value={{
      projects,
      addProject,
      updateProject,
      getProject,
      addAttachment,
      removeAttachment,
      addComment,
      updateStatus,
      getProjectsByUser,
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
