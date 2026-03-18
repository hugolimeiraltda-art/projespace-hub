import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  Users, UserCheck, UserX, TrendingDown, DollarSign,
  ThumbsUp, Headphones, RefreshCw, FileBarChart, Download,
  Calendar, FileSpreadsheet, FileText,
} from 'lucide-react';
import { format, subMonths, subYears, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const PERIOD_OPTIONS = [
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '1y', label: 'Último ano' },
  { value: '2y', label: 'Últimos 2 anos' },
  { value: '5y', label: 'Últimos 5 anos' },
];

const COLORS = [
  'hsl(20, 90%, 48%)', // primary orange
  'hsl(142, 71%, 45%)', // green
  'hsl(0, 72%, 50%)',   // red
  'hsl(221, 83%, 53%)', // blue
  'hsl(38, 92%, 50%)',  // yellow
  'hsl(270, 70%, 55%)', // purple
];

function getDateRange(period: string) {
  const end = new Date();
  let start: Date;
  switch (period) {
    case '3m': start = subMonths(end, 3); break;
    case '6m': start = subMonths(end, 6); break;
    case '1y': start = subYears(end, 1); break;
    case '2y': start = subYears(end, 2); break;
    case '5y': start = subYears(end, 5); break;
    default: start = subYears(end, 1);
  }
  return { start, end };
}

function formatMonth(date: Date) {
  return format(date, 'MMM/yy', { locale: ptBR });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  color?: string;
}

