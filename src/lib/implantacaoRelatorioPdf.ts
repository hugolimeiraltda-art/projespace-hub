import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// Color palette
const COLORS = {
  primary: [15, 76, 129] as [number, number, number],       // #0f4c81
  primaryLight: [230, 241, 250] as [number, number, number], // light blue bg
  success: [22, 163, 74] as [number, number, number],        // green
  successLight: [220, 252, 231] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],         // red
  dangerLight: [254, 226, 226] as [number, number, number],
  warning: [234, 138, 0] as [number, number, number],        // orange
  warningLight: [255, 243, 224] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  grayLight: [243, 244, 246] as [number, number, number],
  dark: [31, 41, 55] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  headerBg: [15, 76, 129] as [number, number, number],
  rowAlt: [248, 250, 252] as [number, number, number],
};

interface ResumoMensal {
  mes: string;
  previsto: number;
  ativacoes: number;
  cancelamentos: number;
  churnPrevisto: number;
  saldo: number;
  receitaPrevista: number;
  receitaAtivada: number;
  vendaPrevista: number;
  vendaAtivada: number;
  saldoReceita: number;
  atingimento: number;
}

interface RelatorioPraca {
  praca: string;
  totalProjetos: number;
  emAndamento: number;
  concluidos: number;
  clientesAtivos: number;
  receitaMensal: number;
  taxaAtivacao: number;
}

interface HistoricoProjeto {
  projeto: string | number;
  cliente: string;
  status: string;
  tipoObra: string;
  praca: string;
  dataEntrada: string;
  inicioObra: string;
  conclusao: string;
  diasObra: number | null;
  mensalidade: number;
  taxaAtivacao: number;
}

interface Indicadores {
  totalProjetos: number;
  concluidos: number;
  emExecucao: number;
  tempoMedio: number;
  tempoMin: number;
  tempoMax: number;
  taxaConclusao: number;
  slaRate: number;
  dentroSLA: number;
  receitaTotal: number;
  taxaTotal: number;
}

interface PdfExportData {
  selectedReport: string;
  reportLabel: string;
  periodo: string;
  praca: string;
  resumoMensal: ResumoMensal[];
  relatorioPraca: RelatorioPraca[];
  historicoProjetos: HistoricoProjeto[];
  indicadores: Indicadores;
}

// Helper class for drawing
class PdfBuilder {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  margin = 14;
  y = 0;
  contentW: number;

  constructor(doc: jsPDF) {
    this.doc = doc;
    this.pageW = doc.internal.pageSize.getWidth();
    this.pageH = doc.internal.pageSize.getHeight();
    this.contentW = this.pageW - this.margin * 2;
  }

  checkPage(needed: number) {
    if (this.y + needed > this.pageH - 15) {
      this.doc.addPage();
      this.y = 20;
    }
  }

  drawRect(x: number, y: number, w: number, h: number, color: [number, number, number], radius = 0) {
    this.doc.setFillColor(...color);
    if (radius > 0) {
      this.doc.roundedRect(x, y, w, h, radius, radius, 'F');
    } else {
      this.doc.rect(x, y, w, h, 'F');
    }
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, color: [number, number, number], width = 0.5) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(width);
    this.doc.line(x1, y1, x2, y2);
  }

  text(str: string, x: number, y: number, opts?: { color?: [number, number, number]; size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; maxWidth?: number }) {
    const { color = COLORS.dark, size = 9, bold = false, align = 'left', maxWidth } = opts || {};
    this.doc.setTextColor(...color);
    this.doc.setFontSize(size);
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    if (maxWidth) {
      const truncated = this.truncateText(str, maxWidth);
      this.doc.text(truncated, x, y, { align });
    } else {
      this.doc.text(str, x, y, { align });
    }
  }

  truncateText(str: string, maxWidth: number): string {
    const w = this.doc.getTextWidth(str);
    if (w <= maxWidth) return str;
    let text = str;
    while (text.length > 0 && this.doc.getTextWidth(text + '…') > maxWidth) {
      text = text.slice(0, -1);
    }
    return text + '…';
  }
}

