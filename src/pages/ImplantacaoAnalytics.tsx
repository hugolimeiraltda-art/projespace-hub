import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { BarChart3, Clock, DollarSign, TrendingUp, Calendar, Building } from 'lucide-react';
import { format, parseISO, differenceInDays, startOfMonth, addMonths, subMonths, isWithinInterval, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlanejamentoAtivacoes } from '@/components/PlanejamentoAtivacoes';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MapaRegional } from '@/components/MapaRegional';
import { MapPin } from 'lucide-react';

interface ProjectData {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  implantacao_status: string | null;
  implantacao_started_at: string | null;
  implantacao_completed_at: string | null;
  prazo_entrega_projeto: string | null;
  created_at: string;
}

interface PortfolioData {
  project_id: string | null;
  mensalidade: number | null;
  taxa_ativacao: number | null;
  data_ativacao: string | null;
  contrato: string | null;
  razao_social: string;
  filial: string | null;
  praca: string | null;
}

interface CancelamentoData {
  id: string;
  data_cancelamento: string;
  valor_contrato: number | null;
  motivo: string;
  customer_id: string;
}

interface ContratoDetalhe {
  nome: string;
  contrato: string;
  mensalidade: number;
  dataAtivacao: string | null;
  praca: string;
}

interface PlanData {
  id: string;
  mes: number;
  ano: number;
  qtd_contratos: number;
  valor_total: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const PRACA_MAP: Record<string, string> = {
  'BHZ': 'BHZ', 'Belo Horizonte': 'BHZ', 'Belo Horizonte-MG': 'BHZ',
  'RIO': 'RJ', 'Rio de Janeiro': 'RJ', 'Rio de Janeiro-RJ': 'RJ',
  'VIX': 'VIX', 'Vitória': 'VIX', 'Vitória-ES': 'VIX',
  'SPO': 'SPO', 'São Paulo': 'SPO', 'São Paulo-SP': 'SPO',
};
const getPraca = (filial?: string | null, praca?: string | null): string => {
  const val = praca || filial || '';
  return PRACA_MAP[val] || val || '—';
};

export default function ImplantacaoAnalytics() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioData[]>([]);
  const [allPortfolio, setAllPortfolio] = useState<PortfolioData[]>([]);
  const [cancelamentos, setCancelamentos] = useState<CancelamentoData[]>([]);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const fetchPlans = useCallback(async () => {
    const { data } = await supabase
      .from('implantacao_planejamento_ativacoes')
      .select('*');
    if (data) setPlans(data);
  }, []);

  useEffect(() => {
    fetchData();
    fetchPlans();
  }, [fetchPlans]);

