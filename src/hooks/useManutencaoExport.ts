import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pendencia {
  id: string;
  numero_os: string;
  contrato: string;
  razao_social: string;
  numero_ticket: string | null;
  tipo: string;
  setor: string;
  descricao: string | null;
  status: string;
  sla_dias: number;
  data_abertura: string;
  data_prazo: string;
  data_conclusao: string | null;
}

interface Chamado {
  id: string;
  contrato: string;
  razao_social: string;
  tipo: string;
  status: string;
  descricao: string | null;
  equipamentos: string | null;
  tecnico_responsavel: string | null;
  data_agendada: string;
  data_conclusao: string | null;
}

interface Indicadores {
  abertas: number;
  emAndamento: number;
  concluidas: number;
  atrasadas: number;
  tempoMedioConclusao: number | null;
  pendenciasCriticas: number;
  chamadosPreventivos: number;
  chamadosEletivos: number;
  chamadosCorretivos: number;
}

const TIPOS_LABELS: Record<string, string> = {
  CLIENTE_OBRA: 'Obra',
  CLIENTE_AGENDA: 'Agenda do Cliente',
  CLIENTE_LIMPEZA_VEGETACAO: 'Limpeza de Vegetação',
  CLIENTE_CONTRATACAO_SERVICOS: 'Contratação de Serviços',
  DEPT_COMPRAS: 'Compras',
  DEPT_CADASTRO: 'Cadastro',
  DEPT_ALMOXARIFADO: 'Almoxarifado',
  DEPT_FATURAMENTO: 'Faturamento',
  DEPT_CONTAS_RECEBER: 'Contas a Receber',
  DEPT_FISCAL: 'Fiscal',
  DEPT_IMPLANTACAO: 'Implantação',
  PREVENTIVO: 'Preventivo',
  ELETIVO: 'Eletivo',
  CORRETIVO: 'Corretivo',
};

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
  AGENDADO: 'Agendado',
  REAGENDADO: 'Reagendado',
};