// ============ HEADER ============
function drawHeader(b: PdfBuilder, data: PdfExportData) {
  // Header bar
  b.drawRect(0, 0, b.pageW, 36, COLORS.primary);
  b.text('RELATÓRIO DE IMPLANTAÇÃO', b.margin + 2, 14, { color: COLORS.white, size: 16, bold: true });
  b.text(data.reportLabel, b.margin + 2, 23, { color: [180, 210, 240], size: 10 });
  b.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, b.pageW - b.margin - 2, 14, { color: [180, 210, 240], size: 8, align: 'right' });
  b.text(`Período: ${data.periodo}  |  Praça: ${data.praca}`, b.pageW - b.margin - 2, 23, { color: [180, 210, 240], size: 8, align: 'right' });
  b.y = 44;
}

// ============ KPI CARDS ============
function drawKpiCard(b: PdfBuilder, x: number, y: number, w: number, h: number, label: string, value: string, color: [number, number, number], bgColor: [number, number, number]) {
  b.drawRect(x, y, w, h, bgColor, 3);
  // Left accent bar
  b.drawRect(x, y, 3, h, color, 1.5);
  b.text(label, x + 8, y + 10, { color: COLORS.gray, size: 7 });
  b.text(value, x + 8, y + 20, { color, size: 12, bold: true });
}

function drawKpiRow(b: PdfBuilder, cards: { label: string; value: string; color: [number, number, number]; bg: [number, number, number] }[]) {
  b.checkPage(32);
  const gap = 4;
  const count = cards.length;
  const cardW = (b.contentW - (count - 1) * gap) / count;
  const cardH = 28;
  cards.forEach((card, i) => {
    drawKpiCard(b, b.margin + i * (cardW + gap), b.y, cardW, cardH, card.label, card.value, card.color, card.bg);
  });
  b.y += cardH + 8;
}

// ============ SECTION TITLE ============
function drawSectionTitle(b: PdfBuilder, title: string, icon?: string) {
  b.checkPage(16);
  b.drawLine(b.margin, b.y, b.pageW - b.margin, b.y, COLORS.grayLight, 0.3);
  b.y += 8;
  const displayTitle = icon ? `${icon}  ${title}` : title;
  b.text(displayTitle, b.margin, b.y, { color: COLORS.primary, size: 12, bold: true });
  b.y += 3;
  b.drawLine(b.margin, b.y, b.margin + 40, b.y, COLORS.primary, 1.5);
  b.y += 8;
}

// ============ TABLE ============
interface TableConfig {
  headers: string[];
  colWidths: number[];
  aligns: ('left' | 'center' | 'right')[];
  rows: { cells: string[]; colors?: ([number, number, number] | null)[] }[];
}

function drawTable(b: PdfBuilder, config: TableConfig) {
  const { headers, colWidths, aligns, rows } = config;
  const rowH = 8;
  const headerH = 10;

  // Calculate absolute positions
  const totalRatio = colWidths.reduce((a, c) => a + c, 0);
  const absWidths = colWidths.map(w => (w / totalRatio) * b.contentW);
  const colX: number[] = [];
  let cx = b.margin;
  absWidths.forEach(w => { colX.push(cx); cx += w; });

  // Header
  b.checkPage(headerH + rowH * Math.min(rows.length, 3));
  b.drawRect(b.margin, b.y, b.contentW, headerH, COLORS.primary, 2);
  headers.forEach((h, i) => {
    const tx = aligns[i] === 'right' ? colX[i] + absWidths[i] - 3 : colX[i] + 3;
    b.text(h, tx, b.y + 7, { color: COLORS.white, size: 7, bold: true, align: aligns[i] });
  });
  b.y += headerH;

  // Rows
  rows.forEach((row, ri) => {
    b.checkPage(rowH + 2);
    if (ri % 2 === 0) {
      b.drawRect(b.margin, b.y, b.contentW, rowH, COLORS.rowAlt);
    }
    row.cells.forEach((cell, ci) => {
      const tx = aligns[ci] === 'right' ? colX[ci] + absWidths[ci] - 3 : colX[ci] + 3;
      const cellColor = row.colors?.[ci] || COLORS.dark;
      b.text(cell, tx, b.y + 5.5, { color: cellColor, size: 7, align: aligns[ci], maxWidth: absWidths[ci] - 6 });
    });
    b.y += rowH;
  });

  // Bottom border
  b.drawLine(b.margin, b.y, b.pageW - b.margin, b.y, COLORS.grayLight, 0.5);
  b.y += 4;
}