  const fetchData = async () => {
    try {
      const [projectsRes, portfolioRes, allPortfolioRes, cancelamentosRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, numero_projeto, cliente_condominio_nome, implantacao_status, implantacao_started_at, implantacao_completed_at, prazo_entrega_projeto, created_at')
          .eq('sale_status', 'CONCLUIDO')
          .order('created_at', { ascending: false }),
        supabase
          .from('customer_portfolio')
          .select('project_id, mensalidade, taxa_ativacao, data_ativacao, contrato, razao_social, filial, praca')
          .not('project_id', 'is', null),
        supabase
          .from('customer_portfolio')
          .select('project_id, mensalidade, taxa_ativacao, data_ativacao, contrato, razao_social, filial, praca'),
        supabase
          .from('customer_cancelamentos')
          .select('id, data_cancelamento, valor_contrato, motivo, customer_id'),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (portfolioRes.data) setPortfolio(portfolioRes.data);
      if (allPortfolioRes.data) setAllPortfolio(allPortfolioRes.data);
      if (cancelamentosRes.data) setCancelamentos(cancelamentosRes.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const portfolioMap = useMemo(() => {
    const map: Record<string, PortfolioData> = {};
    portfolio.forEach(p => {
      if (p.project_id) map[p.project_id] = p;
    });
    return map;
  }, [portfolio]);

  // Chart 1: Days between entry and activation (or predicted)
  const timeToActivationData = useMemo(() => {
    return projects
      .filter(p => p.implantacao_started_at)
      .map(p => {
        const port = portfolioMap[p.id];
        const startDate = parseISO(p.implantacao_started_at!);
        const endDate = port?.data_ativacao
          ? parseISO(port.data_ativacao)
          : p.prazo_entrega_projeto
            ? parseISO(p.prazo_entrega_projeto)
            : null;

        const dias = endDate ? differenceInDays(endDate, startDate) : null;
        const nome = p.cliente_condominio_nome.length > 15
          ? p.cliente_condominio_nome.substring(0, 15) + '...'
          : p.cliente_condominio_nome;

        return {
          nome,
          nomeCompleto: p.cliente_condominio_nome,
          dias: dias !== null ? Math.abs(dias) : 0,
          ativado: !!port?.data_ativacao,
          numero: p.numero_projeto,
        };
      })
      .filter(d => d.dias > 0)
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 15);
  }, [projects, portfolioMap]);

  // Chart 2: Revenue (mensalidade) by project
  const revenueData = useMemo(() => {
    return projects
      .map(p => {
        const port = portfolioMap[p.id];
        if (!port?.mensalidade) return null;
        const nome = p.cliente_condominio_nome.length > 15
          ? p.cliente_condominio_nome.substring(0, 15) + '...'
          : p.cliente_condominio_nome;
        return {
          nome,
          nomeCompleto: p.cliente_condominio_nome,
          mensalidade: Number(port.mensalidade),
          numero: p.numero_projeto,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.mensalidade - a!.mensalidade)
      .slice(0, 15) as { nome: string; nomeCompleto: string; mensalidade: number; numero: number }[];
  }, [projects, portfolioMap]);

  // Chart 3: Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      'A Executar': 0,
      'Em Execução': 0,
      'Concluído': 0,
    };
    projects.forEach(p => {
      if (p.implantacao_status === 'CONCLUIDO_IMPLANTACAO') counts['Concluído']++;
      else if (p.implantacao_status === 'EM_EXECUCAO') counts['Em Execução']++;
      else counts['A Executar']++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  // Summary metrics
  const metrics = useMemo(() => {
    const totalMensalidade = portfolio.reduce((sum, p) => sum + (Number(p.mensalidade) || 0), 0);
    const totalTaxa = portfolio.reduce((sum, p) => sum + (Number(p.taxa_ativacao) || 0), 0);
    const avgDays = timeToActivationData.length > 0
      ? Math.round(timeToActivationData.reduce((sum, d) => sum + d.dias, 0) / timeToActivationData.length)
      : 0;
    return { totalMensalidade, totalTaxa, avgDays, totalProjects: projects.length };
  }, [portfolio, timeToActivationData, projects]);

  // Chart 4: Monthly revenue evolution
  const monthlyRevenueData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    projects.forEach(p => {
      const port = portfolioMap[p.id];
      if (!port?.mensalidade || !p.implantacao_started_at) return;
      const month = format(parseISO(p.implantacao_started_at), 'MM/yyyy');
      monthMap[month] = (monthMap[month] || 0) + Number(port.mensalidade);
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => {
        const [ma, ya] = a.split('/').map(Number);
        const [mb, yb] = b.split('/').map(Number);
        return ya !== yb ? ya - yb : ma - mb;
      })
      .map(([month, total]) => ({ month, total: Math.round(total) }));
  }, [projects, portfolioMap]);

  // Revenue activation by month: previous, current, next 3 months
  const revenueByMonthData = useMemo(() => {
    const now = new Date();
    const months = [
      subMonths(now, 1),
      now,
      addMonths(now, 1),
      addMonths(now, 2),
      addMonths(now, 3),
    ];

    return months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const label = format(monthDate, 'MMM/yy', { locale: ptBR });
      const isCurrentMonth = format(monthDate, 'MM/yyyy') === format(now, 'MM/yyyy');
      const isPast = monthDate < startOfMonth(now);
      const monthNum = monthDate.getMonth() + 1;
      const yearNum = monthDate.getFullYear();

      let totalMensalidade = 0;
      let totalTaxa = 0;
      let count = 0;
      const contratos: ContratoDetalhe[] = [];

      projects.forEach(p => {
        const port = portfolioMap[p.id];
        if (!port) return;

        const activationDate = port.data_ativacao
          ? parseISO(port.data_ativacao)
          : p.prazo_entrega_projeto
            ? parseISO(p.prazo_entrega_projeto)
            : null;

        if (!activationDate) return;

        if (isWithinInterval(activationDate, { start: monthStart, end: monthEnd })) {
          totalMensalidade += Number(port.mensalidade) || 0;
          totalTaxa += Number(port.taxa_ativacao) || 0;
          count++;
          contratos.push({
            nome: p.cliente_condominio_nome,
            contrato: port.contrato || '—',
            mensalidade: Number(port.mensalidade) || 0,
            dataAtivacao: port.data_ativacao || p.prazo_entrega_projeto || null,
            praca: getPraca(port.filial, port.praca),
          });
        }
      });

      // Cancelamentos do mês
      let canceladosCount = 0;
      let canceladosReceita = 0;
      cancelamentos.forEach(c => {
        const cancelDate = parseISO(c.data_cancelamento);
        if (isWithinInterval(cancelDate, { start: monthStart, end: monthEnd })) {
          canceladosCount++;
          canceladosReceita += Number(c.valor_contrato) || 0;
        }
      });

      const saldo = totalMensalidade - canceladosReceita;

      // Find planned data for this month
      const plan = plans.find(p => p.mes === monthNum && p.ano === yearNum);
      const planejadoValor = plan ? Number(plan.valor_total) : 0;
      const planejadoQtd = plan ? plan.qtd_contratos : 0;

      return {
        label,
        totalMensalidade,
        totalTaxa,
        count,
        contratos,
        isCurrentMonth,
        isPast,
        isFuture: !isPast && !isCurrentMonth,
        planejadoValor,
        planejadoQtd,
        hasPlan: !!plan,
        canceladosCount,
        canceladosReceita,
        saldo,
      };
    });
  }, [projects, portfolioMap, plans, cancelamentos]);

  // Regional activation data
  const regionalData = useMemo(() => {
    const regions: Record<string, { contratos: number; receita: number }> = {
      SPO: { contratos: 0, receita: 0 },
      BHZ: { contratos: 0, receita: 0 },
      RJ: { contratos: 0, receita: 0 },
      VIX: { contratos: 0, receita: 0 },
    };

    allPortfolio.forEach(p => {
      const praca = getPraca(p.filial, p.praca);
      if (regions[praca]) {
        regions[praca].contratos++;
        regions[praca].receita += Number(p.mensalidade) || 0;
      }
    });

    return [
      { sigla: 'SPO', nome: 'São Paulo', ...regions.SPO },
      { sigla: 'BHZ', nome: 'Belo Horizonte', ...regions.BHZ },
      { sigla: 'RJ', nome: 'Rio de Janeiro', ...regions.RJ },
      { sigla: 'VIX', nome: 'Vitória', ...regions.VIX },
    ];
  }, [allPortfolio]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-sm text-foreground">{payload[0]?.payload?.nomeCompleto || label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm text-muted-foreground">
            {p.name === 'dias' ? `${p.value} dias` :
              p.name === 'mensalidade' || p.name === 'total' ? `R$ ${p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
                p.value}
          </p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando analytics...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Analytics de Implantação</h1>
          </div>
          <p className="text-muted-foreground">Métricas de tempo, receita e desempenho da implantação</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Projetos</p>
                  <p className="text-2xl font-bold">{metrics.totalProjects}</p>
                </div>
                <Building className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio (dias)</p>
                  <p className="text-2xl font-bold">{metrics.avgDays}</p>
                </div>
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Mensal Total</p>
                  <p className="text-xl font-bold">R$ {metrics.totalMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Ativação Total</p>
                  <p className="text-xl font-bold">R$ {metrics.totalTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Activation by Month */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Receita Ativada por Mês
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Comparação entre orçado (planejado) e realizado</p>
              </div>
              <PlanejamentoAtivacoes onUpdate={fetchPlans} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {revenueByMonthData.map((m, i) => {
                const pctValor = m.planejadoValor > 0 ? Math.min(100, Math.round((m.totalMensalidade / m.planejadoValor) * 100)) : 0;
                const pctQtd = m.planejadoQtd > 0 ? Math.min(100, Math.round((m.count / m.planejadoQtd) * 100)) : 0;

                return (
                  <div
                    key={i}
                    onClick={() => setSelectedMonth(i)}
                    className={`rounded-lg border p-4 space-y-2 cursor-pointer transition-shadow hover:shadow-md ${
                      m.isCurrentMonth
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : m.isFuture
                          ? 'border-dashed border-muted-foreground/30 bg-muted/30'
                          : 'border-border'
                    }`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-wider ${m.isCurrentMonth ? 'text-primary' : 'text-muted-foreground'}`}>
                      {m.label}
                      {m.isCurrentMonth && <span className="ml-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">atual</span>}
                      {m.isFuture && <span className="ml-1 text-[10px] text-muted-foreground">(prev.)</span>}
                    </p>

                    {/* Contratos: Previsto vs Realizado */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Previsto</p>
                        <p className="text-sm font-semibold text-muted-foreground">{m.hasPlan ? m.planejadoQtd : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Realizado</p>
                        <p className="text-sm font-bold text-foreground">{m.count}</p>
                      </div>
                    </div>

                    {/* Receita: Prevista vs Realizada */}
                    <div className="border-t border-border/50 pt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Receita Prevista</span>
                        <span className="font-medium">{m.hasPlan ? `R$ ${m.planejadoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Receita Ativada</span>
                        <span className="font-bold text-foreground">R$ {m.totalMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Cancelamentos */}
                    <div className="border-t border-border/50 pt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Cancelados</span>
                        <span className="font-semibold text-destructive">{m.canceladosCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Receita Cancelada</span>
                        <span className="font-semibold text-destructive">
                          {m.canceladosReceita > 0 ? `-R$ ${m.canceladosReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                        </span>
                      </div>
                    </div>

                    {/* Saldo */}
                    <div className="border-t border-border/50 pt-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-muted-foreground">Saldo</span>
                        <span className={`font-bold ${m.saldo >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                          R$ {m.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Progress bars */}
                    {m.hasPlan && (
                      <div className="border-t border-border/50 pt-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Atingimento</span>
                          <span className={`font-semibold ${pctValor >= 100 ? 'text-chart-2' : pctValor >= 50 ? 'text-primary' : 'text-destructive'}`}>
                            {pctValor}%
                          </span>
                        </div>
                        <Progress value={pctValor} className="h-1.5" />
                      </div>
                    )}

                    {!m.hasPlan && (
                      <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/50">Sem planejamento</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={selectedMonth !== null} onOpenChange={(open) => !open && setSelectedMonth(null)}>
          <DialogContent className="max-w-6xl">
            {selectedMonth !== null && revenueByMonthData[selectedMonth] && (() => {
              const m = revenueByMonthData[selectedMonth];
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      Contratos Ativados — {m.label.toUpperCase()}
                      {m.isCurrentMonth && <Badge variant="default" className="text-[10px]">Atual</Badge>}
                      {m.isFuture && <Badge variant="secondary" className="text-[10px]">Previsão</Badge>}
                    </DialogTitle>
                  </DialogHeader>

                  {/* Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground uppercase">Contratos Previstos</p>
                      <p className="text-lg font-bold">{m.hasPlan ? m.planejadoQtd : '—'}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground uppercase">Contratos Realizados</p>
                      <p className="text-lg font-bold">{m.count}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground uppercase">Receita Prevista</p>
                      <p className="text-sm font-bold">{m.hasPlan ? `R$ ${m.planejadoValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground uppercase">Receita Realizada</p>
                      <p className="text-sm font-bold">R$ {m.totalMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>

                  {m.contratos.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Condomínio</TableHead>
                            <TableHead>Contrato</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Praça</TableHead>
                            <TableHead className="text-right">Receita</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {m.contratos.map((c, j) => (
                            <TableRow key={j}>
                              <TableCell className="text-sm font-medium">{c.nome}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{c.contrato}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {c.dataAtivacao ? format(parseISO(c.dataAtivacao), 'dd/MM/yyyy') : '—'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{c.praca}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-right font-medium">
                                R$ {c.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Nenhum contrato ativado neste mês</p>
                  )}
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Regional Map */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Ativações por Regional
            </CardTitle>
            <p className="text-xs text-muted-foreground">Distribuição geográfica dos contratos ativados</p>
          </CardHeader>
          <CardContent>
            <MapaRegional data={regionalData} />
          </CardContent>
        </Card>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time to Activation */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tempo entre Entrada e Ativação (dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {timeToActivationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={timeToActivationData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="dias" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Project */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mensalidade por Projeto (R$)</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={revenueData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`} />
                    <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="mensalidade" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Revenue Evolution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Evolução da Receita por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyRevenueData} margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(1)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
