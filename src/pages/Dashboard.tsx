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
  PlayCircle,
  Users,
  Building2,
  Package,
  Wrench,
  Heart,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Star,
  DollarSign
} from 'lucide-react';
import { ProjectStatus, STATUS_LABELS } from '@/types/project';
import { format, parseISO, isAfter, isBefore, addMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImplantacaoProject {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  implantacao_status: 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO' | null;
  implantacao_started_at: string | null;
  etapas_concluidas?: number;
}

interface DashboardStats {
  // Projects
  projectsTotal: number;
  projectsRascunho: number;
  projectsEmAnalise: number;
  projectsPendente: number;
  projectsAprovado: number;
  projectsEmImplantacao: number;
  // Customer Portfolio
  clientesTotal: number;
  clientesUnidades: number;
  clientesCameras: number;
  clientesMensalidade: number;
  contratosVencendo3Meses: number;
  contratosVencendo6Meses: number;
  // Sucesso Cliente
  npsScore: number | null;
  satisfacaoMedia: number | null;
  chamadosAbertos: number;
  // Estoque
  estoqueTotal: number;
  estoqueOk: number;
  estoqueCritico: number;
  // Manutencao
  pendenciasAbertas: number;
  pendenciasEmAndamento: number;
  pendenciasAtrasadas: number;
  pendenciasVenceHoje: number;
  // Chamados (projetos role)
  chamadosTotal: number;
  chamadosEmRecebimento: number;
  chamadosEmProducao: number;
  chamadosConcluidos: number;
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
    projectsEmImplantacao: 0,
    clientesTotal: 0,
    clientesUnidades: 0,
    clientesCameras: 0,
    clientesMensalidade: 0,
    contratosVencendo3Meses: 0,
    contratosVencendo6Meses: 0,
    npsScore: null,
    satisfacaoMedia: null,
    chamadosAbertos: 0,
    estoqueTotal: 0,
    estoqueOk: 0,
    estoqueCritico: 0,
    pendenciasAbertas: 0,
    pendenciasEmAndamento: 0,
    pendenciasAtrasadas: 0,
    pendenciasVenceHoje: 0,
    chamadosTotal: 0,
    chamadosEmRecebimento: 0,
    chamadosEmProducao: 0,
    chamadosConcluidos: 0,
  });
  const [loading, setLoading] = useState(true);

  const userProjects = user?.role === 'vendedor' 
    ? getProjectsByUser(user.id) 
    : projects;

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch implantação projects
        let implantacaoQuery = supabase
          .from('projects')
          .select('id, numero_projeto, cliente_condominio_nome, implantacao_status, implantacao_started_at')
          .eq('sale_status', 'CONCLUIDO');

        if (user.role === 'vendedor') {
          implantacaoQuery = implantacaoQuery.eq('created_by_user_id', user.id);
        }

        const { data: projectsData } = await implantacaoQuery;

        if (projectsData && projectsData.length > 0) {
          setImplantacaoProjects(projectsData);

          const projectIds = projectsData.map(p => p.id);
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

        // Fetch customer portfolio stats
        const { data: customers } = await supabase
          .from('customer_portfolio')
          .select('*');

        // Fetch customer NPS
        const { data: npsData } = await supabase
          .from('customer_nps')
          .select('nota');

        // Fetch customer chamados (tickets)
        const { data: customerChamados } = await supabase
          .from('customer_chamados')
          .select('status')
          .neq('status', 'resolvido');

        // Fetch estoque stats
        const { data: estoqueItems } = await supabase
          .from('estoque_itens')
          .select('id');

        const { data: estoqueData } = await supabase
          .from('estoque')
          .select('estoque_atual, estoque_minimo');

        // Fetch pendencias (maintenance)
        const { data: pendencias } = await supabase
          .from('manutencao_pendencias')
          .select('status, data_prazo');

        // Calculate stats
        const now = new Date();
        const in3Months = addMonths(now, 3);
        const in6Months = addMonths(now, 6);

        const customerStats = customers?.reduce((acc, c) => {
          const endDate = c.data_termino ? parseISO(c.data_termino) : c.data_ativacao ? addMonths(parseISO(c.data_ativacao), 36) : null;
          
          return {
            total: acc.total + 1,
            unidades: acc.unidades + (c.unidades || 0),
            cameras: acc.cameras + (c.cameras || 0),
            mensalidade: acc.mensalidade + (c.mensalidade || 0),
            vencendo3m: acc.vencendo3m + (endDate && isAfter(endDate, now) && isBefore(endDate, in3Months) ? 1 : 0),
            vencendo6m: acc.vencendo6m + (endDate && isAfter(endDate, in3Months) && isBefore(endDate, in6Months) ? 1 : 0),
          };
        }, { total: 0, unidades: 0, cameras: 0, mensalidade: 0, vencendo3m: 0, vencendo6m: 0 }) || { total: 0, unidades: 0, cameras: 0, mensalidade: 0, vencendo3m: 0, vencendo6m: 0 };

        const npsAverage = npsData && npsData.length > 0 
          ? Math.round(npsData.reduce((sum, n) => sum + n.nota, 0) / npsData.length * 10) / 10
          : null;

        // Estoque stats
        let estoqueOk = 0;
        let estoqueCritico = 0;
        estoqueData?.forEach(e => {
          if (e.estoque_atual >= e.estoque_minimo) {
            estoqueOk++;
          } else {
            estoqueCritico++;
          }
        });

        // Pendencias stats
        const pendenciasStats = pendencias?.reduce((acc, p) => {
          const isPendenciaAtrasada = p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO' && differenceInDays(parseISO(p.data_prazo), now) < 0;
          const isVenceHoje = p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO' && differenceInDays(parseISO(p.data_prazo), now) === 0;
          
          return {
            abertas: acc.abertas + (p.status === 'ABERTO' ? 1 : 0),
            emAndamento: acc.emAndamento + (p.status === 'EM_ANDAMENTO' ? 1 : 0),
            atrasadas: acc.atrasadas + (isPendenciaAtrasada ? 1 : 0),
            venceHoje: acc.venceHoje + (isVenceHoje ? 1 : 0),
          };
        }, { abertas: 0, emAndamento: 0, atrasadas: 0, venceHoje: 0 }) || { abertas: 0, emAndamento: 0, atrasadas: 0, venceHoje: 0 };

        // Chamados (projetos role)
        const chamadosProjects = projects.filter(p => p.status !== 'RASCUNHO');

        setStats({
          projectsTotal: userProjects.length,
          projectsRascunho: userProjects.filter(p => p.status === 'RASCUNHO').length,
          projectsEmAnalise: userProjects.filter(p => ['ENVIADO', 'EM_ANALISE'].includes(p.status)).length,
          projectsPendente: userProjects.filter(p => p.status === 'PENDENTE_INFO').length,
          projectsAprovado: userProjects.filter(p => p.status === 'APROVADO_PROJETO').length,
          projectsEmImplantacao: projectsData?.filter(p => p.implantacao_status === 'EM_EXECUCAO').length || 0,
          clientesTotal: customerStats.total,
          clientesUnidades: customerStats.unidades,
          clientesCameras: customerStats.cameras,
          clientesMensalidade: customerStats.mensalidade,
          contratosVencendo3Meses: customerStats.vencendo3m,
          contratosVencendo6Meses: customerStats.vencendo6m,
          npsScore: npsAverage,
          satisfacaoMedia: null,
          chamadosAbertos: customerChamados?.length || 0,
          estoqueTotal: estoqueItems?.length || 0,
          estoqueOk,
          estoqueCritico,
          pendenciasAbertas: pendenciasStats.abertas,
          pendenciasEmAndamento: pendenciasStats.emAndamento,
          pendenciasAtrasadas: pendenciasStats.atrasadas,
          pendenciasVenceHoje: pendenciasStats.venceHoje,
          chamadosTotal: chamadosProjects.length,
          chamadosEmRecebimento: chamadosProjects.filter(p => p.engineering_status === 'EM_RECEBIMENTO').length,
          chamadosEmProducao: chamadosProjects.filter(p => p.engineering_status === 'EM_PRODUCAO').length,
          chamadosConcluidos: chamadosProjects.filter(p => p.engineering_status === 'CONCLUIDO').length,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, projects, userProjects]);

  const recentProjects = [...userProjects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

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

  // Define which sections each role can see
  const canSeeProjects = ['admin', 'vendedor', 'projetos', 'gerente_comercial', 'administrativo'].includes(user?.role || '');
  const canSeeImplantacao = ['admin', 'implantacao', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes'].includes(user?.role || '');
  const canSeeCarteira = ['admin', 'projetos', 'implantacao', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes'].includes(user?.role || '');
  const canSeeSucesso = ['admin', 'projetos', 'implantacao', 'administrativo', 'sucesso_cliente'].includes(user?.role || '');
  const canSeeChamados = ['admin', 'projetos', 'administrativo'].includes(user?.role || '');
  const canSeeEstoque = ['admin', 'administrativo', 'supervisor_operacoes'].includes(user?.role || '');
  const canSeeManutencao = ['admin', 'implantacao', 'administrativo', 'supervisor_operacoes'].includes(user?.role || '');

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
          {(user?.role === 'vendedor' || user?.role === 'admin') && (
            <Button asChild>
              <Link to="/projetos/novo">
                <FolderPlus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Link>
            </Button>
          )}
        </div>

        {/* Projects Stats */}
        {canSeeProjects && (
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

        {/* Implantacao Section */}
        {canSeeImplantacao && implantacaoProjects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" />
                Implantação
                <Badge className="bg-blue-100 text-blue-800 border-blue-300 ml-2">
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Carteira de Clientes */}
        {canSeeCarteira && (
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
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Building className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.clientesUnidades.toLocaleString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">Unidades</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.contratosVencendo3Meses}</p>
                      <p className="text-xs text-muted-foreground">Vencendo 3m</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-amber-500">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                      <Calendar className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{stats.contratosVencendo6Meses}</p>
                      <p className="text-xs text-muted-foreground">Vencendo 6m</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Sucesso do Cliente */}
        {canSeeSucesso && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-600" />
                Sucesso do Cliente
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sucesso-cliente">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Star className="w-4 h-4 text-purple-600" />
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
                    <div className="p-2 rounded-lg bg-green-100">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stats.satisfacaoMedia !== null ? stats.satisfacaoMedia : '--'}</p>
                      <p className="text-xs text-muted-foreground">Satisfação</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
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

        {/* Meus Chamados (projetos role) */}
        {canSeeChamados && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                Chamados de Projetos
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/chamados">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-foreground">{stats.chamadosTotal}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-status-sent">{stats.chamadosEmRecebimento}</div>
                  <p className="text-xs text-muted-foreground">Em Recebimento</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-status-analysis">{stats.chamadosEmProducao}</div>
                  <p className="text-xs text-muted-foreground">Em Produção</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-status-approved">{stats.chamadosConcluidos}</div>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Controle de Estoque */}
        {canSeeEstoque && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-600" />
                Controle de Estoque
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/controle-estoque">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-foreground">{stats.estoqueTotal}</div>
                  <p className="text-xs text-muted-foreground">Total de Itens</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{stats.estoqueOk}</div>
                  <p className="text-xs text-muted-foreground">Estoque OK</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{stats.estoqueCritico}</div>
                  <p className="text-xs text-muted-foreground">Crítico</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Manutenção */}
        {canSeeManutencao && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-600" />
                Manutenção
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/manutencao">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-foreground">{stats.pendenciasAbertas}</div>
                  <p className="text-xs text-muted-foreground">Abertas</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">{stats.pendenciasEmAndamento}</div>
                  <p className="text-xs text-muted-foreground">Em Andamento</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-red-600">{stats.pendenciasAtrasadas}</div>
                  <p className="text-xs text-muted-foreground">Atrasadas</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-orange-500">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-orange-600">{stats.pendenciasVenceHoje}</div>
                  <p className="text-xs text-muted-foreground">Vence Hoje</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Recent Projects */}
        {canSeeProjects && recentProjects.length > 0 && (
          <div className="mb-8">
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
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <Link
                      key={project.id}
                      to={`/projetos/${project.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-secondary">
                          <Building className="w-4 h-4 text-secondary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{project.cliente_condominio_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.cliente_cidade}, {project.cliente_estado}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={project.status} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(project.updated_at), "dd/MM", { locale: ptBR })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