// ============ INSIGHTS ============
function drawInsightBox(b: PdfBuilder, text: string, type: 'success' | 'warning' | 'danger' | 'info') {
  const colorMap = {
    success: { bg: COLORS.successLight, accent: COLORS.success, icon: '✓' },
    warning: { bg: COLORS.warningLight, accent: COLORS.warning, icon: '⚠' },
    danger: { bg: COLORS.dangerLight, accent: COLORS.danger, icon: '✕' },
    info: { bg: COLORS.primaryLight, accent: COLORS.primary, icon: 'ℹ' },
  };
  const c = colorMap[type];
  b.checkPage(16);
  b.drawRect(b.margin, b.y, b.contentW, 14, c.bg, 3);
  b.drawRect(b.margin, b.y, 3, 14, c.accent, 1.5);
  b.text(`${c.icon}  ${text}`, b.margin + 8, b.y + 9, { color: c.accent, size: 8, bold: true });
  b.y += 18;
}

// ============ BAR CHART (simple horizontal) ============
function drawBarChart(b: PdfBuilder, items: { label: string; value: number; maxValue: number; color: [number, number, number] }[], title: string) {
  b.checkPage(14 + items.length * 14);
  drawSectionTitle(b, title);
  const barMaxW = b.contentW * 0.55;
  const labelW = 60;
  const valueW = 60;

  items.forEach(item => {
    b.checkPage(14);
    const barW = item.maxValue > 0 ? (item.value / item.maxValue) * barMaxW : 0;
    b.text(item.label, b.margin, b.y + 6, { size: 7, color: COLORS.dark, maxWidth: labelW });
    b.drawRect(b.margin + labelW + 4, b.y + 1, Math.max(barW, 2), 8, item.color, 2);
    b.text(String(item.value), b.margin + labelW + barMaxW + 8, b.y + 6, { size: 7, bold: true, color: item.color });
    b.y += 12;
  });
  b.y += 4;
}

// ============ MINI DONUT (simple arc representation) ============
function drawProgressCircle(b: PdfBuilder, x: number, y: number, radius: number, percentage: number, color: [number, number, number], label: string) {
  // Background circle
  b.doc.setFillColor(...COLORS.grayLight);
  b.doc.circle(x, y, radius, 'F');
  // Filled arc (approximated with a wedge)
  if (percentage > 0) {
    b.doc.setFillColor(...color);
    const angle = (percentage / 100) * 360;
    const startAngle = -90;
    const endAngle = startAngle + angle;
    // Draw filled segments
    const segments = Math.max(1, Math.round(angle / 10));
    const points: number[][] = [[x, y]];
    for (let i = 0; i <= segments; i++) {
      const a = ((startAngle + (angle * i) / segments) * Math.PI) / 180;
      points.push([x + radius * Math.cos(a), y + radius * Math.sin(a)]);
    }
    // Draw as filled polygon
    if (points.length >= 3) {
      b.doc.setFillColor(...color);
      // Use lines to approximate
      for (let i = 1; i < points.length - 1; i++) {
        const triangle = [points[0], points[i], points[i + 1]];
        b.doc.triangle(
          triangle[0][0], triangle[0][1],
          triangle[1][0], triangle[1][1],
          triangle[2][0], triangle[2][1],
          'F'
        );
      }
    }
    // Inner circle for donut effect
    b.doc.setFillColor(...COLORS.white);
    b.doc.circle(x, y, radius * 0.6, 'F');
  }
  // Percentage text
  b.text(`${percentage}%`, x, y + 2, { color: COLORS.dark, size: 10, bold: true, align: 'center' });
  b.text(label, x, y + radius + 6, { color: COLORS.gray, size: 7, align: 'center' });
}

