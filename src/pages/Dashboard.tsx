import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
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
  PlayCircle,
  Users,
  Building2,
  Heart,
  AlertTriangle,
  Star,
  DollarSign
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImplantacaoProject {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  implantacao_status: 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO' | null;
  implantacao_started_at: string | null;
  // From customer_portfolio
  data_ativacao: string | null;
  mensalidade: number | null;
}

interface DashboardStats {
  projectsTotal: number;
  projectsRascunho: number;
  projectsEmAnalise: number;
  projectsPendente: number;
  projectsAprovado: number;
  clientesTotal: number;
  clientesUnidades: number;
  contratosVencendo3Meses: number;
  contratosVencendo6Meses: number;
  npsScore: number | null;
  chamadosAbertos: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { projects, getProjectsByUser } = useProjects();
  const navigate = useNavigate();

  const [implantacaoProjects, setImplantacaoProjects] = useState<ImplantacaoProject[]>([]);
  const [implantacaoEtapas, setImplantacaoEtapas] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<DashboardStats>({
    projectsTotal: 0,
    projectsRascunho: 0,
    projectsEmAnalise: 0,
    projectsPendente: 0,
    projectsAprovado: 0,
    clientesTotal: 0,
    clientesUnidades: 0,
    contratosVencendo3Meses: 0,
    contratosVencendo6Meses: 0,
    npsScore: null,
    chamadosAbertos: 0,
  });

