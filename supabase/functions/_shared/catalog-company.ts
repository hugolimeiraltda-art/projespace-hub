export type EmpresaCatalogo = 'emive' | 'graber';
export type Disponibilidade = EmpresaCatalogo | 'ambas';

export const disponibilidadeLabel = (value: string) =>
  ({ ambas: 'Ambas', emive: 'Apenas Emive', graber: 'Apenas Graber' }[value] || value);

export function empresaPorFilial(filial?: string | null): EmpresaCatalogo {
  return ['SPO', 'SP', 'SÃO PAULO-SP', 'SAO PAULO-SP', 'SÃO PAULO', 'SAO PAULO'].includes((filial || '').trim().toUpperCase()) ? 'graber' : 'emive';
}

export function disponivelPara(item: { disponibilidade?: string | null; ativo?: boolean }, empresa: EmpresaCatalogo) {
  return item.ativo !== false && (item.disponibilidade === 'ambas' || item.disponibilidade === empresa);
}

export type CatalogPriceItem = {
  codigo?: string | null;
  codigo_srv?: string | null;
  disponibilidade?: string | null;
  ativo?: boolean;
  preco_unitario?: number;
  preco_kit?: number;
  valor_locacao?: number;
  valor_instalacao?: number;
  valor_venda_graber?: number | null;
  valor_locacao_graber?: number | null;
};

export function precosEmpresa(item: CatalogPriceItem, empresa: EmpresaCatalogo, percentualInstalacao = 10) {
  const venda = empresa === 'graber' ? item.valor_venda_graber ?? null : item.preco_unitario ?? item.preco_kit ?? 0;
  const locacao = empresa === 'graber' ? item.valor_locacao_graber ?? null : item.valor_locacao ?? 0;
  return {
    codigo: (empresa === 'graber' ? item.codigo_srv : item.codigo) || '',
    venda,
    locacao,
    instalacao: empresa === 'graber' ? (venda === null ? null : Math.round(venda * percentualInstalacao) / 100) : item.valor_instalacao ?? 0,
    completo: disponivelPara(item, empresa) && venda !== null && locacao !== null,
  };
}

export function somaPrecosKit(itens: { produto?: CatalogPriceItem; quantidade: number }[]) {
  const total = { preco_kit: 0, valor_locacao: 0, valor_instalacao: 0, valor_venda_graber: 0 as number | null, valor_locacao_graber: 0 as number | null };
  for (const { produto: p, quantidade: qtd } of itens) {
    if (!p) { total.valor_venda_graber = null; total.valor_locacao_graber = null; continue; }
    total.preco_kit += (p.preco_unitario ?? 0) * qtd;
    total.valor_locacao += (p.valor_locacao ?? 0) * qtd;
    total.valor_instalacao += (p.valor_instalacao ?? 0) * qtd;
    total.valor_venda_graber = total.valor_venda_graber === null || p.valor_venda_graber == null ? null : total.valor_venda_graber + p.valor_venda_graber * qtd;
    total.valor_locacao_graber = total.valor_locacao_graber === null || p.valor_locacao_graber == null ? null : total.valor_locacao_graber + p.valor_locacao_graber * qtd;
  }
  return total;
}

export function kitDisponivel(kit: CatalogPriceItem, produtos: CatalogPriceItem[], empresa: EmpresaCatalogo) {
  return disponivelPara(kit, empresa) && produtos.every(p => disponivelPara(p, empresa));
}

export function catalogoEmpresa<T extends CatalogPriceItem & { subgrupo?: string | null }>(items: T[], empresa: EmpresaCatalogo, regras: Record<string, number> = {}): T[] {
  return items.flatMap(item => {
    const pct = regras[item.subgrupo === 'Serviço' ? 'servico_valor_instalacao' : 'valor_instalacao'] ?? 10;
    const price = precosEmpresa(item, empresa, pct);
    if (!price.completo || price.venda === null || price.locacao === null || price.instalacao === null) return [];
    return [{ ...item, codigo: price.codigo, preco_unitario: price.venda, preco_kit: price.venda, valor_locacao: price.locacao, valor_instalacao: price.instalacao }];
  });
}

export function itemNoCatalogo(item: { nome?: string; codigo?: string; id_kit?: number; id_produto?: number }, catalog: { nome?: string; codigo?: string | null; id_kit?: number | null; id_produto?: number | null }[]) {
  return catalog.find(c =>
    (item.id_kit != null && c.id_kit === item.id_kit) ||
    (item.id_produto != null && c.id_produto === item.id_produto) ||
    (Boolean(item.codigo) && c.codigo === item.codigo) ||
    (Boolean(item.nome) && c.nome?.trim().toLowerCase() === item.nome?.trim().toLowerCase())
  );
}