// ============ FOOTER ============
function drawFooter(b: PdfBuilder) {
  const totalPages = b.doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    b.doc.setPage(i);
    b.drawLine(b.margin, b.pageH - 12, b.pageW - b.margin, b.pageH - 12, COLORS.grayLight, 0.3);
    b.text('Emive — Sistema de Gestão de Implantação', b.margin, b.pageH - 7, { color: COLORS.gray, size: 7 });
    b.text(`Página ${i} de ${totalPages}`, b.pageW - b.margin, b.pageH - 7, { color: COLORS.gray, size: 7, align: 'right' });
  }
}

// ============ REPORT: RESUMO MENSAL ============
function buildResumoMensal(b: PdfBuilder, data: PdfExportData) {
  const rm = data.resumoMensal;
  if (!rm.length) return;

  // Totals
  const totPrev = rm.reduce((s, r) => s + r.previsto, 0);
  const totAtiv = rm.reduce((s, r) => s + r.ativacoes, 0);
  const totChurn = rm.reduce((s, r) => s + r.cancelamentos, 0);
  const totRecPrev = rm.reduce((s, r) => s + r.receitaPrevista, 0);
  const totRecAtiv = rm.reduce((s, r) => s + r.receitaAtivada, 0);
  const totVendaPrev = rm.reduce((s, r) => s + r.vendaPrevista, 0);
  const totVendaReal = rm.reduce((s, r) => s + r.vendaAtivada, 0);
  const totSaldoRec = rm.reduce((s, r) => s + r.saldoReceita, 0);
  const atingGlobal = totPrev > 0 ? Math.round((totAtiv / totPrev) * 100) : (totAtiv > 0 ? 100 : 0);

  // KPI Row
  drawKpiRow(b, [
    { label: 'Ativações', value: `${totAtiv} / ${totPrev}`, color: COLORS.primary, bg: COLORS.primaryLight },
    { label: 'Rec. Prevista', value: formatCurrency(totRecPrev), color: COLORS.gray, bg: COLORS.grayLight },
    { label: 'Rec. Ativada', value: formatCurrency(totRecAtiv), color: COLORS.success, bg: COLORS.successLight },
    { label: 'Saldo Receita', value: formatCurrency(totSaldoRec), color: totSaldoRec >= 0 ? COLORS.success : COLORS.danger, bg: totSaldoRec >= 0 ? COLORS.successLight : COLORS.dangerLight },
  ]);

  drawKpiRow(b, [
    { label: 'Venda Prevista', value: formatCurrency(totVendaPrev), color: COLORS.gray, bg: COLORS.grayLight },
    { label: 'Venda Realizada', value: formatCurrency(totVendaReal), color: COLORS.success, bg: COLORS.successLight },
    { label: 'Churn (Real)', value: String(totChurn), color: COLORS.danger, bg: COLORS.dangerLight },
    { label: 'Atingimento', value: `${atingGlobal}%`, color: atingGlobal >= 100 ? COLORS.success : atingGlobal >= 50 ? COLORS.warning : COLORS.danger, bg: atingGlobal >= 100 ? COLORS.successLight : atingGlobal >= 50 ? COLORS.warningLight : COLORS.dangerLight },
  ]);

  // Insights
  if (totSaldoRec > 0) {
    drawInsightBox(b, `Receita ativada superou a previsão em ${formatCurrency(totSaldoRec)} no período`, 'success');
  } else if (totSaldoRec < 0) {
    drawInsightBox(b, `Receita ativada ficou ${formatCurrency(Math.abs(totSaldoRec))} abaixo da previsão`, 'danger');
  }
  if (atingGlobal < 50) {
    drawInsightBox(b, `Atingimento de ${atingGlobal}% está abaixo da meta — atenção necessária`, 'warning');
  } else if (atingGlobal >= 100) {
    drawInsightBox(b, `Meta de ativações atingida! ${totAtiv} ativações de ${totPrev} previstas`, 'success');
  }

  // Bar chart: ativações por mês
  const maxAtiv = Math.max(...rm.map(r => Math.max(r.ativacoes, r.previsto)), 1);
  drawBarChart(b, rm.map(r => ({
    label: r.mes,
    value: r.ativacoes,
    maxValue: maxAtiv,
    color: r.ativacoes >= r.previsto ? COLORS.success : COLORS.warning,
  })), 'Ativações por Mês');

  // Table
  drawSectionTitle(b, 'Detalhamento Mensal');
  drawTable(b, {
    headers: ['Mês', 'Prev.', 'Ativ.', 'Churn P.', 'Churn R.', 'Saldo', 'Rec. Prevista', 'Rec. Ativada', 'Venda Prev.', 'Venda Real.', 'Saldo Rec.', 'Ating.'],
    colWidths: [10, 6, 6, 7, 7, 6, 12, 12, 10, 10, 10, 7],
    aligns: ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
    rows: rm.map(r => ({
      cells: [
        r.mes, String(r.previsto), String(r.ativacoes), String(r.churnPrevisto), String(r.cancelamentos),
        String(r.saldo), formatCurrency(r.receitaPrevista), formatCurrency(r.receitaAtivada),
        formatCurrency(r.vendaPrevista), formatCurrency(r.vendaAtivada), formatCurrency(r.saldoReceita),
        `${r.atingimento}%`,
      ],
      colors: [
        null, null, COLORS.success, COLORS.warning, COLORS.danger,
        r.saldo < 0 ? COLORS.danger : COLORS.success, null, COLORS.success,
        null, COLORS.success, r.saldoReceita < 0 ? COLORS.danger : COLORS.success,
        r.atingimento >= 100 ? COLORS.success : r.atingimento >= 50 ? COLORS.warning : COLORS.danger,
      ],
    })),
  });

  // Totals row
  b.checkPage(12);
  b.drawRect(b.margin, b.y, b.contentW, 10, COLORS.primaryLight, 2);
  b.text('TOTAL', b.margin + 3, b.y + 7, { color: COLORS.primary, size: 8, bold: true });
  b.text(`${totAtiv} ativ.  |  ${formatCurrency(totRecAtiv)} receita  |  ${formatCurrency(totSaldoRec)} saldo  |  ${atingGlobal}% ating.`, b.pageW - b.margin - 3, b.y + 7, { color: COLORS.primary, size: 7, bold: true, align: 'right' });
  b.y += 14;
}

