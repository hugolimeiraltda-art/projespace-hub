import * as XLSX from 'xlsx';
import type { PropostaData } from '@/components/orcamento/PropostaView';

export function generateEquipamentosExcel(data: PropostaData) {
  const wb = XLSX.utils.book_new();

  // Build rows from expanded items
  const rows: any[] = [];
  
  if (data.itensExpandidos && data.itensExpandidos.length > 0) {
    for (const item of data.itensExpandidos) {
      rows.push({
        'Descrição': item.nome || '',
        'Código': item.codigo || '',
        'Categoria': item.categoria || item.origem || '',
        'Origem': item.origem || '',
        'Qtd': item.qtd || 0,
        'Locação Unitária (R$)': item.valor_locacao || 0,
        'Locação Total (R$)': (item.valor_locacao || 0) * (item.qtd || 0),
        'Instalação Unitária (R$)': item.valor_instalacao || 0,
        'Instalação Total (R$)': (item.valor_instalacao || 0) * (item.qtd || 0),
      });
    }
  }

  // Add totals row
  if (rows.length > 0) {
    rows.push({});
    rows.push({
      'Descrição': 'TOTAL',
      'Código': '',
      'Categoria': '',
      'Origem': '',
      'Qtd': rows.slice(0, -1).reduce((s, r) => s + (r['Qtd'] || 0), 0),
      'Locação Unitária (R$)': '',
      'Locação Total (R$)': rows.slice(0, -1).reduce((s, r) => s + (r['Locação Total (R$)'] || 0), 0),
      'Instalação Unitária (R$)': '',
      'Instalação Total (R$)': rows.slice(0, -1).reduce((s, r) => s + (r['Instalação Total (R$)'] || 0), 0),
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 45 }, // Descrição
    { wch: 12 }, // Código
    { wch: 15 }, // Categoria
    { wch: 20 }, // Origem
    { wch: 6 },  // Qtd
    { wch: 18 }, // Locação Unitária
    { wch: 18 }, // Locação Total
    { wch: 18 }, // Instalação Unitária
    { wch: 18 }, // Instalação Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Detalhado');

  // Sheet 2: Grouped/consolidated items (same product = single row, summed qty)
  const groupedMap = new Map<string, { nome: string; codigo: string; categoria: string; qtd: number; valor_locacao: number; valor_instalacao: number }>();
  
  if (data.itensExpandidos && data.itensExpandidos.length > 0) {
    for (const item of data.itensExpandidos) {
      const key = (item.codigo || item.nome || '').toLowerCase().trim();
      const existing = groupedMap.get(key);
      if (existing) {
        existing.qtd += (item.qtd || 0);
      } else {
        groupedMap.set(key, {
          nome: item.nome || '',
          codigo: item.codigo || '',
          categoria: item.categoria || '',
          qtd: item.qtd || 0,
          valor_locacao: item.valor_locacao || 0,
          valor_instalacao: item.valor_instalacao || 0,
        });
      }
    }
  }

  const groupedRows: any[] = [];
  for (const g of groupedMap.values()) {
    groupedRows.push({
      'Descrição': g.nome,
      'Código': g.codigo,
      'Categoria': g.categoria,
      'Qtd': g.qtd,
      'Locação Unitária (R$)': g.valor_locacao,
      'Locação Total (R$)': g.valor_locacao * g.qtd,
      'Instalação Unitária (R$)': g.valor_instalacao,
      'Instalação Total (R$)': g.valor_instalacao * g.qtd,
    });
  }

  if (groupedRows.length > 0) {
    groupedRows.push({});
    groupedRows.push({
      'Descrição': 'TOTAL',
      'Código': '',
      'Categoria': '',
      'Qtd': groupedRows.slice(0, -1).reduce((s, r) => s + (r['Qtd'] || 0), 0),
      'Locação Unitária (R$)': '',
      'Locação Total (R$)': groupedRows.slice(0, -1).reduce((s, r) => s + (r['Locação Total (R$)'] || 0), 0),
      'Instalação Unitária (R$)': '',
      'Instalação Total (R$)': groupedRows.slice(0, -1).reduce((s, r) => s + (r['Instalação Total (R$)'] || 0), 0),
    });
  }

  const wsGrouped = XLSX.utils.json_to_sheet(groupedRows);
  wsGrouped['!cols'] = [
    { wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 6 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGrouped, 'Agrupado');

  // Summary sheet
  const summaryRows = [];
  summaryRows.push({ 'Campo': 'Cliente', 'Valor': data.sessao.nome_cliente || '' });
  summaryRows.push({ 'Campo': 'Endereço', 'Valor': data.sessao.endereco || '' });
  summaryRows.push({ 'Campo': 'Consultor', 'Valor': data.sessao.vendedor || '' });
  summaryRows.push({ 'Campo': 'Data', 'Valor': new Date().toLocaleDateString('pt-BR') });
  if (data.itens) {
    summaryRows.push({ 'Campo': '', 'Valor': '' });
    summaryRows.push({ 'Campo': 'Mensalidade (Locação)', 'Valor': `R$ ${(data.itens.mensalidade_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });
    summaryRows.push({ 'Campo': 'Taxa de Instalação', 'Valor': `R$ ${(data.itens.taxa_conexao_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });
    summaryRows.push({ 'Campo': 'Parcela (até 10x)', 'Valor': `R$ ${((data.itens.taxa_conexao_total || 0) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` });
  }
  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

  const fileName = `equipamentos-emive-${data.sessao.nome_cliente?.replace(/\s+/g, '-').toLowerCase() || 'cliente'}.xlsx`;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    // iOS Safari: use blob + open in new tab
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const blobUrl = URL.createObjectURL(blob);
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow) {
      // Fallback to download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } else {
    XLSX.writeFile(wb, fileName);
  }
}