function KpiCard({ title, value, icon, subtitle, color }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-lg bg-primary/10`} style={color ? { backgroundColor: `${color}20` } : undefined}>
          <div style={color ? { color } : undefined} className={color ? '' : 'text-primary'}>
            {icon}
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SucessoClienteRelatorios() {
  const [period, setPeriod] = useState('1y');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [inativos, setInativos] = useState<any[]>([]);
  const [cancelamentos, setCancelamentos] = useState<any[]>([]);
  const [npsData, setNpsData] = useState<any[]>([]);
  const [chamados, setChamados] = useState<any[]>([]);
  const { toast } = useToast();

  const { start, end } = useMemo(() => getDateRange(period), [period]);
  const months = useMemo(() => eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(end) }), [start, end]);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const [custRes, inaRes, cancRes, npsRes, chamRes] = await Promise.all([
        supabase.from('customer_portfolio').select('id, razao_social, data_ativacao, data_termino, mensalidade, filial, created_at, status_implantacao'),
        supabase.from('clientes_inativos').select('id, razao_social, data_cancelamento, motivo, filial, data_entrada, created_at'),
        supabase.from('customer_cancelamentos').select('id, customer_id, data_cancelamento, motivo, valor_contrato, created_at'),
        supabase.from('customer_nps').select('id, customer_id, nota, created_at'),
        supabase.from('customer_chamados').select('id, customer_id, status, prioridade, created_at, resolved_at'),
      ]);

      setCustomers(custRes.data || []);
      setInativos(inaRes.data || []);
      setCancelamentos(cancRes.data || []);
      setNpsData(npsRes.data || []);
      setChamados(chamRes.data || []);
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar dados dos relatórios.', variant: 'destructive' });
    }
    setLoading(false);
  }

  // ===== Computed Data =====

  // 1. Total Clients Over Time (cumulative)
  const totalClientsChart = useMemo(() => {
    return months.map(month => {
      const monthEnd = endOfMonth(month);
      const ativos = customers.filter(c => {
        const ativacao = c.data_ativacao ? parseISO(c.data_ativacao) : parseISO(c.created_at);
        return ativacao <= monthEnd;
      }).length;
      const inativosCount = inativos.filter(c => {
        const entrada = c.data_entrada ? parseISO(c.data_entrada) : parseISO(c.created_at);
        return entrada <= monthEnd;
      }).length;
      return { month: formatMonth(month), total: ativos + inativosCount, ativos, inativos: inativosCount };
    });
  }, [months, customers, inativos]);

  // 2. Active Clients (monthly growth)
  const activeClientsChart = useMemo(() => {
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const novos = customers.filter(c => {
        const d = c.data_ativacao ? parseISO(c.data_ativacao) : parseISO(c.created_at);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      }).length;
      const acumulado = customers.filter(c => {
        const d = c.data_ativacao ? parseISO(c.data_ativacao) : parseISO(c.created_at);
        return d <= monthEnd;
      }).length;
      return { month: formatMonth(month), novos, acumulado };
    });
  }, [months, customers]);

  // 3. Inactive Clients (by month & motivo)
  const inactiveClientsChart = useMemo(() => {
    return months.map(month => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const count = inativos.filter(c => {
        const d = c.data_cancelamento ? parseISO(c.data_cancelamento) : parseISO(c.created_at);
        return isWithinInterval(d, { start: ms, end: me });
      }).length;
      return { month: formatMonth(month), cancelamentos: count };
    });
  }, [months, inativos]);

  // Motivos pie chart
  const motivosPie = useMemo(() => {
    const map: Record<string, number> = {};
    const filtered = inativos.filter(c => {
      const d = c.data_cancelamento ? parseISO(c.data_cancelamento) : parseISO(c.created_at);
      return isWithinInterval(d, { start, end });
    });
    filtered.forEach(c => {
      const m = c.motivo || 'Não informado';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [inativos, start, end]);

  // 4. Churn Rate
  const churnChart = useMemo(() => {
    return months.map(month => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const baseAtivos = customers.filter(c => {
        const d = c.data_ativacao ? parseISO(c.data_ativacao) : parseISO(c.created_at);
        return d <= ms;
      }).length;
      const canceladosNoMes = cancelamentos.filter(c => {
        const d = parseISO(c.data_cancelamento || c.created_at);
        return isWithinInterval(d, { start: ms, end: me });
      }).length;
      const inativosNoMes = inativos.filter(c => {
        const d = c.data_cancelamento ? parseISO(c.data_cancelamento) : parseISO(c.created_at);
        return isWithinInterval(d, { start: ms, end: me });
      }).length;
      const totalCanc = canceladosNoMes + inativosNoMes;
      const churn = baseAtivos > 0 ? Number(((totalCanc / baseAtivos) * 100).toFixed(2)) : 0;
      return { month: formatMonth(month), churn, cancelados: totalCanc };
    });
  }, [months, customers, cancelamentos, inativos]);

  // 5. Revenue
  const revenueChart = useMemo(() => {
    return months.map(month => {
      const me = endOfMonth(month);
      const ativosNoMes = customers.filter(c => {
        const d = c.data_ativacao ? parseISO(c.data_ativacao) : parseISO(c.created_at);
        return d <= me;
      });
      const receita = ativosNoMes.reduce((sum, c) => sum + (Number(c.mensalidade) || 0), 0);
      const qtd = ativosNoMes.filter(c => Number(c.mensalidade) > 0).length;
      const ticket = qtd > 0 ? receita / qtd : 0;
      return { month: formatMonth(month), receita, ticket };
    });
  }, [months, customers]);

  // 6. NPS
  const npsChart = useMemo(() => {
    return months.map(month => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const notas = npsData.filter(n => {
        const d = parseISO(n.created_at);
        return isWithinInterval(d, { start: ms, end: me });
      });
      const avg = notas.length > 0 ? Number((notas.reduce((s, n) => s + n.nota, 0) / notas.length).toFixed(1)) : null;
      const promotores = notas.filter(n => n.nota >= 9).length;
      const detratores = notas.filter(n => n.nota <= 6).length;
      const nps = notas.length > 0 ? Number((((promotores - detratores) / notas.length) * 100).toFixed(0)) : null;
      return { month: formatMonth(month), media: avg, nps, respostas: notas.length };
    });
  }, [months, npsData]);

  // 7. Chamados
  const chamadosChart = useMemo(() => {
    return months.map(month => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const doMes = chamados.filter(c => {
        const d = parseISO(c.created_at);
        return isWithinInterval(d, { start: ms, end: me });
      });
      const abertos = doMes.length;
      const resolvidos = doMes.filter(c => c.status === 'resolvido').length;
      return { month: formatMonth(month), abertos, resolvidos };
    });
  }, [months, chamados]);

  // 8. Renovações (contratos com data_termino no período)
  const renovacoesChart = useMemo(() => {
    return months.map(month => {
      const ms = startOfMonth(month);
      const me = endOfMonth(month);
      const vencendo = customers.filter(c => {
        if (!c.data_termino) return false;
        const d = parseISO(c.data_termino);
        return isWithinInterval(d, { start: ms, end: me });
      });
      const renovados = vencendo.filter(c => {
        // If data_termino is in the past and customer still active
        const d = parseISO(c.data_termino);
        return d < new Date() && c.status_implantacao !== 'CANCELADO';
      }).length;
      return { month: formatMonth(month), vencendo: vencendo.length, renovados };
    });
  }, [months, customers]);

  // KPIs
  const kpis = useMemo(() => {
    const totalAtivos = customers.length;
    const totalInativos = inativos.length;
    const totalGeral = totalAtivos + totalInativos;
    const receitaTotal = customers.reduce((s, c) => s + (Number(c.mensalidade) || 0), 0);
    const comMensalidade = customers.filter(c => Number(c.mensalidade) > 0);
    const ticketMedio = comMensalidade.length > 0 ? receitaTotal / comMensalidade.length : 0;
    const npsNotas = npsData.length > 0
      ? Number((npsData.reduce((s, n) => s + n.nota, 0) / npsData.length).toFixed(1))
      : 0;
    const chamadosAbertos = chamados.filter(c => c.status !== 'resolvido').length;

    return { totalGeral, totalAtivos, totalInativos, receitaTotal, ticketMedio, npsNotas, chamadosAbertos };
  }, [customers, inativos, npsData, chamados]);

  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label || period;

  const chartLineConfig: ChartConfig = {
    total: { label: 'Total', color: COLORS[3] },
    ativos: { label: 'Ativos', color: COLORS[1] },
    inativos: { label: 'Inativos', color: COLORS[2] },
  };

  // ===== EXPORT EXCEL =====
  function exportExcel() {
    const wb = XLSX.utils.book_new();

    // KPIs
    const kpiSheet = XLSX.utils.json_to_sheet([{
      'Total de Clientes': kpis.totalGeral,
      'Clientes Ativos': kpis.totalAtivos,
      'Clientes Inativos': kpis.totalInativos,
      'Receita Mensal (R$)': kpis.receitaTotal,
      'Ticket Médio (R$)': kpis.ticketMedio,
      'NPS Médio': kpis.npsNotas,
      'Chamados Abertos': kpis.chamadosAbertos,
    }]);
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'Resumo KPIs');

    // Total Clients
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totalClientsChart.map(r => ({
      'Mês': r.month, 'Total': r.total, 'Ativos': r.ativos, 'Inativos': r.inativos,
    }))), 'Evolução Total');

    // Active Clients
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(activeClientsChart.map(r => ({
      'Mês': r.month, 'Novos': r.novos, 'Acumulado': r.acumulado,
    }))), 'Clientes Ativos');

    // Inactive Clients
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inactiveClientsChart.map(r => ({
      'Mês': r.month, 'Cancelamentos': r.cancelamentos,
    }))), 'Clientes Inativos');

    // Motivos
    if (motivosPie.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motivosPie.map(r => ({
        'Motivo': r.name, 'Quantidade': r.value,
      }))), 'Motivos Cancelamento');
    }

    // Churn
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(churnChart.map(r => ({
      'Mês': r.month, 'Churn (%)': r.churn, 'Cancelados': r.cancelados,
    }))), 'Taxa de Churn');

    // Revenue
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(revenueChart.map(r => ({
      'Mês': r.month, 'Receita (R$)': r.receita, 'Ticket Médio (R$)': r.ticket,
    }))), 'Receita');

    // NPS
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(npsChart.map(r => ({
      'Mês': r.month, 'Média': r.media, 'NPS Score': r.nps, 'Respostas': r.respostas,
    }))), 'NPS');

    // Chamados
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chamadosChart.map(r => ({
      'Mês': r.month, 'Abertos': r.abertos, 'Resolvidos': r.resolvidos,
    }))), 'Chamados');

    // Renovações
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(renovacoesChart.map(r => ({
      'Mês': r.month, 'Vencendo': r.vencendo, 'Renovados': r.renovados,
    }))), 'Renovações');

    const fileName = `Relatorio_Sucesso_Cliente_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({ title: 'Excel exportado!', description: fileName });
  }

  // ===== EXPORT PDF =====
  function exportPdf() {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 15;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Sucesso do Cliente', 15, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodLabel} | Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 15, y);
    y += 12;

    // KPIs
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Gerais', 15, y);
    y += 8;

    const kpiItems = [
      ['Total de Clientes', String(kpis.totalGeral)],
      ['Clientes Ativos', String(kpis.totalAtivos)],
      ['Clientes Inativos', String(kpis.totalInativos)],
      ['Receita Mensal', formatCurrency(kpis.receitaTotal)],
      ['Ticket Médio', formatCurrency(kpis.ticketMedio)],
      ['NPS Médio', String(kpis.npsNotas)],
      ['Chamados Abertos', String(kpis.chamadosAbertos)],
    ];

    doc.setFontSize(9);
    kpiItems.forEach(([label, value], i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 15 + col * 68;
      const yy = y + row * 12;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(x, yy - 4, 64, 10, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.text(label, x + 3, yy + 2);
      doc.setFont('helvetica', 'bold');
      doc.text(value, x + 61, yy + 2, { align: 'right' });
    });
    y += Math.ceil(kpiItems.length / 4) * 12 + 8;

    // Helper to add a data table
    function addTable(title: string, headers: string[], rows: string[][]) {
      if (y > ph - 30) { doc.addPage(); y = 15; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 15, y);
      y += 6;

      const colW = (pw - 30) / headers.length;
      // Header row
      doc.setFillColor(51, 51, 51);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.rect(15, y - 4, pw - 30, 6, 'F');
      headers.forEach((h, i) => {
        doc.text(h, 17 + i * colW, y);
      });
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += 5;

      rows.forEach((row, ri) => {
        if (y > ph - 15) { doc.addPage(); y = 15; }
        if (ri % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(15, y - 3.5, pw - 30, 5, 'F');
        }
        row.forEach((cell, ci) => {
          doc.text(String(cell ?? ''), 17 + ci * colW, y);
        });
        y += 5;
      });
      y += 6;
    }

    // Tables
    addTable('Evolução Total de Clientes', ['Mês', 'Total', 'Ativos', 'Inativos'],
      totalClientsChart.map(r => [r.month, String(r.total), String(r.ativos), String(r.inativos)]));

    addTable('Clientes Ativos - Novos por Mês', ['Mês', 'Novos', 'Acumulado'],
      activeClientsChart.map(r => [r.month, String(r.novos), String(r.acumulado)]));

    addTable('Clientes Inativos por Mês', ['Mês', 'Cancelamentos'],
      inactiveClientsChart.map(r => [r.month, String(r.cancelamentos)]));

    if (motivosPie.length > 0) {
      addTable('Motivos de Cancelamento', ['Motivo', 'Quantidade'],
        motivosPie.map(r => [r.name, String(r.value)]));
    }

    addTable('Taxa de Churn', ['Mês', 'Churn (%)', 'Cancelados'],
      churnChart.map(r => [r.month, String(r.churn), String(r.cancelados)]));

    addTable('Receita Mensal', ['Mês', 'Receita (R$)', 'Ticket Médio (R$)'],
      revenueChart.map(r => [r.month, formatCurrency(r.receita), formatCurrency(r.ticket)]));

    addTable('NPS', ['Mês', 'Média', 'NPS Score', 'Respostas'],
      npsChart.map(r => [r.month, String(r.media ?? '-'), String(r.nps ?? '-'), String(r.respostas)]));

    addTable('Chamados', ['Mês', 'Abertos', 'Resolvidos'],
      chamadosChart.map(r => [r.month, String(r.abertos), String(r.resolvidos)]));

    addTable('Renovações', ['Mês', 'Vencendo', 'Renovados'],
      renovacoesChart.map(r => [r.month, String(r.vencendo), String(r.renovados)]));

    const fileName = `Relatorio_Sucesso_Cliente_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    // iOS compatibility
    if (/iPhone|iPad/i.test(navigator.userAgent) && navigator.share) {
      const blob = doc.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      navigator.share({ files: [file] }).catch(() => {
        const dataUri = doc.output('datauristring');
        window.open(dataUri, '_blank');
      });
    } else {
      doc.save(fileName);
    }
    toast({ title: 'PDF exportado!', description: fileName });
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Análise completa de sucesso do cliente</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Total de Clientes" value={kpis.totalGeral} icon={<Users className="h-5 w-5" />} />
          <KpiCard title="Clientes Ativos" value={kpis.totalAtivos} icon={<UserCheck className="h-5 w-5" />} color="hsl(142, 71%, 45%)" />
          <KpiCard title="Clientes Inativos" value={kpis.totalInativos} icon={<UserX className="h-5 w-5" />} color="hsl(0, 72%, 50%)" />
          <KpiCard title="Receita Mensal" value={formatCurrency(kpis.receitaTotal)} icon={<DollarSign className="h-5 w-5" />} subtitle={`Ticket Médio: ${formatCurrency(kpis.ticketMedio)}`} color="hsl(221, 83%, 53%)" />
          <KpiCard title="NPS Médio" value={kpis.npsNotas} icon={<ThumbsUp className="h-5 w-5" />} color="hsl(38, 92%, 50%)" />
          <KpiCard title="Chamados Abertos" value={kpis.chamadosAbertos} icon={<Headphones className="h-5 w-5" />} color="hsl(270, 70%, 55%)" />
          <KpiCard title="Contratos Vencendo" value={customers.filter(c => {
            if (!c.data_termino) return false;
            const d = parseISO(c.data_termino);
            return d >= new Date() && d <= subMonths(new Date(), -3);
          }).length} icon={<RefreshCw className="h-5 w-5" />} subtitle="Próximos 3 meses" />
          <KpiCard title="Taxa de Churn" value={`${churnChart.length > 0 ? churnChart[churnChart.length - 1]?.churn || 0 : 0}%`} icon={<TrendingDown className="h-5 w-5" />} subtitle="Último mês" color="hsl(0, 72%, 50%)" />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Total Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-muted-foreground" />
                Evolução Total de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartLineConfig} className="h-[280px] w-full">
                <AreaChart data={totalClientsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="total" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={0.15} strokeWidth={2} name="Total" />
                  <Area type="monotone" dataKey="ativos" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.15} strokeWidth={2} name="Ativos" />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 2. Active Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4" style={{ color: COLORS[1] }} />
                Clientes Ativos - Novos por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ novos: { label: 'Novos', color: COLORS[1] }, acumulado: { label: 'Acumulado', color: COLORS[3] } }} className="h-[280px] w-full">
                <BarChart data={activeClientsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="novos" fill={COLORS[1]} radius={[4, 4, 0, 0]} name="Novos" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 3. Inactive Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserX className="h-4 w-4" style={{ color: COLORS[2] }} />
                Clientes Inativos por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ cancelamentos: { label: 'Cancelamentos', color: COLORS[2] } }} className="h-[280px] w-full">
                <BarChart data={inactiveClientsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="cancelamentos" fill={COLORS[2]} radius={[4, 4, 0, 0]} name="Cancelamentos" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Motivos Cancelamento Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChart className="h-4 w-4 text-muted-foreground" />
                Motivos de Cancelamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {motivosPie.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-10">Nenhum cancelamento no período.</p>
              ) : (
                <ChartContainer config={{}} className="h-[280px] w-full">
                  <PieChart>
                    <Pie
                      data={motivosPie}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {motivosPie.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* 4. Churn */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4" style={{ color: COLORS[2] }} />
                Taxa de Churn (%)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ churn: { label: 'Churn %', color: COLORS[2] } }} className="h-[280px] w-full">
                <LineChart data={churnChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="churn" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name="Churn %" />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 5. Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" style={{ color: COLORS[3] }} />
                Receita Mensal e Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ receita: { label: 'Receita', color: COLORS[3] }, ticket: { label: 'Ticket Médio', color: COLORS[4] } }} className="h-[280px] w-full">
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="receita" fill={COLORS[3]} radius={[4, 4, 0, 0]} name="Receita" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 6. NPS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ThumbsUp className="h-4 w-4" style={{ color: COLORS[4] }} />
                NPS - Evolução Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ nps: { label: 'NPS', color: COLORS[4] }, media: { label: 'Média', color: COLORS[1] } }} className="h-[280px] w-full">
                <LineChart data={npsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="media" stroke={COLORS[1]} strokeWidth={2} dot={{ r: 3 }} name="Nota Média" connectNulls />
                  <Line type="monotone" dataKey="nps" stroke={COLORS[4]} strokeWidth={2} dot={{ r: 3 }} name="NPS Score" connectNulls />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 7. Chamados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Headphones className="h-4 w-4" style={{ color: COLORS[5] }} />
                Chamados por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ abertos: { label: 'Abertos', color: COLORS[5] }, resolvidos: { label: 'Resolvidos', color: COLORS[1] } }} className="h-[280px] w-full">
                <BarChart data={chamadosChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="abertos" fill={COLORS[5]} radius={[4, 4, 0, 0]} name="Abertos" />
                  <Bar dataKey="resolvidos" fill={COLORS[1]} radius={[4, 4, 0, 0]} name="Resolvidos" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 8. Renovações */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCw className="h-4 w-4" style={{ color: COLORS[0] }} />
                Contratos - Vencimentos e Renovações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ vencendo: { label: 'Vencendo', color: COLORS[0] }, renovados: { label: 'Renovados', color: COLORS[1] } }} className="h-[280px] w-full">
                <BarChart data={renovacoesChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="vencendo" fill={COLORS[0]} radius={[4, 4, 0, 0]} name="Vencendo" />
                  <Bar dataKey="renovados" fill={COLORS[1]} radius={[4, 4, 0, 0]} name="Renovados" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