// ============ REPORT: POR PRACA ============
function buildPorPraca(b: PdfBuilder, data: PdfExportData) {
  const rp = data.relatorioPraca;
  if (!rp.length) return;

  const totProjetos = rp.reduce((s, r) => s + r.totalProjetos, 0);
  const totReceita = rp.reduce((s, r) => s + r.receitaMensal, 0);
  const totTaxa = rp.reduce((s, r) => s + r.taxaAtivacao, 0);

  drawKpiRow(b, [
    { label: 'Total Projetos', value: String(totProjetos), color: COLORS.primary, bg: COLORS.primaryLight },
    { label: 'Receita Mensal', value: formatCurrency(totReceita), color: COLORS.success, bg: COLORS.successLight },
    { label: 'Taxa Ativação', value: formatCurrency(totTaxa), color: COLORS.warning, bg: COLORS.warningLight },
    { label: 'Praças Ativas', value: String(rp.length), color: COLORS.primary, bg: COLORS.primaryLight },
  ]);

  // Bar chart comparison
  const maxRec = Math.max(...rp.map(r => r.receitaMensal), 1);
  drawBarChart(b, rp.map(r => ({
    label: r.praca, value: Math.round(r.receitaMensal), maxValue: maxRec, color: COLORS.primary,
  })), 'Receita Mensal por Praça');

  // Table
  drawSectionTitle(b, 'Detalhamento por Praça');
  drawTable(b, {
    headers: ['Praça', 'Projetos', 'Em Andamento', 'Concluídos', 'Clientes Ativos', 'Receita Mensal', 'Taxa Ativação'],
    colWidths: [10, 10, 12, 10, 12, 15, 15],
    aligns: ['left', 'right', 'right', 'right', 'right', 'right', 'right'],
    rows: rp.map(r => ({
      cells: [
        r.praca, String(r.totalProjetos), String(r.emAndamento), String(r.concluidos),
        String(r.clientesAtivos), formatCurrency(r.receitaMensal), formatCurrency(r.taxaAtivacao),
      ],
    })),
  });

  // Insights
  const topPraca = [...rp].sort((a, c) => c.receitaMensal - a.receitaMensal)[0];
  if (topPraca) {
    drawInsightBox(b, `${topPraca.praca} lidera em receita mensal com ${formatCurrency(topPraca.receitaMensal)}`, 'info');
  }
  const emAndamentoTotal = rp.reduce((s, r) => s + r.emAndamento, 0);
  if (emAndamentoTotal > 0) {
    drawInsightBox(b, `${emAndamentoTotal} projetos em andamento aguardando conclusão`, 'warning');
  }
}

