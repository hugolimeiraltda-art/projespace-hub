import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  FolderPlus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  ArrowRight,
  Calendar,
  Building,
  Rocket,
  PlayCircle
} from 'lucide-react';
import { ProjectStatus, STATUS_LABELS } from '@/types/project';
import { format, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImplantacaoProject {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  implantacao_status: 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO' | null;
  implantacao_started_at: string | null;
  etapas_concluidas?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { projects, getProjectsByUser } = useProjects();
  const navigate = useNavigate();

  const [implantacaoProjects, setImplantacaoProjects] = useState<ImplantacaoProject[]>([]);
  const [implantacaoEtapas, setImplantacaoEtapas] = useState<Record<string, number>>({});

  const userProjects = user?.role === 'vendedor' 
    ? getProjectsByUser(user.id) 
    : projects;

  // Fetch projects in implantação for the current user (vendedor)
  useEffect(() => {
    const fetchImplantacaoProjects = async () => {
      if (!user) return;

      try {
        // Get projects with sale_status = CONCLUIDO that belong to this user (or all if not vendedor)
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

          // Fetch etapas for each project to calculate progress
          const projectIds = projectsData.map(p => p.id);
          const { data: etapasData, error: etapasError } = await supabase
            .from('implantacao_etapas')
            .select('project_id, contrato_assinado, contrato_cadastrado, ligacao_boas_vindas, cadastro_gear, sindico_app, conferencia_tags, check_projeto, agendamento_visita_startup, laudo_visita_startup, laudo_instalador, laudo_vidraceiro, laudo_serralheiro, laudo_conclusao_supervisor, check_programacao, confirmacao_ativacao_financeira, agendamento_visita_comercial, laudo_visita_comercial, concluido')
            .in('project_id', projectIds);

          if (!etapasError && etapasData) {
            const etapasMap: Record<string, number> = {};
            etapasData.forEach(etapa => {
              // Count completed stages (1-9)
              let completed = 0;
              if (etapa.contrato_assinado) completed++;
              if (etapa.contrato_cadastrado) completed++;
              if (etapa.ligacao_boas_vindas && etapa.cadastro_gear && etapa.sindico_app && etapa.conferencia_tags) completed++;
              if (etapa.check_projeto && etapa.agendamento_visita_startup && etapa.laudo_visita_startup) completed++;
              if (etapa.laudo_instalador && etapa.laudo_vidraceiro && etapa.laudo_serralheiro && etapa.laudo_conclusao_supervisor) completed++;
              if (etapa.check_programacao && etapa.confirmacao_ativacao_financeira) completed++;
              if (etapa.agendamento_visita_comercial && etapa.laudo_visita_comercial) completed++;
              // Stage 8 (operação assistida) - check if started
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
    total: userProjects.length,
    rascunho: userProjects.filter(p => p.status === 'RASCUNHO').length,
    emAnalise: userProjects.filter(p => ['ENVIADO', 'EM_ANALISE'].includes(p.status)).length,
    pendente: userProjects.filter(p => p.status === 'PENDENTE_INFO').length,
    aprovado: userProjects.filter(p => p.status === 'APROVADO_PROJETO').length,
    emImplantacao: implantacaoProjects.filter(p => p.implantacao_status === 'EM_EXECUCAO').length,
  };

  const recentProjects = [...userProjects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const urgentProjects = userProjects.filter(p => {
    if (!p.prazo_entrega_projeto || p.status === 'APROVADO_PROJETO' || p.status === 'CANCELADO') return false;
    const prazo = parseISO(p.prazo_entrega_projeto);
    const now = new Date();
    const diffDays = Math.ceil((prazo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  });

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

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {user?.role === 'vendedor' ? 'Meus Projetos' : 'Dashboard de Projetos'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo, {user?.nome}
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
          <Card className="shadow-card mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" />
                Projetos em Implantação
              </CardTitle>
              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
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
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Rocket className="w-4 h-4 text-blue-600" />
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Projetos Recentes</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/projetos">
                    Ver todos
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum projeto encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        to={`/projetos/${project.id}`}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-secondary">
                            <Building className="w-4 h-4 text-secondary-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{project.cliente_condominio_nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {project.cliente_cidade}, {project.cliente_estado}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusBadge status={project.status} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(project.updated_at), "dd/MM", { locale: ptBR })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Urgent / Upcoming Deadlines */}
          <div>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-warning" />
                  Prazos Próximos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {urgentProjects.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum prazo urgente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {urgentProjects.map((project) => {
                      const prazo = parseISO(project.prazo_entrega_projeto!);
                      const diffDays = Math.ceil((prazo.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <Link
                          key={project.id}
                          to={`/projetos/${project.id}`}
                          className="block p-3 rounded-lg border border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors"
                        >
                          <p className="font-medium text-foreground text-sm">
                            {project.cliente_condominio_nome}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {diffDays === 0 ? 'Hoje' : diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`}
                            {' • '}
                            {format(prazo, "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions for Projetos team */}
            {user?.role === 'projetos' && (
              <Card className="shadow-card mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/projetos?status=ENVIADO">
                      <FileText className="w-4 h-4 mr-2" />
                      Novos Envios ({userProjects.filter(p => p.status === 'ENVIADO').length})
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/projetos?status=PENDENTE_INFO">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Pendentes ({stats.pendente})
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
