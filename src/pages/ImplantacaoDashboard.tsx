import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ImplantacaoTimeline, ImplantacaoEtapasData } from '@/components/ImplantacaoTimeline';
import {
  Search,
  BarChart3,
  PlayCircle,
  Clock,
  CheckCircle2,
  Building,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProject {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  cliente_cidade: string | null;
  cliente_estado: string | null;
  implantacao_status: string | null;
  implantacao_started_at: string | null;
  prazo_entrega_projeto: string | null;
}

export default function ImplantacaoDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [etapasMap, setEtapasMap] = useState<Record<string, ImplantacaoEtapasData>>({});
  const [portfolioMap, setPortfolioMap] = useState<Record<string, { mensalidade: number | null; taxa_ativacao: number | null }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [projectsRes, etapasRes, portfolioRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado, implantacao_status, implantacao_started_at, prazo_entrega_projeto')
          .eq('sale_status', 'CONCLUIDO')
          .neq('implantacao_status', 'CONCLUIDO_IMPLANTACAO')
          .order('updated_at', { ascending: false }),
        supabase
          .from('implantacao_etapas')
          .select('project_id, contrato_assinado_at, ligacao_boas_vindas_at, agendamento_visita_startup_at, laudo_visita_startup_at, check_programacao_at, confirmacao_ativacao_financeira_at, operacao_assistida_inicio, operacao_assistida_fim'),
        supabase
          .from('customer_portfolio')
          .select('project_id, mensalidade, taxa_ativacao')
          .not('project_id', 'is', null),
      ]);

      if (projectsRes.error) {
        toast({ title: 'Erro', description: 'Não foi possível carregar os projetos.', variant: 'destructive' });
        return;
      }

      const eMap: Record<string, ImplantacaoEtapasData> = {};
      etapasRes.data?.forEach((e: any) => {
        if (e.project_id) {
          eMap[e.project_id] = {
            contrato_assinado_at: e.contrato_assinado_at,
            ligacao_boas_vindas_at: e.ligacao_boas_vindas_at,
            agendamento_visita_startup_at: e.agendamento_visita_startup_at,
            laudo_visita_startup_at: e.laudo_visita_startup_at,
            check_programacao_at: e.check_programacao_at,
            confirmacao_ativacao_financeira_at: e.confirmacao_ativacao_financeira_at,
            operacao_assistida_inicio: e.operacao_assistida_inicio,
            operacao_assistida_fim: e.operacao_assistida_fim,
          };
        }
      });
      setEtapasMap(eMap);

      const pMap: Record<string, { mensalidade: number | null; taxa_ativacao: number | null }> = {};
      portfolioRes.data?.forEach((p) => {
        if (p.project_id) {
          pMap[p.project_id] = { mensalidade: p.mensalidade ? Number(p.mensalidade) : null, taxa_ativacao: p.taxa_ativacao ? Number(p.taxa_ativacao) : null };
        }
      });
      setPortfolioMap(pMap);

      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = projects.filter(p =>
    p.cliente_condominio_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.numero_projeto).includes(searchTerm)
  );

  const emExecucao = projects.filter(p => p.implantacao_status === 'EM_EXECUCAO');
  const aExecutar = projects.filter(p => !p.implantacao_status || p.implantacao_status === 'A_EXECUTAR');

  // Calculate average progress
  const getProgress = (id: string) => {
    const e = etapasMap[id];
    if (!e) return 0;
    const keys: (keyof ImplantacaoEtapasData)[] = ['contrato_assinado_at', 'ligacao_boas_vindas_at', 'agendamento_visita_startup_at', 'laudo_visita_startup_at', 'check_programacao_at', 'confirmacao_ativacao_financeira_at', 'operacao_assistida_inicio'];
    return keys.filter(k => e[k]).length;
  };

  const avgProgress = emExecucao.length > 0
    ? Math.round(emExecucao.reduce((sum, p) => sum + (getProgress(p.id) / 7) * 100, 0) / emExecucao.length)
    : 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando dashboard...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Implantação</h1>
          </div>
          <p className="text-muted-foreground">Visão geral do progresso de todos os projetos em implantação</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projetos</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
                <Building className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Execução</p>
                  <p className="text-2xl font-bold text-blue-600">{emExecucao.length}</p>
                </div>
                <PlayCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">A Executar</p>
                  <p className="text-2xl font-bold text-amber-600">{aExecutar.length}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progresso Médio</p>
                  <p className="text-2xl font-bold text-primary">{avgProgress}%</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Timeline List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              Timeline dos Projetos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum projeto encontrado.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((project) => {
                  const portfolio = portfolioMap[project.id];
                  const cidadeEstado = [project.cliente_cidade, project.cliente_estado].filter(Boolean).join('/');
                  return (
                    <div
                      key={project.id}
                      className="px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/startup-projetos/${project.id}/execucao`)}
                    >
                      {/* Row 1: Project info */}
                      <div className="flex items-center gap-6 text-sm mb-2 flex-wrap">
                        <span className="font-semibold text-foreground">#{project.numero_projeto}</span>
                        <span className="font-medium text-foreground flex-1 min-w-[200px]">
                          {project.cliente_condominio_nome}
                          {cidadeEstado && <span className="text-muted-foreground font-normal ml-1">— {cidadeEstado}</span>}
                        </span>
                        <div className="flex items-center gap-6 text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Início: {project.implantacao_started_at
                              ? format(parseISO(project.implantacao_started_at), 'dd/MM/yyyy', { locale: ptBR })
                              : '—'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Previsão: {project.prazo_entrega_projeto
                              ? format(parseISO(project.prazo_entrega_projeto), 'dd/MM/yyyy', { locale: ptBR })
                              : '—'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            {portfolio?.mensalidade != null
                              ? `R$ ${portfolio.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            Taxa: {portfolio?.taxa_ativacao != null
                              ? `R$ ${portfolio.taxa_ativacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '—'}
                          </span>
                        </div>
                      </div>
                      {/* Row 2: Timeline */}
                      <ImplantacaoTimeline etapas={etapasMap[project.id] || null} compact />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