// ============ REPORT: HISTORICO ============
function buildHistorico(b: PdfBuilder, data: PdfExportData) {
  const hp = data.historicoProjetos;
  if (!hp.length) return;

  const concluidos = hp.filter(p => p.status === 'CONCLUIDO');
  const emExecucao = hp.filter(p => p.status === 'EM_EXECUCAO');
  const totalMensal = hp.reduce((s, p) => s + p.mensalidade, 0);

  drawKpiRow(b, [
    { label: 'Total Projetos', value: String(hp.length), color: COLORS.primary, bg: COLORS.primaryLight },
    { label: 'Concluídos', value: String(concluidos.length), color: COLORS.success, bg: COLORS.successLight },
    { label: 'Em Execução', value: String(emExecucao.length), color: COLORS.warning, bg: COLORS.warningLight },
    { label: 'Receita Mensal', value: formatCurrency(totalMensal), color: COLORS.success, bg: COLORS.successLight },
  ]);

  const STATUS_LABELS: Record<string, string> = {
    CONCLUIDO: 'Concluído', EM_EXECUCAO: 'Em Execução', PENDENTE: 'Pendente',
  };

  drawSectionTitle(b, 'Lista de Projetos');
  drawTable(b, {
    headers: ['Projeto', 'Cliente', 'Status', 'Tipo', 'Praça', 'Entrada', 'Início', 'Conclusão', 'Dias', 'Mensalidade'],
    colWidths: [8, 18, 10, 9, 7, 10, 10, 10, 6, 12],
    aligns: ['left', 'left', 'left', 'left', 'left', 'left', 'left', 'left', 'right', 'right'],
    rows: hp.map(r => ({
      cells: [
        `#${r.projeto}`, r.cliente, STATUS_LABELS[r.status] || r.status, r.tipoObra, r.praca,
        r.dataEntrada, r.inicioObra, r.conclusao, r.diasObra !== null ? String(r.diasObra) : '—',
        formatCurrency(r.mensalidade),
      ],
      colors: [
        null, null,
        r.status === 'CONCLUIDO' ? COLORS.success : r.status === 'EM_EXECUCAO' ? COLORS.warning : null,
        null, null, null, null, null, null, null,
      ],
    })),
  });
}