  const permissions = useMemo(() => {
    const role = user?.role || '';
    return {
      canSeeProjects: ['admin', 'vendedor', 'projetos', 'gerente_comercial', 'administrativo'].includes(role),
      canSeeImplantacao: ['admin', 'implantacao', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes', 'vendedor', 'gerente_comercial'].includes(role),
      canSeeCarteira: ['admin', 'projetos', 'implantacao', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes'].includes(role),
      canSeeSucesso: ['admin', 'projetos', 'implantacao', 'administrativo', 'sucesso_cliente'].includes(role),
    };
  }, [user?.role]);

  const userProjects = user?.role === 'vendedor' 
    ? getProjectsByUser(user.id) 
    : projects;

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      const newStats: Partial<DashboardStats> = {};

      // Fetch implantação projects with customer_portfolio data
      if (permissions.canSeeImplantacao) {
        try {
          let implantacaoQuery = supabase
            .from('projects')
            .select('id, numero_projeto, cliente_condominio_nome, implantacao_status, implantacao_started_at')
            .eq('sale_status', 'CONCLUIDO');

          if (user.role === 'vendedor') {
            implantacaoQuery = implantacaoQuery.eq('created_by_user_id', user.id);
          }

          const { data: projectsData } = await implantacaoQuery;

          if (projectsData && projectsData.length > 0) {
            const projectIds = projectsData.map(p => p.id);

            // Fetch customer_portfolio data for these projects
            const { data: portfolioData } = await supabase
              .from('customer_portfolio')
              .select('project_id, data_ativacao, mensalidade')
              .in('project_id', projectIds);

            const portfolioMap = new Map<string, { data_ativacao: string | null; mensalidade: number | null }>();
            portfolioData?.forEach(p => {
              if (p.project_id) portfolioMap.set(p.project_id, { data_ativacao: p.data_ativacao, mensalidade: p.mensalidade });
            });

            const enrichedProjects: ImplantacaoProject[] = projectsData.map(p => ({
              ...p,
              data_ativacao: portfolioMap.get(p.id)?.data_ativacao || null,
              mensalidade: portfolioMap.get(p.id)?.mensalidade || null,
            }));

            setImplantacaoProjects(enrichedProjects);

            const { data: etapasData } = await supabase
              .from('implantacao_etapas')
              .select('project_id, contrato_assinado, contrato_cadastrado, ligacao_boas_vindas, cadastro_gear, sindico_app, conferencia_tags, check_projeto, agendamento_visita_startup, laudo_visita_startup, laudo_instalador, laudo_vidraceiro, laudo_serralheiro, laudo_conclusao_supervisor, check_programacao, confirmacao_ativacao_financeira, agendamento_visita_comercial, laudo_visita_comercial, concluido')
              .in('project_id', projectIds);

            if (etapasData) {
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
          console.error('Error fetching implantacao data:', error);
        }
      }

      // Fetch customer portfolio stats
      if (permissions.canSeeCarteira) {
        try {
          const { data: customers } = await supabase
            .from('customer_portfolio')
            .select('unidades, data_ativacao, data_termino');

          if (customers) {
            const now = new Date();
            const in3Months = addMonths(now, 3);
            const in6Months = addMonths(now, 6);

            const customerStats = customers.reduce((acc, c) => {
              const endDate = c.data_termino ? parseISO(c.data_termino) : c.data_ativacao ? addMonths(parseISO(c.data_ativacao), 36) : null;
              
              return {
                total: acc.total + 1,
                unidades: acc.unidades + (c.unidades || 0),
                vencendo3m: acc.vencendo3m + (endDate && isAfter(endDate, now) && isBefore(endDate, in3Months) ? 1 : 0),
                vencendo6m: acc.vencendo6m + (endDate && isAfter(endDate, in3Months) && isBefore(endDate, in6Months) ? 1 : 0),
              };
            }, { total: 0, unidades: 0, vencendo3m: 0, vencendo6m: 0 });

            newStats.clientesTotal = customerStats.total;
            newStats.clientesUnidades = customerStats.unidades;
            newStats.contratosVencendo3Meses = customerStats.vencendo3m;
            newStats.contratosVencendo6Meses = customerStats.vencendo6m;
          }
        } catch (error) {
          console.error('Error fetching customer portfolio:', error);
        }
      }

      // Fetch sucesso cliente stats
      if (permissions.canSeeSucesso) {
        try {
          const { data: npsData } = await supabase
            .from('customer_nps')
            .select('nota');

          if (npsData && npsData.length > 0) {
            newStats.npsScore = Math.round(npsData.reduce((sum, n) => sum + n.nota, 0) / npsData.length * 10) / 10;
          }

          const { data: customerChamados } = await supabase
            .from('customer_chamados')
            .select('status')
            .neq('status', 'resolvido');

          newStats.chamadosAbertos = customerChamados?.length || 0;
        } catch (error) {
          console.error('Error fetching sucesso cliente data:', error);
        }
      }

      // Project stats
      newStats.projectsTotal = userProjects.length;
      newStats.projectsRascunho = userProjects.filter(p => p.status === 'RASCUNHO').length;
      newStats.projectsEmAnalise = userProjects.filter(p => ['ENVIADO', 'EM_ANALISE'].includes(p.status)).length;
      newStats.projectsPendente = userProjects.filter(p => p.status === 'PENDENTE_INFO').length;
      newStats.projectsAprovado = userProjects.filter(p => p.status === 'APROVADO_PROJETO').length;

      setStats(prev => ({ ...prev, ...newStats }));
    };

    fetchDashboardData();
  }, [user, projects, userProjects, permissions]);

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
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo, {user?.nome}
            </p>
          </div>
          {(user?.role === 'vendedor' || user?.role === 'admin' || user?.role === 'administrativo' || user?.role === 'sucesso_cliente' || user?.role === 'supervisor_operacoes') && (
            <Button asChild>
              <Link to="/projetos/novo">
                <FolderPlus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Link>
            </Button>
          )}
        </div>

        {/* LINHA 1 - Carteira de Clientes */}
        {permissions.canSeeCarteira && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Carteira de Clientes
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/carteira-clientes">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.clientesTotal}</p>
                      <p className="text-xs text-muted-foreground">Clientes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <Building className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.clientesUnidades.toLocaleString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">Unidades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-destructive">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">{stats.contratosVencendo3Meses}</p>
                      <p className="text-xs text-muted-foreground">Vencendo 3m</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-warning">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Calendar className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-warning">{stats.contratosVencendo6Meses}</p>
                      <p className="text-xs text-muted-foreground">Vencendo 6m</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* LINHA 2 - Projetos */}
        {permissions.canSeeProjects && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Projetos
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projetos">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <FileText className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.projectsTotal}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-status-draft-bg">
                      <FileText className="w-4 h-4 text-status-draft" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.projectsRascunho}</p>
                      <p className="text-xs text-muted-foreground">Retornados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-status-analysis-bg">
                      <Clock className="w-4 h-4 text-status-analysis" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.projectsEmAnalise}</p>
                      <p className="text-xs text-muted-foreground">Em Análise</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-status-pending-bg">
                      <AlertCircle className="w-4 h-4 text-status-pending" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.projectsPendente}</p>
                      <p className="text-xs text-muted-foreground">Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-status-approved-bg">
                      <CheckCircle2 className="w-4 h-4 text-status-approved" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.projectsAprovado}</p>
                      <p className="text-xs text-muted-foreground">Aprovados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* LINHA 3 - Projetos em Implantação (com data prevista e mensalidade) */}
        {permissions.canSeeImplantacao && implantacaoProjects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Projetos em Andamento
                <Badge variant="secondary" className="ml-2">
                  {implantacaoProjects.length}
                </Badge>
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/startup-projetos">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {implantacaoProjects.slice(0, 4).map((project) => {
                const progress = implantacaoEtapas[project.id] || 0;
                const progressPercentage = (progress / 9) * 100;
                const status = project.implantacao_status || 'A_EXECUTAR';
                
                return (
                  <Card
                    key={project.id}
                    onClick={() => navigate(`/startup-projetos/${project.id}/execucao`)}
                    className="shadow-card hover:shadow-lg transition-all cursor-pointer"
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">#{project.numero_projeto}</span>
                          <span className="font-medium text-sm truncate max-w-[200px]">{project.cliente_condominio_nome}</span>
                        </div>
                        <Badge className={`border text-xs ${IMPLANTACAO_STATUS_COLORS[status]}`}>
                          {status === 'EM_EXECUCAO' && <PlayCircle className="w-3 h-3 mr-1" />}
                          {status === 'CONCLUIDO_IMPLANTACAO' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {status === 'A_EXECUTAR' && <Clock className="w-3 h-3 mr-1" />}
                          {IMPLANTACAO_STATUS_LABELS[status]}
                        </Badge>
                      </div>

                      {/* Data prevista de ativação e Mensalidade */}
                      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            Ativação: {project.data_ativacao 
                              ? format(parseISO(project.data_ativacao), "dd/MM/yyyy", { locale: ptBR })
                              : 'Não definida'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>
                            Mensalidade: {project.mensalidade 
                              ? `R$ ${Number(project.mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '--'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{progress}/9 etapas</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* LINHA 4 - Sucesso do Cliente */}
        {permissions.canSeeSucesso && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Sucesso do Cliente
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sucesso-cliente">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <Star className="w-4 h-4 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.npsScore !== null ? stats.npsScore : '--'}</p>
                      <p className="text-xs text-muted-foreground">NPS Médio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <AlertCircle className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.chamadosAbertos}</p>
                      <p className="text-xs text-muted-foreground">Chamados Abertos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
