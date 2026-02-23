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
        'Valor Unitário (R$)': item.valor_unitario || item.valor_locacao || 0,
        'Valor Locação (R$)': (item.valor_locacao || 0),
        'Valor Instalação (R$)': (item.valor_instalacao || 0),
        'Total Locação (R$)': (item.valor_locacao || 0) * (item.qtd || 0),
        'Total Instalação (R$)': (item.valor_instalacao || 0) * (item.qtd || 0),
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
      'Valor Unitário (R$)': '',
      'Valor Locação (R$)': '',
      'Valor Instalação (R$)': '',
      'Total Locação (R$)': rows.slice(0, -1).reduce((s, r) => s + (r['Total Locação (R$)'] || 0), 0),
      'Total Instalação (R$)': rows.slice(0, -1).reduce((s, r) => s + (r['Total Instalação (R$)'] || 0), 0),
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
    { wch: 16 }, // Valor Unitário
    { wch: 16 }, // Valor Locação
    { wch: 16 }, // Valor Instalação
    { wch: 16 }, // Total Locação
    { wch: 16 }, // Total Instalação
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos');

  // Summary sheet
  const summaryRows = [];
  summaryRows.push({ 'Campo': 'Cliente', 'Valor': data.sessao.nome_cliente || '' });
  summaryRows.push({ 'Campo': 'Endereço', 'Valor': data.sessao.endereco || '' });
  summaryRows.push({ 'Campo': 'Consultor', 'Valor': data.sessao.vendedor || '' });
  summaryRows.push({ 'Campo': 'Data', 'Valor': new Date().toLocaleDateString('pt-BR') });
  if (data.itens) {
    summaryRows.push({ 'Campo': '', 'Valor': '' });
    summaryRows.push({ 'Campo': 'Mensalidade', 'Valor': `R$ ${(data.itens.mensalidade_total || 0).toFixed(2)}` });
    summaryRows.push({ 'Campo': 'Taxa de Conexão', 'Valor': `R$ ${(data.itens.taxa_conexao_total || 0).toFixed(2)}` });
  }
  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  ws2['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

  XLSX.writeFile(wb, `equipamentos-emive-${data.sessao.nome_cliente?.replace(/\s+/g, '-').toLowerCase() || 'cliente'}.xlsx`);
}