export function useManutencaoExport() {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const exportPendenciasXLSX = (pendencias: Pendencia[], filename: string) => {
    const data = pendencias.map(p => ({
      'Nº OS': p.numero_os,
      'Ticket': p.numero_ticket || '-',
      'Cliente': p.razao_social,
      'Contrato': p.contrato,
      'Tipo': TIPOS_LABELS[p.tipo] || p.tipo,
      'Setor': p.setor,
      'Status': STATUS_LABELS[p.status] || p.status,
      'SLA (dias)': p.sla_dias,
      'Data Abertura': formatDate(p.data_abertura),
      'Data Prazo': formatDate(p.data_prazo),
      'Data Conclusão': formatDate(p.data_conclusao),
      'Descrição': p.descricao || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pendências');
    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportChamadosXLSX = (chamados: Chamado[], filename: string) => {
    const data = chamados.map(c => ({
      'Cliente': c.razao_social,
      'Contrato': c.contrato,
      'Tipo': TIPOS_LABELS[c.tipo] || c.tipo,
      'Status': STATUS_LABELS[c.status] || c.status,
      'Técnico Responsável': c.tecnico_responsavel || '-',
      'Data Agendada': formatDate(c.data_agendada),
      'Data Conclusão': formatDate(c.data_conclusao),
      'Equipamentos': c.equipamentos || '-',
      'Descrição': c.descricao || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chamados');
    XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportIndicadoresXLSX = (indicadores: Indicadores, pendencias: Pendencia[], chamados: Chamado[]) => {
    const indicadoresData = [
      { 'Indicador': 'Pendências Abertas', 'Valor': indicadores.abertas },
      { 'Indicador': 'Pendências Em Andamento', 'Valor': indicadores.emAndamento },
      { 'Indicador': 'Pendências Concluídas', 'Valor': indicadores.concluidas },
      { 'Indicador': 'Pendências Atrasadas', 'Valor': indicadores.atrasadas },
      { 'Indicador': 'Tempo Médio de Conclusão (dias)', 'Valor': indicadores.tempoMedioConclusao ?? '-' },
      { 'Indicador': 'Pendências Críticas (24h)', 'Valor': indicadores.pendenciasCriticas },
      { 'Indicador': 'Chamados Preventivos', 'Valor': indicadores.chamadosPreventivos },
      { 'Indicador': 'Chamados Eletivos', 'Valor': indicadores.chamadosEletivos },
      { 'Indicador': 'Chamados Corretivos', 'Valor': indicadores.chamadosCorretivos },
    ];

    const pendenciasData = pendencias.map(p => ({
      'Nº OS': p.numero_os,
      'Ticket': p.numero_ticket || '-',
      'Cliente': p.razao_social,
      'Contrato': p.contrato,
      'Tipo': TIPOS_LABELS[p.tipo] || p.tipo,
      'Setor': p.setor,
      'Status': STATUS_LABELS[p.status] || p.status,
      'Data Abertura': formatDate(p.data_abertura),
      'Data Prazo': formatDate(p.data_prazo),
    }));

    const chamadosData = chamados.map(c => ({
      'Cliente': c.razao_social,
      'Contrato': c.contrato,
      'Tipo': TIPOS_LABELS[c.tipo] || c.tipo,
      'Status': STATUS_LABELS[c.status] || c.status,
      'Técnico': c.tecnico_responsavel || '-',
      'Data Agendada': formatDate(c.data_agendada),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(indicadoresData), 'Indicadores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendenciasData), 'Pendências');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chamadosData), 'Chamados');
    XLSX.writeFile(wb, `Relatorio_Manutencao_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportPendenciasPDF = (pendencias: Pendencia[], titulo: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });
    
    let yPos = 40;
    const lineHeight = 7;
    const margin = 14;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Nº OS', margin + 2, yPos);
    doc.text('Cliente', margin + 25, yPos);
    doc.text('Tipo', margin + 80, yPos);
    doc.text('Status', margin + 110, yPos);
    doc.text('Prazo', margin + 140, yPos);
    doc.text('Setor', margin + 165, yPos);
    
    yPos += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    
    pendencias.forEach((p, index) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, lineHeight, 'F');
      }
      
      doc.text(p.numero_os.substring(0, 12), margin + 2, yPos);
      doc.text(p.razao_social.substring(0, 28), margin + 25, yPos);
      doc.text((TIPOS_LABELS[p.tipo] || p.tipo).substring(0, 15), margin + 80, yPos);
      doc.text((STATUS_LABELS[p.status] || p.status).substring(0, 12), margin + 110, yPos);
      doc.text(formatDate(p.data_prazo), margin + 140, yPos);
      doc.text(p.setor.substring(0, 12), margin + 165, yPos);
      
      yPos += lineHeight;
    });
    
    // Footer with total
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total: ${pendencias.length} pendências`, margin, yPos);
    
    doc.save(`${titulo.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportChamadosPDF = (chamados: Chamado[], titulo: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titulo, pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });
    
    let yPos = 40;
    const lineHeight = 7;
    const margin = 14;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Cliente', margin + 2, yPos);
    doc.text('Contrato', margin + 55, yPos);
    doc.text('Tipo', margin + 85, yPos);
    doc.text('Status', margin + 115, yPos);
    doc.text('Data Agendada', margin + 145, yPos);
    
    yPos += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    
    chamados.forEach((c, index) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, yPos - 4, pageWidth - 2 * margin, lineHeight, 'F');
      }
      
      doc.text(c.razao_social.substring(0, 30), margin + 2, yPos);
      doc.text(c.contrato.substring(0, 15), margin + 55, yPos);
      doc.text((TIPOS_LABELS[c.tipo] || c.tipo).substring(0, 15), margin + 85, yPos);
      doc.text((STATUS_LABELS[c.status] || c.status).substring(0, 15), margin + 115, yPos);
      doc.text(formatDate(c.data_agendada), margin + 145, yPos);
      
      yPos += lineHeight;
    });
    
    // Footer with total
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Total: ${chamados.length} chamados`, margin, yPos);
    
    doc.save(`${titulo.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportRelatorioCompletoPDF = (
    indicadores: Indicadores,
    pendenciasClientes: Pendencia[],
    pendenciasDepartamento: Pendencia[],
    chamados: Chamado[]
  ) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Completo de Manutenção', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: 'center' });
    
    let yPos = 45;
    
    // Indicadores Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores', margin, yPos);
    yPos += 10;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const indicadoresList = [
      ['Pendências Abertas', indicadores.abertas],
      ['Pendências Em Andamento', indicadores.emAndamento],
      ['Pendências Concluídas', indicadores.concluidas],
      ['Pendências Atrasadas', indicadores.atrasadas],
      ['Tempo Médio Conclusão', indicadores.tempoMedioConclusao !== null ? `${indicadores.tempoMedioConclusao} dias` : '-'],
      ['Pendências Críticas (24h)', indicadores.pendenciasCriticas],
      ['Chamados Preventivos', indicadores.chamadosPreventivos],
      ['Chamados Eletivos', indicadores.chamadosEletivos],
      ['Chamados Corretivos', indicadores.chamadosCorretivos],
    ];
    
    indicadoresList.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, margin + 5, yPos);
      yPos += 6;
    });
    
    yPos += 10;
    
    // Pendências de Cliente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pendências de Cliente (${pendenciasClientes.length})`, margin, yPos);
    yPos += 8;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    pendenciasClientes.slice(0, 10).forEach(p => {
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`• ${p.numero_os} - ${p.razao_social.substring(0, 35)} | ${STATUS_LABELS[p.status] || p.status} | Prazo: ${formatDate(p.data_prazo)}`, margin + 3, yPos);
      yPos += 5;
    });
    if (pendenciasClientes.length > 10) {
      doc.text(`... e mais ${pendenciasClientes.length - 10} pendências`, margin + 3, yPos);
      yPos += 5;
    }
    
    yPos += 8;
    
    // Pendências de Departamento
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pendências de Departamento (${pendenciasDepartamento.length})`, margin, yPos);
    yPos += 8;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    pendenciasDepartamento.slice(0, 10).forEach(p => {
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`• ${p.numero_os} - ${p.razao_social.substring(0, 35)} | ${p.setor} | ${STATUS_LABELS[p.status] || p.status}`, margin + 3, yPos);
      yPos += 5;
    });
    if (pendenciasDepartamento.length > 10) {
      doc.text(`... e mais ${pendenciasDepartamento.length - 10} pendências`, margin + 3, yPos);
      yPos += 5;
    }
    
    yPos += 8;
    
    // Chamados
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Chamados de Manutenção (${chamados.length})`, margin, yPos);
    yPos += 8;
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    chamados.slice(0, 15).forEach(c => {
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`• ${c.razao_social.substring(0, 30)} | ${TIPOS_LABELS[c.tipo] || c.tipo} | ${STATUS_LABELS[c.status] || c.status} | ${formatDate(c.data_agendada)}`, margin + 3, yPos);
      yPos += 5;
    });
    if (chamados.length > 15) {
      doc.text(`... e mais ${chamados.length - 15} chamados`, margin + 3, yPos);
    }
    
    doc.save(`Relatorio_Completo_Manutencao_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return {
    exportPendenciasXLSX,
    exportChamadosXLSX,
    exportIndicadoresXLSX,
    exportPendenciasPDF,
    exportChamadosPDF,
    exportRelatorioCompletoPDF,
  };
}
