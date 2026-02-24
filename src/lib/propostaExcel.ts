import * as XLSX from 'xlsx';
import type { PropostaData } from '@/components/orcamento/PropostaView';

function buildExpandedRows(data: PropostaData) {
  // If itensExpandidos exists and has data, use it
  if (data.itensExpandidos && data.itensExpandidos.length > 0) {
    return data.itensExpandidos.map((item: any) => ({
      nome: item.nome || '',
      codigo: item.codigo || '',
      categoria: item.categoria || item.origem || '',
      origem: item.origem || '',
      qtd: item.qtd || 0,
      valor_locacao: item.valor_locacao || 0,
      valor_instalacao: item.valor_instalacao || 0,
    }));
  }

  // Fallback: build from structured itens
  const items: any[] = [];
  const itens = data.itens;
  if (itens) {
    for (const kit of (itens.kits || [])) {
      items.push({ nome: kit.nome, codigo: kit.codigo || '', categoria: 'Kit', origem: 'Kit', qtd: kit.qtd, valor_locacao: kit.valor_locacao || 0, valor_instalacao: kit.valor_instalacao || 0 });
    }
    for (const av of (itens.avulsos || [])) {
      items.push({ nome: av.nome, codigo: av.codigo || '', categoria: 'Avulso', origem: 'Avulso', qtd: av.qtd, valor_locacao: av.valor_locacao || 0, valor_instalacao: av.valor_instalacao || 0 });
    }
    for (const ap of (itens.aproveitados || [])) {
      items.push({ nome: ap.nome, codigo: ap.codigo || '', categoria: 'Aproveitado', origem: 'Aproveitado (50%)', qtd: ap.qtd, valor_locacao: ap.valor_locacao || 0, valor_instalacao: ap.valor_instalacao || 0 });
    }
    for (const sv of (itens.servicos || [])) {
      items.push({ nome: sv.nome, codigo: sv.codigo || '', categoria: 'Serviço', origem: 'Serviço', qtd: sv.qtd, valor_locacao: sv.valor_locacao || 0, valor_instalacao: sv.valor_instalacao || 0 });
    }
  }

  if (items.length > 0) return items;

  // Last fallback: build from ambientes
  const ambientes = itens?.ambientes || [];
  for (const amb of ambientes) {
    for (const eq of amb.equipamentos) {
      const match = eq.match(/^([\d.]+)x?\s+(.+)$/i);
      const qtd = match ? parseFloat(match[1]) : 1;
      const nome = match ? match[2] : eq;
      items.push({ nome, codigo: '', categoria: amb.nome, origem: amb.nome, qtd, valor_locacao: 0, valor_instalacao: 0 });
    }
  }

  return items;
}

export async function generateEquipamentosExcel(data: PropostaData) {
  const wb = XLSX.utils.book_new();

  const expandedItems = buildExpandedRows(data);

  // Sheet 1: Detailed
  const rows: any[] = expandedItems.map(item => ({
    'Descrição': item.nome,
    'Código': item.codigo,
    'Categoria': item.categoria,
    'Origem': item.origem,
    'Qtd': item.qtd,
    'Locação Unitária (R$)': item.valor_locacao,
    'Locação Total (R$)': item.valor_locacao * item.qtd,
    'Instalação Unitária (R$)': item.valor_instalacao,
    'Instalação Total (R$)': item.valor_instalacao * item.qtd,
  }));

  if (rows.length > 0) {
    rows.push({});
    rows.push({
      'Descrição': 'TOTAL',
      'Qtd': expandedItems.reduce((s, r) => s + r.qtd, 0),
      'Locação Total (R$)': expandedItems.reduce((s, r) => s + r.valor_locacao * r.qtd, 0),
      'Instalação Total (R$)': expandedItems.reduce((s, r) => s + r.valor_instalacao * r.qtd, 0),
    });
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 20 },
    { wch: 6 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Detalhado');

  // Sheet 2: Grouped
  const groupedMap = new Map<string, { nome: string; codigo: string; categoria: string; qtd: number; valor_locacao: number; valor_instalacao: number }>();
  for (const item of expandedItems) {
    const key = (item.codigo || item.nome || '').toLowerCase().trim();
    const existing = groupedMap.get(key);
    if (existing) {
      existing.qtd += item.qtd;
    } else {
      groupedMap.set(key, { ...item });
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
    const dataRows = groupedRows.filter(r => r['Descrição']);
    groupedRows.push({});
    groupedRows.push({
      'Descrição': 'TOTAL',
      'Qtd': dataRows.reduce((s, r) => s + (r['Qtd'] || 0), 0),
      'Locação Total (R$)': dataRows.reduce((s, r) => s + (r['Locação Total (R$)'] || 0), 0),
      'Instalação Total (R$)': dataRows.reduce((s, r) => s + (r['Instalação Total (R$)'] || 0), 0),
    });
  }

  const wsGrouped = XLSX.utils.json_to_sheet(groupedRows);
  wsGrouped['!cols'] = [
    { wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 6 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsGrouped, 'Agrupado');

  // Sheet 3: Summary
  const summaryRows: any[] = [];
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

  // Download
  const fileName = `equipamentos-emive-${data.sessao.nome_cliente?.replace(/\s+/g, '-').toLowerCase() || 'cliente'}.xlsx`;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS && navigator.share && navigator.canShare) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return;
      } catch {}
    }
  }

  if (isIOS) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    XLSX.writeFile(wb, fileName);
  }
}
