import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, FileSpreadsheet, Download, Calendar, Building,
  TrendingUp, BarChart3, MapPin, Clock, Filter, ChevronDown, ChevronRight,
} from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInMonths, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { exportImplantacaoPDF } from '@/lib/implantacaoRelatorioPdf';

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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);




type ReportType = 'resumo_mensal' | 'por_praca' | 'historico' | 'indicadores';

const REPORT_TYPES: { value: ReportType; label: string; desc: string; icon: typeof BarChart3 }[] = [
  { value: 'resumo_mensal', label: 'Resumo Mensal de Ativações', desc: 'Ativações, churn, receita por mês com comparativo planejado vs realizado', icon: Calendar },
  { value: 'por_praca', label: 'Relatório por Praça', desc: 'Detalhamento de KPIs separado por BHZ, RIO, VIX, SPO', icon: MapPin },
  { value: 'historico', label: 'Histórico de Projetos', desc: 'Lista completa dos projetos com datas, status e valores', icon: Building },
  { value: 'indicadores', label: 'Indicadores de Desempenho', desc: 'Tempo médio, taxa de conclusão, SLA por período', icon: TrendingUp },
];

export default function ImplantacaoRelatorios() {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState<ReportType>('resumo_mensal');
  const [selectedPraca, setSelectedPraca] = useState<string>('TODOS');
  const [dataInicio, setDataInicio] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(() => format(addMonths(new Date(), 6), 'yyyy-MM-dd'));
  const [periodoErro, setPeriodoErro] = useState('');
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [cancelamentos, setCancelamentos] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [etapasMap, setEtapasMap] = useState<Record<string, string | null>>({});
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [projRes, portRes, cancRes, planRes, etapasRes] = await Promise.all([
      supabase.from('projects').select('id, numero_projeto, cliente_condominio_nome, implantacao_status, implantacao_started_at, implantacao_completed_at, prazo_entrega_projeto, created_at, tipo_obra').eq('sale_status', 'CONCLUIDO'),
      supabase.from('customer_portfolio').select('project_id, mensalidade, taxa_ativacao, data_ativacao, contrato, razao_social, filial, praca, status_implantacao'),
      supabase.from('customer_cancelamentos').select('id, data_cancelamento, valor_contrato, motivo, customer_id'),
      supabase.from('implantacao_planejamento_ativacoes').select('*'),
      supabase.from('implantacao_etapas').select('project_id, data_vencimento_primeiro_boleto'),
    ]);
    setProjects(projRes.data || []);
    setPortfolio(portRes.data || []);
    setCancelamentos(cancRes.data || []);
    setPlans(planRes.data || []);
    if (etapasRes.data) {
      const map: Record<string, string | null> = {};
      (etapasRes.data as any[]).forEach((e: any) => { map[e.project_id] = e.data_vencimento_primeiro_boleto; });
      setEtapasMap(map);
    }
    setLoading(false);
  };

  const portfolioByProjectId = useMemo(() => {
    const map: Record<string, any> = {};
    portfolio.forEach((p) => {
      if (p.project_id) map[p.project_id] = p;
    });
    return map;
  }, [portfolio]);

  useEffect(() => {
    if (dataInicio && dataFim) {
      const meses = differenceInMonths(parseISO(dataFim), parseISO(dataInicio));
      if (meses > 24) {
        setPeriodoErro('Período máximo de 24 meses');
      } else if (parseISO(dataFim) < parseISO(dataInicio)) {
        setPeriodoErro('Data final deve ser maior que a inicial');
      } else {
        setPeriodoErro('');
      }
    }
  }, [dataInicio, dataFim]);

  const periodMonths = useMemo(() => {
    const start = parseISO(dataInicio);
    const end = parseISO(dataFim);
    if (end < start) return [];
    return eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(end) });
  }, [dataInicio, dataFim]);

  // ========== FILTERED DATA BY PRACA ==========
  const filteredPortfolio = useMemo(() => {
    if (selectedPraca === 'TODOS') return portfolio;
    return portfolio.filter(p => getPraca(p.filial, p.praca) === selectedPraca);
  }, [portfolio, selectedPraca]);

  const filteredProjects = useMemo(() => {
    if (selectedPraca === 'TODOS') return projects;
    return projects.filter((p) => {
      const port = portfolioByProjectId[p.id];
      return getPraca(port?.filial, port?.praca) === selectedPraca;
    });
  }, [projects, selectedPraca, portfolioByProjectId]);

  const filteredCancelamentos = useMemo(() => {
    // Filter cancelamentos by period
    const start = parseISO(dataInicio);
    const end = parseISO(dataFim);
    return cancelamentos.filter(c => {
      const d = parseISO(c.data_cancelamento);
      return isWithinInterval(d, { start: startOfMonth(start), end: endOfMonth(end) });
    });
  }, [cancelamentos, dataInicio, dataFim]);

  // ========== RESUMO MENSAL ==========
  // Build a map from project_id -> project for fallback date logic
  const projectMap = useMemo(() => {
    const map: Record<string, any> = {};
    projects.forEach(p => { map[p.id] = p; });
    return map;
  }, [projects]);

  // Helper: get the effective activation date for a portfolio record.
  // Always prioritize data_ativacao when it exists (user may have manually set it).
  // Fallback to prazo_entrega_projeto for projects without data_ativacao.
  const getEffectiveDate = (portRecord: any): string | null => {
    if (portRecord.data_ativacao) {
      return portRecord.data_ativacao;
    }
    const proj = portRecord.project_id ? projectMap[portRecord.project_id] : null;
    return proj?.prazo_entrega_projeto || null;
  };

  const resumoMensalComDetalhe = useMemo(() => {
    return periodMonths.map(month => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const mesNum = month.getMonth() + 1;
      const anoNum = month.getFullYear();

      const ativacoes = filteredPortfolio.filter(p => {
        const dateStr = getEffectiveDate(p);
        if (!dateStr) return false;
        const d = parseISO(dateStr);
        return isWithinInterval(d, { start: ms, end: me });
      });

      const canc = cancelamentos.filter(c => {
        const d = parseISO(c.data_cancelamento);
        return isWithinInterval(d, { start: ms, end: me });
      });

      const matchingPlans = plans.filter(p => p.mes === mesNum && p.ano === anoNum && (selectedPraca === 'TODOS' ? true : p.praca === selectedPraca));
      const previsto = matchingPlans.reduce((s, p) => s + (p.qtd_contratos || 0), 0);
      const churnPrev = matchingPlans.reduce((s, p) => s + (p.qtd_churn || 0), 0);
      const receitaPrevista = matchingPlans.reduce((s, p) => s + (p.valor_total || 0), 0);
      const vendaPrevista = matchingPlans.reduce((s, p) => s + (p.valor_venda || 0), 0);
      const receitaAtivada = ativacoes.reduce((s, a) => s + (a.mensalidade || 0), 0);
      const vendaAtivada = ativacoes.reduce((s, a) => s + (a.taxa_ativacao || 0), 0);
      const receitaCancelada = canc.reduce((s, c) => s + (c.valor_contrato || 0), 0);

      // Estratificado: detail of each activation
      const detalheAtivacoes = ativacoes.map(a => {
        const proj = a.project_id ? projectMap[a.project_id] : null;
        const isAtivo = proj?.implantacao_status === 'CONCLUIDO' || a.status_implantacao === 'ATIVO';
        return {
          cliente: a.razao_social || proj?.cliente_condominio_nome || '—',
          contrato: a.contrato || '—',
          praca: getPraca(a.filial, a.praca),
          mensalidade: a.mensalidade || 0,
          taxaAtivacao: a.taxa_ativacao || 0,
          dataAtivacao: a.data_ativacao ? format(parseISO(a.data_ativacao), 'dd/MM/yyyy') : '—',
          dataBoleto: a.project_id && etapasMap[a.project_id] ? format(parseISO(etapasMap[a.project_id]!), 'dd/MM/yyyy') : '—',
          status: isAtivo ? 'Ativado' : 'Previsto',
        };
      });

      return {
        mes: format(month, 'MMM/yyyy', { locale: ptBR }),
        ativacoes: ativacoes.length,
        cancelamentos: canc.length,
        churnPrevisto: churnPrev,
        saldo: Math.round((ativacoes.length - previsto) * 100) / 100,
        receitaAtivada,
        vendaAtivada,
        receitaCancelada,
        saldoReceita: receitaAtivada - receitaPrevista,
        previsto,
        receitaPrevista,
        vendaPrevista,
        atingimento: previsto > 0 ? Math.round((ativacoes.length / previsto) * 100) : (ativacoes.length > 0 ? 100 : 0),
        detalheAtivacoes,
      };
    });
  }, [periodMonths, filteredPortfolio, cancelamentos, plans, selectedPraca, projectMap, etapasMap]);

  const resumoMensal = useMemo(() => resumoMensalComDetalhe.map(({ detalheAtivacoes, ...rest }) => rest), [resumoMensalComDetalhe]);

  // ========== POR PRAÇA ==========
  const relatorioPraca = useMemo(() => {
    const pracas = selectedPraca === 'TODOS' ? ['BHZ', 'RJ', 'VIX', 'SPO'] : [selectedPraca];
    const start = parseISO(dataInicio);
    const end = parseISO(dataFim);
    return pracas.map(praca => {
      const projPraca = projects.filter((p) => {
        const port = portfolioByProjectId[p.id];
        return getPraca(port?.filial, port?.praca) === praca;
      });
      const portPraca = portfolio.filter(p => getPraca(p.filial, p.praca) === praca);
      const ativadosNoPeriodo = portPraca.filter(p => {
        const dateStr = getEffectiveDate(p);
        if (!dateStr) return false;
        const d = parseISO(dateStr);
        return isWithinInterval(d, { start: startOfMonth(start), end: endOfMonth(end) });
      });
      const receitaTotal = ativadosNoPeriodo.reduce((s, p) => s + (p.mensalidade || 0), 0);
      const taxaTotal = ativadosNoPeriodo.reduce((s, p) => s + (p.taxa_ativacao || 0), 0);
      const emAndamento = projPraca.filter(p => p.implantacao_status === 'EM_EXECUCAO').length;
      const concluidos = projPraca.filter(p => p.implantacao_status === 'CONCLUIDO').length;

      return {
        praca,
        totalProjetos: projPraca.length,
        emAndamento,
        concluidos,
        clientesAtivos: ativadosNoPeriodo.length,
        receitaMensal: receitaTotal,
        taxaAtivacao: taxaTotal,
      };
    });
  }, [projects, portfolio, selectedPraca, dataInicio, dataFim, portfolioByProjectId, projectMap]);

  // ========== HISTÓRICO ==========
  const historicoProjetos = useMemo(() => {
    const start = parseISO(dataInicio);
    const end = parseISO(dataFim);
    return filteredProjects
      .filter(p => {
        const d = parseISO(p.created_at);
        return isWithinInterval(d, { start: startOfMonth(start), end: endOfMonth(end) });
      })
      .map(p => {
        const port = portfolio.find(pt => pt.project_id === p.id);
        const dias = p.implantacao_started_at && p.implantacao_completed_at
          ? differenceInDays(parseISO(p.implantacao_completed_at), parseISO(p.implantacao_started_at))
          : null;
        return {
          projeto: p.numero_projeto,
          cliente: p.cliente_condominio_nome,
          status: p.implantacao_status || '—',
          tipoObra: p.tipo_obra || '—',
          praca: getPraca(port?.filial, port?.praca),
          dataEntrada: p.created_at ? format(parseISO(p.created_at), 'dd/MM/yyyy') : '—',
          inicioObra: p.implantacao_started_at ? format(parseISO(p.implantacao_started_at), 'dd/MM/yyyy') : '—',
          conclusao: p.implantacao_completed_at ? format(parseISO(p.implantacao_completed_at), 'dd/MM/yyyy') : '—',
          diasObra: dias,
          mensalidade: port?.mensalidade || 0,
          taxaAtivacao: port?.taxa_ativacao || 0,
        };
      });
  }, [filteredProjects, portfolio, dataInicio, dataFim]);

  // ========== INDICADORES ==========
  const indicadores = useMemo(() => {
    const concluidos = filteredProjects.filter(p => p.implantacao_status === 'CONCLUIDO');
    const emExecucao = filteredProjects.filter(p => p.implantacao_status === 'EM_EXECUCAO');
    const dias = concluidos
      .map(p => p.implantacao_started_at && p.implantacao_completed_at
        ? differenceInDays(parseISO(p.implantacao_completed_at), parseISO(p.implantacao_started_at))
        : null)
      .filter(Boolean) as number[];

    const tempoMedio = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0;
    const tempoMin = dias.length ? Math.min(...dias) : 0;
    const tempoMax = dias.length ? Math.max(...dias) : 0;
    const taxaConclusao = filteredProjects.length ? Math.round((concluidos.length / filteredProjects.length) * 100) : 0;

    const dentroSLA = concluidos.filter(p => {
      if (!p.prazo_entrega_projeto || !p.implantacao_completed_at) return false;
      return parseISO(p.implantacao_completed_at) <= parseISO(p.prazo_entrega_projeto);
    }).length;
    const slaRate = concluidos.length ? Math.round((dentroSLA / concluidos.length) * 100) : 0;

    const receitaTotal = filteredPortfolio.reduce((s, p) => s + (p.mensalidade || 0), 0);
    const taxaTotal = filteredPortfolio.reduce((s, p) => s + (p.taxa_ativacao || 0), 0);

    return {
      totalProjetos: filteredProjects.length,
      concluidos: concluidos.length,
      emExecucao: emExecucao.length,
      tempoMedio, tempoMin, tempoMax,
      taxaConclusao,
      slaRate, dentroSLA,
      receitaTotal, taxaTotal,
    };
  }, [filteredProjects, filteredPortfolio]);

  // ========== EXPORT FUNCTIONS ==========
  const exportPDF = () => {
    const reportLabel = REPORT_TYPES.find(r => r.value === selectedReport)!.label;
    const periodo = `${format(parseISO(dataInicio), 'dd/MM/yyyy')} a ${format(parseISO(dataFim), 'dd/MM/yyyy')}`;
    const pracaLabel = selectedPraca === 'TODOS' ? 'Todas' : selectedPraca;

    exportImplantacaoPDF({
      selectedReport,
      reportLabel,
      periodo,
      praca: pracaLabel,
      resumoMensal,
      relatorioPraca,
      historicoProjetos,
      indicadores,
      estratificadoMensal: resumoMensalComDetalhe.map(m => ({
        mes: m.mes,
        clientes: m.detalheAtivacoes,
      })).filter(m => m.clientes.length > 0),
    });
    toast.success('PDF gerado com sucesso');
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (selectedReport === 'resumo_mensal') {
      const ws = XLSX.utils.json_to_sheet(resumoMensal.map(r => ({
        'Mês': r.mes, 'Previsto': r.previsto, 'Ativações': r.ativacoes,
        'Churn Previsto': r.churnPrevisto, 'Churn Real': r.cancelamentos, 'Saldo': r.saldo,
        'Receita Prevista': r.receitaPrevista, 'Receita Ativada': r.receitaAtivada,
        'Venda Prevista': r.vendaPrevista, 'Venda Realizada': r.vendaAtivada,
        'Receita Cancelada': r.receitaCancelada, 'Saldo Receita': r.saldoReceita,
        'Atingimento (%)': r.atingimento,
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Resumo Mensal');
    } else if (selectedReport === 'por_praca') {
      const ws = XLSX.utils.json_to_sheet(relatorioPraca.map(r => ({
        'Praça': r.praca, 'Total Projetos': r.totalProjetos, 'Em Andamento': r.emAndamento,
        'Concluídos': r.concluidos, 'Clientes Ativos': r.clientesAtivos,
        'Receita Mensal': r.receitaMensal, 'Taxa Ativação': r.taxaAtivacao,
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Por Praça');
    } else if (selectedReport === 'historico') {
      const ws = XLSX.utils.json_to_sheet(historicoProjetos.map(r => ({
        'Projeto': r.projeto, 'Cliente': r.cliente, 'Status': r.status,
        'Tipo Obra': r.tipoObra, 'Praça': r.praca, 'Data Entrada': r.dataEntrada,
        'Início Obra': r.inicioObra, 'Conclusão': r.conclusao,
        'Dias de Obra': r.diasObra, 'Mensalidade': r.mensalidade, 'Taxa Ativação': r.taxaAtivacao,
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    } else {
      const ind = indicadores;
      const ws = XLSX.utils.aoa_to_sheet([
        ['Indicador', 'Valor'],
        ['Total de Projetos', ind.totalProjetos],
        ['Concluídos', ind.concluidos],
        ['Em Execução', ind.emExecucao],
        ['Tempo Médio (dias)', ind.tempoMedio],
        ['Tempo Mínimo (dias)', ind.tempoMin],
        ['Tempo Máximo (dias)', ind.tempoMax],
        ['Taxa de Conclusão (%)', ind.taxaConclusao],
        ['Dentro do SLA (%)', ind.slaRate],
        ['Receita Mensal Total', ind.receitaTotal],
        ['Taxa Ativação Total', ind.taxaTotal],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Indicadores');
    }

    XLSX.writeFile(wb, `implantacao_${selectedReport}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast.success('Excel gerado com sucesso');
  };

  // ========== RENDER TABLE ==========
  const renderTable = () => {
    if (loading) return <Skeleton className="h-64 w-full" />;

    if (selectedReport === 'resumo_mensal') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Previsto</TableHead>
              <TableHead className="text-right">Ativações</TableHead>
              <TableHead className="text-right">Churn Prev.</TableHead>
              <TableHead className="text-right">Churn Real</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="text-right">Rec. Prevista</TableHead>
              <TableHead className="text-right">Rec. Ativada</TableHead>
              <TableHead className="text-right">Venda Prevista</TableHead>
              <TableHead className="text-right">Venda Realizada</TableHead>
              <TableHead className="text-right">Saldo Receita</TableHead>
              <TableHead className="text-right">Atingimento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumoMensal.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.mes}</TableCell>
                <TableCell className="text-right">{r.previsto}</TableCell>
                <TableCell className="text-right text-green-600 font-medium">{r.ativacoes}</TableCell>
                <TableCell className="text-right text-orange-500">{r.churnPrevisto}</TableCell>
                <TableCell className="text-right text-destructive">{r.cancelamentos}</TableCell>
                <TableCell className={`text-right font-semibold ${r.saldo < 0 ? 'text-destructive' : ''}`}>{r.saldo}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.receitaPrevista)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.receitaAtivada)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.vendaPrevista)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.vendaAtivada)}</TableCell>
                <TableCell className={`text-right font-semibold ${r.saldoReceita < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatCurrency(r.saldoReceita)}</TableCell>
                <TableCell className="text-right">
                  {r.atingimento !== null ? (
                    <Badge variant={r.atingimento >= 100 ? 'default' : r.atingimento >= 50 ? 'secondary' : 'destructive'}>
                      {r.atingimento}%
                    </Badge>
                  ) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (selectedReport === 'por_praca') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Praça</TableHead>
              <TableHead className="text-right">Total Projetos</TableHead>
              <TableHead className="text-right">Em Andamento</TableHead>
              <TableHead className="text-right">Concluídos</TableHead>
              <TableHead className="text-right">Clientes Ativos</TableHead>
              <TableHead className="text-right">Receita Mensal</TableHead>
              <TableHead className="text-right">Taxa Ativação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relatorioPraca.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.praca}</TableCell>
                <TableCell className="text-right">{r.totalProjetos}</TableCell>
                <TableCell className="text-right">{r.emAndamento}</TableCell>
                <TableCell className="text-right">{r.concluidos}</TableCell>
                <TableCell className="text-right">{r.clientesAtivos}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.receitaMensal)}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.taxaAtivacao)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (selectedReport === 'historico') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Praça</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Conclusão</TableHead>
              <TableHead className="text-right">Dias</TableHead>
              <TableHead className="text-right">Mensalidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historicoProjetos.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">#{r.projeto}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.cliente}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'CONCLUIDO' ? 'default' : 'secondary'}>
                    {r.status === 'CONCLUIDO' ? 'Concluído' : r.status === 'EM_EXECUCAO' ? 'Em Execução' : r.status}
                  </Badge>
                </TableCell>
                <TableCell>{r.tipoObra}</TableCell>
                <TableCell>{r.praca}</TableCell>
                <TableCell className="text-sm">{r.dataEntrada}</TableCell>
                <TableCell className="text-sm">{r.inicioObra}</TableCell>
                <TableCell className="text-sm">{r.conclusao}</TableCell>
                <TableCell className="text-right">{r.diasObra ?? '—'}</TableCell>
                <TableCell className="text-right">{formatCurrency(r.mensalidade)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    // Indicadores
    const ind = indicadores;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total de Projetos', value: ind.totalProjetos, icon: <Building className="w-5 h-5" /> },
          { label: 'Concluídos', value: ind.concluidos, icon: <BarChart3 className="w-5 h-5" /> },
          { label: 'Em Execução', value: ind.emExecucao, icon: <Clock className="w-5 h-5" /> },
          { label: 'Tempo Médio (dias)', value: ind.tempoMedio, icon: <Clock className="w-5 h-5" /> },
          { label: 'Tempo Mínimo', value: `${ind.tempoMin} dias`, icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Tempo Máximo', value: `${ind.tempoMax} dias`, icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Taxa de Conclusão', value: `${ind.taxaConclusao}%`, icon: <BarChart3 className="w-5 h-5" /> },
          { label: 'Dentro do SLA', value: `${ind.slaRate}%`, icon: <Calendar className="w-5 h-5" /> },
          { label: 'Receita Mensal Total', value: formatCurrency(ind.receitaTotal), icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Taxa Ativação Total', value: formatCurrency(ind.taxaTotal), icon: <TrendingUp className="w-5 h-5" /> },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{item.icon}</div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/implantacao-analytics')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Relatórios de Implantação</h1>
              <p className="text-muted-foreground text-sm">Exporte dados em PDF ou Excel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
              <FileText className="w-4 h-4" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
          </div>
        </div>

        {/* Report selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {REPORT_TYPES.map(rt => {
            const Icon = rt.icon;
            return (
              <Card
                key={rt.value}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedReport === rt.value ? 'ring-2 ring-primary border-primary' : ''}`}
                onClick={() => setSelectedReport(rt.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${selectedReport === rt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-medium text-sm">{rt.label}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{rt.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Period & Praça filter */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">De:</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">Até:</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedPraca} onValueChange={setSelectedPraca}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Praça" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas as Praças</SelectItem>
                <SelectItem value="BHZ">BHZ</SelectItem>
                <SelectItem value="RJ">RJ</SelectItem>
                <SelectItem value="VIX">VIX</SelectItem>
                <SelectItem value="SPO">SPO</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodoErro && (
            <span className="text-sm text-destructive font-medium">{periodoErro}</span>
          )}
        </div>

        {/* Summary KPIs for the period */}
        {selectedReport === 'resumo_mensal' && resumoMensal.length > 0 && (() => {
          const totPrevisto = resumoMensal.reduce((s, r) => s + r.previsto, 0);
          const totAtivacoes = resumoMensal.reduce((s, r) => s + r.ativacoes, 0);
          const totRecPrev = resumoMensal.reduce((s, r) => s + r.receitaPrevista, 0);
          const totRecAtiv = resumoMensal.reduce((s, r) => s + r.receitaAtivada, 0);
          const totVendaPrev = resumoMensal.reduce((s, r) => s + r.vendaPrevista, 0);
          const totVendaReal = resumoMensal.reduce((s, r) => s + r.vendaAtivada, 0);
          const totSaldo = resumoMensal.reduce((s, r) => s + r.saldoReceita, 0);
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Ativações</p>
                <p className="text-lg font-bold">{totAtivacoes} <span className="text-xs font-normal text-muted-foreground">/ {totPrevisto} prev.</span></p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Rec. Prevista</p>
                <p className="text-lg font-bold">{formatCurrency(totRecPrev)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Rec. Ativada</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totRecAtiv)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Venda Prevista</p>
                <p className="text-lg font-bold">{formatCurrency(totVendaPrev)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Venda Realizada</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(totVendaReal)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Saldo Receita</p>
                <p className={`text-lg font-bold ${totSaldo >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatCurrency(totSaldo)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Atingimento</p>
                <p className="text-lg font-bold">{totPrevisto > 0 ? Math.round((totAtivacoes / totPrevisto) * 100) : (totAtivacoes > 0 ? 100 : 0)}%</p>
              </Card>
            </div>
          );
        })()}

        {/* Data table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {REPORT_TYPES.find(r => r.value === selectedReport)?.label}
            </CardTitle>
            <CardDescription>
              {REPORT_TYPES.find(r => r.value === selectedReport)?.desc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {renderTable()}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
