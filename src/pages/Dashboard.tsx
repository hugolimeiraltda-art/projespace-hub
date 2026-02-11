import { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Star
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImplantacaoProject {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  implantacao_status: 'A_EXECUTAR' | 'EM_EXECUCAO' | 'CONCLUIDO_IMPLANTACAO' | null;
  implantacao_started_at: string | null;
}

interface DashboardStats {
  // Projects
  projectsTotal: number;
  projectsRascunho: number;
  projectsEmAnalise: number;
  projectsPendente: number;
  projectsAprovado: number;
  // Customer Portfolio
  clientesTotal: number;
  clientesUnidades: number;
  contratosVencendo3Meses: number;
  contratosVencendo6Meses: number;
  // Sucesso Cliente
  npsScore: number | null;
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
    estoqueTotal: 0,
    estoqueOk: 0,
    estoqueCritico: 0,
    pendenciasAbertas: 0,
    pendenciasEmAndamento: 0,
    pendenciasAtrasadas: 0,
    pendenciasVenceHoje: 0,
  });

  // Define which sections each role can see - matching Layout.tsx menu permissions
  const permissions = useMemo(() => {
    const role = user?.role || '';
    return {
      // Projetos menu: projetos, admin, gerente_comercial, administrativo + vendedor (own projects)
      canSeeProjects: ['admin', 'vendedor', 'projetos', 'gerente_comercial', 'administrativo'].includes(role),
      // Implantação menu: implantacao, admin, administrativo, sucesso_cliente, supervisor_operacoes
      canSeeImplantacao: ['admin', 'implantacao', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes', 'vendedor', 'gerente_comercial'].includes(role),
      // Carteira de Clientes: projetos, admin, implantacao, administrativo, sucesso_cliente, supervisor_operacoes
      canSeeCarteira: ['admin', 'projetos', 'implantacao', 'administrativo', 'sucesso_cliente', 'supervisor_operacoes'].includes(role),
      // Sucesso do Cliente: projetos, admin, implantacao, administrativo, sucesso_cliente
      canSeeSucesso: ['admin', 'projetos', 'implantacao', 'administrativo', 'sucesso_cliente'].includes(role),
      // Controle de Estoque: admin, administrativo, supervisor_operacoes
      canSeeEstoque: ['admin', 'administrativo', 'supervisor_operacoes'].includes(role),
      // Manutenção: admin, implantacao, administrativo, supervisor_operacoes
      canSeeManutencao: ['admin', 'implantacao', 'administrativo', 'supervisor_operacoes'].includes(role),
    };
  }, [user?.role]);

  const userProjects = user?.role === 'vendedor' 
    ? getProjectsByUser(user.id) 
    : projects;

  // Fetch dashboard data based on user permissions
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      const newStats: Partial<DashboardStats> = {};

      // Fetch implantação projects only if user can see implantacao
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
        } catch (error) {
          console.error('Error fetching implantacao data:', error);
        }
      }

      // Fetch customer portfolio stats only if user can see carteira
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

      // Fetch sucesso cliente stats only if user can see sucesso
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

      // Fetch estoque stats only if user can see estoque
      if (permissions.canSeeEstoque) {
        try {
          const { data: estoqueItems } = await supabase
            .from('estoque_itens')
            .select('id');

          const { data: estoqueData } = await supabase
            .from('estoque')
            .select('estoque_atual, estoque_minimo');

          newStats.estoqueTotal = estoqueItems?.length || 0;
          
          let estoqueOk = 0;
          let estoqueCritico = 0;
          estoqueData?.forEach(e => {
            if (e.estoque_atual >= e.estoque_minimo) {
              estoqueOk++;
            } else {
              estoqueCritico++;
            }
          });
          newStats.estoqueOk = estoqueOk;
          newStats.estoqueCritico = estoqueCritico;
        } catch (error) {
          console.error('Error fetching estoque data:', error);
        }
      }

      // Fetch manutencao stats only if user can see manutencao
      if (permissions.canSeeManutencao) {
        try {
          const { data: pendencias } = await supabase
            .from('manutencao_pendencias')
            .select('status, data_prazo');

          if (pendencias) {
            const now = new Date();
            const pendenciasStats = pendencias.reduce((acc, p) => {
              const isPendenciaAtrasada = p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO' && differenceInDays(parseISO(p.data_prazo), now) < 0;
              const isVenceHoje = p.status !== 'CONCLUIDO' && p.status !== 'CANCELADO' && differenceInDays(parseISO(p.data_prazo), now) === 0;
              
              return {
                abertas: acc.abertas + (p.status === 'ABERTO' ? 1 : 0),
                emAndamento: acc.emAndamento + (p.status === 'EM_ANDAMENTO' ? 1 : 0),
                atrasadas: acc.atrasadas + (isPendenciaAtrasada ? 1 : 0),
                venceHoje: acc.venceHoje + (isVenceHoje ? 1 : 0),
              };
            }, { abertas: 0, emAndamento: 0, atrasadas: 0, venceHoje: 0 });

            newStats.pendenciasAbertas = pendenciasStats.abertas;
            newStats.pendenciasEmAndamento = pendenciasStats.emAndamento;
            newStats.pendenciasAtrasadas = pendenciasStats.atrasadas;
            newStats.pendenciasVenceHoje = pendenciasStats.venceHoje;
          }
        } catch (error) {
          console.error('Error fetching manutencao data:', error);
        }
      }

      // Update stats with project data
      newStats.projectsTotal = userProjects.length;
      newStats.projectsRascunho = userProjects.filter(p => p.status === 'RASCUNHO').length;
      newStats.projectsEmAnalise = userProjects.filter(p => ['ENVIADO', 'EM_ANALISE'].includes(p.status)).length;
      newStats.projectsPendente = userProjects.filter(p => p.status === 'PENDENTE_INFO').length;
      newStats.projectsAprovado = userProjects.filter(p => p.status === 'APROVADO_PROJETO').length;

      setStats(prev => ({ ...prev, ...newStats }));
    };

    fetchDashboardData();
  }, [user, projects, userProjects, permissions]);

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

        {/* Projects Stats */}
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

        {/* Implantacao Section */}
        {permissions.canSeeImplantacao && implantacaoProjects.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Implantação
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

        {/* Sucesso do Cliente */}
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


        {/* Controle de Estoque */}
        {permissions.canSeeEstoque && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
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
                  <div className="text-2xl font-bold text-status-approved">{stats.estoqueOk}</div>
                  <p className="text-xs text-muted-foreground">Estoque OK</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-destructive">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-destructive">{stats.estoqueCritico}</div>
                  <p className="text-xs text-muted-foreground">Crítico</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Manutenção */}
        {permissions.canSeeManutencao && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
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
                  <div className="text-2xl font-bold text-primary">{stats.pendenciasEmAndamento}</div>
                  <p className="text-xs text-muted-foreground">Em Andamento</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-destructive">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-destructive">{stats.pendenciasAtrasadas}</div>
                  <p className="text-xs text-muted-foreground">Atrasadas</p>
                </CardContent>
              </Card>
              <Card className="shadow-card border-l-4 border-l-warning">
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-warning">{stats.pendenciasVenceHoje}</div>
                  <p className="text-xs text-muted-foreground">Vence Hoje</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Recent Projects */}
        {permissions.canSeeProjects && recentProjects.length > 0 && (
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