// ============ REPORT: INDICADORES ============
function buildIndicadores(b: PdfBuilder, data: PdfExportData) {
  const ind = data.indicadores;

  drawKpiRow(b, [
    { label: 'Total Projetos', value: String(ind.totalProjetos), color: COLORS.primary, bg: COLORS.primaryLight },
    { label: 'Concluídos', value: String(ind.concluidos), color: COLORS.success, bg: COLORS.successLight },
    { label: 'Em Execução', value: String(ind.emExecucao), color: COLORS.warning, bg: COLORS.warningLight },
    { label: 'Taxa Conclusão', value: `${ind.taxaConclusao}%`, color: ind.taxaConclusao >= 70 ? COLORS.success : COLORS.warning, bg: ind.taxaConclusao >= 70 ? COLORS.successLight : COLORS.warningLight },
  ]);

  drawKpiRow(b, [
    { label: 'Tempo Médio', value: `${ind.tempoMedio} dias`, color: COLORS.primary, bg: COLORS.primaryLight },
    { label: 'Tempo Mínimo', value: `${ind.tempoMin} dias`, color: COLORS.success, bg: COLORS.successLight },
    { label: 'Tempo Máximo', value: `${ind.tempoMax} dias`, color: COLORS.danger, bg: COLORS.dangerLight },
    { label: 'Dentro do SLA', value: `${ind.slaRate}%`, color: ind.slaRate >= 80 ? COLORS.success : COLORS.danger, bg: ind.slaRate >= 80 ? COLORS.successLight : COLORS.dangerLight },
  ]);

  drawKpiRow(b, [
    { label: 'Receita Mensal', value: formatCurrency(ind.receitaTotal), color: COLORS.success, bg: COLORS.successLight },
    { label: 'Taxa Ativação', value: formatCurrency(ind.taxaTotal), color: COLORS.warning, bg: COLORS.warningLight },
    { label: 'SLA', value: `${ind.dentroSLA}/${ind.concluidos}`, color: COLORS.primary, bg: COLORS.primaryLight },
    { label: 'Projetos', value: `${ind.concluidos + ind.emExecucao}`, color: COLORS.primary, bg: COLORS.primaryLight },
  ]);

  // Progress circles
  b.checkPage(50);
  drawSectionTitle(b, 'Indicadores Visuais');
  const circleY = b.y + 18;
  const spacing = b.contentW / 3;
  drawProgressCircle(b, b.margin + spacing * 0.5, circleY, 14, ind.taxaConclusao, COLORS.success, 'Taxa Conclusão');
  drawProgressCircle(b, b.margin + spacing * 1.5, circleY, 14, ind.slaRate, ind.slaRate >= 80 ? COLORS.success : COLORS.danger, 'Dentro do SLA');
  drawProgressCircle(b, b.margin + spacing * 2.5, circleY, 14, Math.min(100, Math.round((ind.emExecucao / Math.max(ind.totalProjetos, 1)) * 100)), COLORS.warning, 'Em Execução');
  b.y = circleY + 28;

  // Insights
  if (ind.tempoMedio > 60) {
    drawInsightBox(b, `Tempo médio de ${ind.tempoMedio} dias — considere otimizar processos de implantação`, 'warning');
  } else {
    drawInsightBox(b, `Tempo médio de ${ind.tempoMedio} dias está dentro do esperado`, 'success');
  }
  if (ind.slaRate < 80) {
    drawInsightBox(b, `Apenas ${ind.slaRate}% dos projetos concluídos dentro do SLA — ponto de atenção`, 'danger');
  }
  if (ind.taxaConclusao >= 80) {
    drawInsightBox(b, `Excelente taxa de conclusão de ${ind.taxaConclusao}%`, 'success');
  }

  // Detailed table
  drawSectionTitle(b, 'Resumo de Indicadores');
  drawTable(b, {
    headers: ['Indicador', 'Valor'],
    colWidths: [60, 40],
    aligns: ['left', 'right'],
    rows: [
      { cells: ['Total de Projetos', String(ind.totalProjetos)] },
      { cells: ['Projetos Concluídos', String(ind.concluidos)], colors: [null, COLORS.success] },
      { cells: ['Projetos em Execução', String(ind.emExecucao)], colors: [null, COLORS.warning] },
      { cells: ['Tempo Médio de Obra (dias)', String(ind.tempoMedio)] },
      { cells: ['Tempo Mínimo (dias)', String(ind.tempoMin)], colors: [null, COLORS.success] },
      { cells: ['Tempo Máximo (dias)', String(ind.tempoMax)], colors: [null, COLORS.danger] },
      { cells: ['Taxa de Conclusão', `${ind.taxaConclusao}%`], colors: [null, ind.taxaConclusao >= 70 ? COLORS.success : COLORS.danger] },
      { cells: ['Dentro do SLA', `${ind.slaRate}% (${ind.dentroSLA} de ${ind.concluidos})`], colors: [null, ind.slaRate >= 80 ? COLORS.success : COLORS.danger] },
      { cells: ['Receita Mensal Total', formatCurrency(ind.receitaTotal)], colors: [null, COLORS.success] },
      { cells: ['Taxa de Ativação Total', formatCurrency(ind.taxaTotal)] },
    ],
  });
}

// ============ MAIN EXPORT ============
export function exportImplantacaoPDF(data: PdfExportData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const b = new PdfBuilder(doc);

  drawHeader(b, data);

  switch (data.selectedReport) {
    case 'resumo_mensal': buildResumoMensal(b, data); break;
    case 'por_praca': buildPorPraca(b, data); break;
    case 'historico': buildHistorico(b, data); break;
    case 'indicadores': buildIndicadores(b, data); break;
  }

  drawFooter(b);

  doc.save(`implantacao_${data.selectedReport}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
