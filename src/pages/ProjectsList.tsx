import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Filter, 
  Building, 
  Calendar,
  User,
  MapPin,
  FolderPlus,
  X,
  Rocket,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  ArrowRight,
  ClipboardList,
  ChevronDown,
  Hash,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ProjetosRelatorios } from '@/components/ProjetosRelatorios';
import { ProjectStatus, STATUS_LABELS, ENGINEERING_STATUS_LABELS, EngineeringStatus } from '@/types/project';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImplantacaoProject {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  implantacao_status: 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO' | null;
  implantacao_started_at: string | null;
}

const IMPLANTACAO_STATUS_LABELS: Record<string, string> = {
  A_EXECUTAR: 'A Executar',
  EM_EXECUCAO: 'Em Execução',
  CONCLUIDO_IMPLANTACAO: 'Concluído',
};

const IMPLANTACAO_STATUS_COLORS: Record<string, string> = {
  A_EXECUTAR: 'bg-amber-100 text-amber-800 border-amber-300',
  EM_EXECUCAO: 'bg-blue-100 text-blue-800 border-blue-300',
  CONCLUIDO_IMPLANTACAO: 'bg-green-100 text-green-800 border-green-300',
};

export default function ProjectsList() {
  const { user } = useAuth();
  const { projects, getProjectsByUser } = useProjects();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>(
    (searchParams.get('status') as ProjectStatus) || 'ALL'
  );
  const [cidadeFilter, setCidadeFilter] = useState('');
  const [implantacaoProjects, setImplantacaoProjects] = useState<ImplantacaoProject[]>([]);
  const [implantacaoEtapas, setImplantacaoEtapas] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'projetos');

  // Chamados filters
  const [chamadosSearch, setChamadosSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);
  const [selectedEngineeringStatuses, setSelectedEngineeringStatuses] = useState<EngineeringStatus[]>([]);
  
  // Chamados sorting
  type SortField = 'created_at' | 'prazo_entrega_projeto' | 'cliente_condominio_nome' | 'vendedor_nome' | 'cliente_cidade' | 'cliente_estado';
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const baseProjects = user?.role === 'vendedor' 
    ? getProjectsByUser(user.id) 
    : projects;

  // Check if user can see Chamados tab (only projetos and admin)
  const canSeeChamados = ['admin', 'projetos'].includes(user?.role || '');
  const canSeeRelatorios = user?.role === 'admin';

  // Fetch projects in implantação
  useEffect(() => {
    const fetchImplantacaoProjects = async () => {
      if (!user) return;

      try {
        let query = supabase
          .from('projects')
          .select('id, numero_projeto, cliente_condominio_nome, implantacao_status, implantacao_started_at')
          .eq('sale_status', 'CONCLUIDO');

        if (user.role === 'vendedor') {
          query = query.eq('created_by_user_id', user.id);
        }

        const { data: projectsData, error: projectsError } = await query;

        if (projectsError) {
          console.error('Error fetching implantação projects:', projectsError);
          return;
        }

        if (projectsData && projectsData.length > 0) {
          setImplantacaoProjects(projectsData);

          const projectIds = projectsData.map(p => p.id);
          const { data: etapasData, error: etapasError } = await supabase
            .from('implantacao_etapas')
            .select('project_id, contrato_assinado, contrato_cadastrado, ligacao_boas_vindas, cadastro_gear, sindico_app, conferencia_tags, check_projeto, agendamento_visita_startup, laudo_visita_startup, laudo_instalador, laudo_vidraceiro, laudo_serralheiro, laudo_conclusao_supervisor, check_programacao, confirmacao_ativacao_financeira, agendamento_visita_comercial, laudo_visita_comercial, concluido')
            .in('project_id', projectIds);

          if (!etapasError && etapasData) {
            const etapasMap: Record<string, number> = {};
            etapasData.forEach(etapa => {
              let completed = 0;
              if (etapa.contrato_assinado) completed++;
              if (etapa.contrato_cadastrado) completed++;
              if (etapa.ligacao_boas_vindas && etapa.cadastro_gear && etapa.sindico_app && etapa.conferencia_tags) completed++;
              if (etapa.check_projeto && etapa.agendamento_visita_startup && etapa.laudo_visita_startup) completed++;
              if (etapa.laudo_instalador && etapa.laudo_vidraceiro && etapa.laudo_serralheiro && etapa.laudo_conclusao_supervisor) completed++;
              if (etapa.check_programacao && etapa.confirmacao_ativacao_financeira) completed++;
              if (etapa.agendamento_visita_comercial && etapa.laudo_visita_comercial) completed++;
              if (etapa.laudo_visita_comercial) completed++;
              if (etapa.concluido) completed++;
              
              etapasMap[etapa.project_id] = completed;
            });
            setImplantacaoEtapas(etapasMap);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchImplantacaoProjects();
  }, [user]);

  // Stats
  const stats = {
    total: baseProjects.length,
    rascunho: baseProjects.filter(p => p.status === 'RASCUNHO').length,
    emAnalise: baseProjects.filter(p => ['ENVIADO', 'EM_ANALISE'].includes(p.status)).length,
    pendente: baseProjects.filter(p => p.status === 'PENDENTE_INFO').length,
    aprovado: baseProjects.filter(p => p.status === 'APROVADO_PROJETO').length,
  };

  // Get unique cities for filter (filter out null/undefined/empty values)
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(baseProjects.map(p => p.cliente_cidade).filter(Boolean))];
    return uniqueCities.sort();
  }, [baseProjects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return baseProjects.filter(project => {
      // Search
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          project.cliente_condominio_nome.toLowerCase().includes(searchLower) ||
          project.cliente_cidade.toLowerCase().includes(searchLower) ||
          project.vendedor_nome.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && project.status !== statusFilter) {
        return false;
      }

      // City filter
      if (cidadeFilter && project.cliente_cidade !== cidadeFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [baseProjects, search, statusFilter, cidadeFilter]);

  // Chamados (only active projects - exclude drafts, cancelled, and completed)
  const chamados = useMemo(() => projects.filter(p => 
    p.status !== 'RASCUNHO' && 
    p.status !== 'CANCELADO' && 
    p.engineering_status !== 'CONCLUIDO'
  ), [projects]);

  const filteredChamados = useMemo(() => {
    const filtered = chamados.filter(p => {
      const matchesSearch = 
        p.cliente_condominio_nome.toLowerCase().includes(chamadosSearch.toLowerCase()) ||
        p.vendedor_nome.toLowerCase().includes(chamadosSearch.toLowerCase()) ||
        p.cliente_cidade.toLowerCase().includes(chamadosSearch.toLowerCase());
      
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(p.status);
      const matchesEngineering = selectedEngineeringStatuses.length === 0 || 
        (p.engineering_status && selectedEngineeringStatuses.includes(p.engineering_status));

      return matchesSearch && matchesStatus && matchesEngineering;
    });

    return filtered.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      
      if (sortField === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (sortField === 'prazo_entrega_projeto') {
        valA = a.prazo_entrega_projeto ? new Date(a.prazo_entrega_projeto).getTime() : 0;
        valB = b.prazo_entrega_projeto ? new Date(b.prazo_entrega_projeto).getTime() : 0;
      } else {
        valA = (a[sortField] || '').toLowerCase();
        valB = (b[sortField] || '').toLowerCase();
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [chamados, chamadosSearch, selectedStatuses, selectedEngineeringStatuses, sortField, sortDir]);

  // Chamados stats
  const chamadosStats = {
    total: chamados.length,
    emRecebimento: chamados.filter(p => p.engineering_status === 'EM_RECEBIMENTO').length,
    emProducao: chamados.filter(p => p.engineering_status === 'EM_PRODUCAO').length,
    concluidos: chamados.filter(p => p.engineering_status === 'CONCLUIDO').length,
  };

  const toggleStatus = (status: ProjectStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const toggleEngineeringStatus = (status: EngineeringStatus) => {
    setSelectedEngineeringStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />;
    return sortDir === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> 
      : <ArrowDown className="w-3.5 h-3.5 text-primary" />;
  };

  const getEngineeringStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const colors: Record<string, string> = {
      'EM_RECEBIMENTO': 'bg-status-sent-bg text-status-sent',
      'EM_PRODUCAO': 'bg-status-analysis-bg text-status-analysis',
      'CONCLUIDO': 'bg-status-approved-bg text-status-approved',
    };

    return (
      <Badge className={colors[status] || ''}>
        {ENGINEERING_STATUS_LABELS[status as keyof typeof ENGINEERING_STATUS_LABELS] || status}
      </Badge>
    );
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCidadeFilter('');
    setSearchParams({});
  };

  const hasFilters = search || statusFilter !== 'ALL' || cidadeFilter;

  const availableStatuses = Object.entries(STATUS_LABELS).filter(([k]) => k !== 'RASCUNHO');
  const availableEngineeringStatuses = Object.entries(ENGINEERING_STATUS_LABELS);

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {user?.role === 'vendedor' ? 'Meus Projetos' : 'Projetos'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os projetos
            </p>
          </div>
          {(user?.role === 'vendedor' || user?.role === 'admin') && (
            <Button asChild>
              <Link to="/projetos/novo">
                <FolderPlus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Link>
            </Button>
          )}
        </div>

        {/* Tabs for Projetos and Chamados */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="projetos" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Projetos
            </TabsTrigger>
            {canSeeChamados && (
              <TabsTrigger value="chamados" className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Chamados
              </TabsTrigger>
            )}
            {canSeeRelatorios && (
              <TabsTrigger value="relatorios" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Relatórios
              </TabsTrigger>
            )}
          </TabsList>

          {/* Projetos Tab */}
          <TabsContent value="projetos" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-secondary">
                      <FileText className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-status-draft-bg">
                      <FileText className="w-5 h-5 text-status-draft" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.rascunho}</p>
                      <p className="text-sm text-muted-foreground">Retornados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-status-analysis-bg">
                      <Clock className="w-5 h-5 text-status-analysis" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.emAnalise}</p>
                      <p className="text-sm text-muted-foreground">Em Análise</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-status-pending-bg">
                      <AlertCircle className="w-5 h-5 text-status-pending" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.pendente}</p>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-status-approved-bg">
                      <CheckCircle2 className="w-5 h-5 text-status-approved" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.aprovado}</p>
                      <p className="text-sm text-muted-foreground">Aprovados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Projects in Implantação */}
            {implantacaoProjects.length > 0 && (
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-primary" />
                    Projetos em Implantação
                  </CardTitle>
                  <Badge variant="secondary">
                    {implantacaoProjects.length} {implantacaoProjects.length === 1 ? 'projeto' : 'projetos'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {implantacaoProjects.slice(0, 5).map((project) => {
                      const progress = implantacaoEtapas[project.id] || 0;
                      const progressPercentage = (progress / 9) * 100;
                      const status = project.implantacao_status || 'A_EXECUTAR';
                      
                      return (
                        <div
                          key={project.id}
                          onClick={() => navigate(`/startup-projetos/${project.id}/execucao`)}
                          className="p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-secondary">
                                <Rocket className="w-4 h-4 text-secondary-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground flex items-center gap-2">
                                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">#{project.numero_projeto}</span>
                                  {project.cliente_condominio_nome}
                                </p>
                                {project.implantacao_started_at && (
                                  <p className="text-xs text-muted-foreground">
                                    Iniciado em {format(parseISO(project.implantacao_started_at), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge className={`border ${IMPLANTACAO_STATUS_COLORS[status]}`}>
                              {status === 'EM_EXECUCAO' && <PlayCircle className="w-3 h-3 mr-1" />}
                              {status === 'CONCLUIDO_IMPLANTACAO' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {status === 'A_EXECUTAR' && <Clock className="w-3 h-3 mr-1" />}
                              {IMPLANTACAO_STATUS_LABELS[status]}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progresso</span>
                              <span>{progress}/9 etapas</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {implantacaoProjects.length > 5 && (
                    <div className="mt-4 text-center">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/startup-projetos">
                          Ver todos os {implantacaoProjects.length} projetos
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4">
                  {/* Search */}
                  <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por condomínio, cidade ou vendedor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | 'ALL')}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os status</SelectItem>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* City */}
                  <Select value={cidadeFilter || "ALL"} onValueChange={(v) => setCidadeFilter(v === "ALL" ? "" : v)}>
                    <SelectTrigger className="w-[180px]">
                      <MapPin className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas as cidades</SelectItem>
                      {cities.filter(city => city && city.trim() !== '').map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Projects List */}
            {filteredProjects.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-16 text-center">
                  <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Nenhum projeto encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    {hasFilters 
                      ? 'Tente ajustar os filtros de busca'
                      : 'Crie seu primeiro projeto para começar'}
                  </p>
                  {(user?.role === 'vendedor' || user?.role === 'admin') && !hasFilters && (
                    <Button asChild>
                      <Link to="/projetos/novo">
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Criar Projeto
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projetos/${project.id}`}
                    className="block"
                  >
                    <Card className="shadow-card hover:shadow-soft transition-shadow">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-secondary">
                              <Building className="w-5 h-5 text-secondary-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground flex items-center gap-2">
                                {project.numero_projeto && (
                                  <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">#{project.numero_projeto}</span>
                                )}
                                {project.cliente_condominio_nome}
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {project.cliente_cidade}, {project.cliente_estado}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {project.vendedor_nome}
                                </span>
                                {project.prazo_entrega_projeto && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Prazo: {format(parseISO(project.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {project.sale_status === 'CONCLUIDO' && (
                              <Badge 
                                className="cursor-pointer bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate(`/startup-projetos/${project.id}/execucao`);
                                }}
                              >
                                <Rocket className="w-3 h-3 mr-1" />
                                Em Implantação
                              </Badge>
                            )}
                            <StatusBadge status={project.status} />
                            <span className="text-sm text-muted-foreground">
                              Atualizado {format(parseISO(project.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Chamados Tab */}
          {canSeeChamados && (
            <TabsContent value="chamados" className="space-y-6">
              {/* Chamados Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-card">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-foreground">{chamadosStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total de Chamados</div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-status-sent">
                      {chamadosStats.emRecebimento}
                    </div>
                    <div className="text-sm text-muted-foreground">Em Recebimento</div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-status-analysis">
                      {chamadosStats.emProducao}
                    </div>
                    <div className="text-sm text-muted-foreground">Em Produção</div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold text-status-approved">
                      {chamadosStats.concluidos}
                    </div>
                    <div className="text-sm text-muted-foreground">Concluídos</div>
                  </CardContent>
                </Card>
              </div>

              {/* Chamados Filters */}
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por condomínio, vendedor ou cidade..."
                        value={chamadosSearch}
                        onChange={(e) => setChamadosSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Status Filter Multi-Select */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full md:w-56 justify-between">
                          <span>
                            {selectedStatuses.length === 0 
                              ? 'Todos os Status' 
                              : `${selectedStatuses.length} selecionado(s)`}
                          </span>
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3" align="start">
                        <div className="space-y-2">
                          {availableStatuses.map(([value, label]) => (
                            <label 
                              key={value} 
                              className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded-md"
                            >
                              <Checkbox
                                checked={selectedStatuses.includes(value as ProjectStatus)}
                                onCheckedChange={() => toggleStatus(value as ProjectStatus)}
                              />
                              <span className="text-sm">{label}</span>
                            </label>
                          ))}
                          {selectedStatuses.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => setSelectedStatuses([])}
                            >
                              Limpar filtros
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Engineering Status Filter Multi-Select */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full md:w-56 justify-between">
                          <span>
                            {selectedEngineeringStatuses.length === 0 
                              ? 'Todas as Etapas' 
                              : `${selectedEngineeringStatuses.length} selecionada(s)`}
                          </span>
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3" align="start">
                        <div className="space-y-2">
                          {availableEngineeringStatuses.map(([value, label]) => (
                            <label 
                              key={value} 
                              className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded-md"
                            >
                              <Checkbox
                                checked={selectedEngineeringStatuses.includes(value as EngineeringStatus)}
                                onCheckedChange={() => toggleEngineeringStatus(value as EngineeringStatus)}
                              />
                              <span className="text-sm">{label}</span>
                            </label>
                          ))}
                          {selectedEngineeringStatuses.length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => setSelectedEngineeringStatuses([])}
                            >
                              Limpar filtros
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

              {/* Sort Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground mr-1">Ordenar por:</span>
                {([
                  ['created_at', 'Data Criação'],
                  ['prazo_entrega_projeto', 'Prazo'],
                  ['cliente_condominio_nome', 'Condomínio'],
                  ['vendedor_nome', 'Vendedor'],
                  ['cliente_cidade', 'Cidade'],
                  ['cliente_estado', 'Estado'],
                ] as [SortField, string][]).map(([field, label]) => (
                  <Button
                    key={field}
                    variant={sortField === field ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort(field)}
                    className="gap-1"
                  >
                    {label}
                    <SortIcon field={field} />
                  </Button>
                ))}
              </div>

              {/* Chamados List */}
              <div className="space-y-4">
                {filteredChamados.length === 0 ? (
                  <Card className="shadow-card">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Nenhum chamado encontrado</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredChamados.map(projeto => (
                    <Card 
                      key={projeto.id} 
                      className="shadow-card hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/projetos/${projeto.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Building className="w-5 h-5 text-primary" />
                              {projeto.numero_projeto && (
                                <span className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                  <Hash className="w-3 h-3" />
                                  {projeto.numero_projeto}
                                </span>
                              )}
                              <h3 className="font-semibold text-foreground text-lg">
                                {projeto.cliente_condominio_nome}
                              </h3>
                              <StatusBadge status={projeto.status} />
                              {getEngineeringStatusBadge(projeto.engineering_status)}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="w-4 h-4" />
                                <span>{projeto.vendedor_nome}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span>{projeto.cliente_cidade}, {projeto.cliente_estado}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span>Criado: {format(parseISO(projeto.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                              </div>
                              {projeto.prazo_entrega_projeto && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Clock className="w-4 h-4" />
                                  <span>Prazo: {format(parseISO(projeto.prazo_entrega_projeto), "dd/MM/yyyy", { locale: ptBR })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <Button variant="outline" size="sm">
                              Ver Detalhes
                            </Button>
                            {projeto.engineering_status === 'CONCLUIDO' && (
                              <div className="flex items-center gap-1 text-status-approved text-xs">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Projeto Concluído</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          )}

          {canSeeRelatorios && (
            <TabsContent value="relatorios">
              <ProjetosRelatorios />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
