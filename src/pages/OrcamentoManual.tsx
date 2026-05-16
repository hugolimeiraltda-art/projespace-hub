import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, FileSpreadsheet, FileText, Calculator, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Produto = {
  id: string; nome: string; codigo: string | null; categoria: string;
  preco_unitario: number; valor_minimo: number; valor_locacao: number;
  valor_minimo_locacao: number; valor_instalacao: number;
};
type Kit = {
  id: string; nome: string; codigo: string | null; categoria: string;
  preco_kit: number; valor_minimo: number; valor_locacao: number;
  valor_minimo_locacao: number; valor_instalacao: number;
  itens?: { produto_id: string; quantidade: number; produto?: Produto }[];
};
type LinhaKit = { kit_id: string; qtd: number };
type LinhaProd = { produto_id: string; qtd: number };
type LinhaServico = { descricao: string; qtd: number; valor_unit: number };

const fmtBRL = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function OrcamentoManual() {
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  const [cliente, setCliente] = useState('');
  const [obs, setObs] = useState('');

  const [linhasKits, setLinhasKits] = useState<LinhaKit[]>([]);
  const [linhasProds, setLinhasProds] = useState<LinhaProd[]>([]);
  const [linhasServ, setLinhasServ] = useState<LinhaServico[]>([]);

  const [filtroKit, setFiltroKit] = useState('');
  const [filtroProd, setFiltroProd] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: prods }, { data: ks }] = await Promise.all([
        supabase.from('orcamento_produtos').select('id,nome,codigo,categoria,preco_unitario,valor_minimo,valor_locacao,valor_minimo_locacao,valor_instalacao').eq('ativo', true).order('nome'),
        supabase.from('orcamento_kits').select('id,nome,codigo,categoria,preco_kit,valor_minimo,valor_locacao,valor_minimo_locacao,valor_instalacao').eq('ativo', true).order('nome'),
      ]);
      const produtosList = (prods as any) || [];
      const kitsList = (ks as any) || [];
      if (kitsList.length) {
        const { data: itens } = await supabase.from('orcamento_kit_itens').select('kit_id, produto_id, quantidade').in('kit_id', kitsList.map((k: any) => k.id));
        kitsList.forEach((k: Kit) => {
          k.itens = (itens || []).filter((i: any) => i.kit_id === k.id).map((i: any) => ({ ...i, produto: produtosList.find((p: Produto) => p.id === i.produto_id) }));
        });
      }
      setProdutos(produtosList);
      setKits(kitsList);
      setLoading(false);
    })();
  }, []);

  const kitsFiltrados = useMemo(() => kits.filter(k => !filtroKit || k.nome.toLowerCase().includes(filtroKit.toLowerCase()) || (k.codigo || '').toLowerCase().includes(filtroKit.toLowerCase())), [kits, filtroKit]);
  const produtosFiltrados = useMemo(() => produtos.filter(p => !filtroProd || p.nome.toLowerCase().includes(filtroProd.toLowerCase()) || (p.codigo || '').toLowerCase().includes(filtroProd.toLowerCase())), [produtos, filtroProd]);

  const addKit = (kit_id: string) => setLinhasKits(p => {
    const existing = p.find(l => l.kit_id === kit_id);
    if (existing) return p.map(l => l === existing ? { ...l, qtd: l.qtd + 1 } : l);
    return [...p, { kit_id, qtd: 1 }];
  });
  const addProd = (produto_id: string) => setLinhasProds(p => {
    const existing = p.find(l => l.produto_id === produto_id);
    if (existing) return p.map(l => l === existing ? { ...l, qtd: l.qtd + 1 } : l);
    return [...p, { produto_id, qtd: 1 }];
  });
  const addServ = () => setLinhasServ(p => [...p, { descricao: '', qtd: 1, valor_unit: 0 }]);

  // Build composed rows
  const linhasComputadas = useMemo(() => {
    const rows: any[] = [];
    linhasKits.forEach(lk => {
      const kit = kits.find(k => k.id === lk.kit_id); if (!kit) return;
      rows.push({
        tipo: 'KIT', origem: kit.nome, codigo: kit.codigo || '', nome: kit.nome, qtd: lk.qtd,
        preco_unitario: kit.preco_kit, valor_minimo: kit.valor_minimo,
        valor_locacao: kit.valor_locacao, valor_minimo_locacao: kit.valor_minimo_locacao,
        valor_instalacao: kit.valor_instalacao,
      });
      (kit.itens || []).forEach(it => {
        if (!it.produto) return;
        const q = it.quantidade * lk.qtd;
        rows.push({
          tipo: 'KIT-ITEM', origem: kit.nome, codigo: it.produto.codigo || '', nome: '  ↳ ' + it.produto.nome, qtd: q,
          preco_unitario: it.produto.preco_unitario, valor_minimo: it.produto.valor_minimo,
          valor_locacao: it.produto.valor_locacao, valor_minimo_locacao: it.produto.valor_minimo_locacao,
          valor_instalacao: it.produto.valor_instalacao, isItem: true,
        });
      });
    });
    linhasProds.forEach(lp => {
      const p = produtos.find(x => x.id === lp.produto_id); if (!p) return;
      rows.push({
        tipo: 'PRODUTO', origem: 'Avulso', codigo: p.codigo || '', nome: p.nome, qtd: lp.qtd,
        preco_unitario: p.preco_unitario, valor_minimo: p.valor_minimo,
        valor_locacao: p.valor_locacao, valor_minimo_locacao: p.valor_minimo_locacao,
        valor_instalacao: p.valor_instalacao,
      });
    });
    linhasServ.forEach(ls => {
      rows.push({
        tipo: 'SERVIÇO', origem: 'Serviço', codigo: '', nome: ls.descricao || '(serviço)', qtd: ls.qtd,
        preco_unitario: ls.valor_unit, valor_minimo: ls.valor_unit,
        valor_locacao: 0, valor_minimo_locacao: 0, valor_instalacao: ls.valor_unit,
      });
    });
    return rows;
  }, [linhasKits, linhasProds, linhasServ, kits, produtos]);

  const totais = useMemo(() => {
    // Sum only KIT (not KIT-ITEM), PRODUTO, SERVIÇO to avoid double counting
    const rows = linhasComputadas.filter(r => r.tipo !== 'KIT-ITEM');
    return rows.reduce((acc, r) => ({
      atual: acc.atual + r.preco_unitario * r.qtd,
      minimo: acc.minimo + r.valor_minimo * r.qtd,
      locacao: acc.locacao + r.valor_locacao * r.qtd,
      minLocacao: acc.minLocacao + r.valor_minimo_locacao * r.qtd,
      instalacao: acc.instalacao + r.valor_instalacao * r.qtd,
    }), { atual: 0, minimo: 0, locacao: 0, minLocacao: 0, instalacao: 0 });
  }, [linhasComputadas]);

  const exportExcel = () => {
    if (linhasComputadas.length === 0) { toast({ title: 'Adicione itens ao orçamento', variant: 'destructive' }); return; }
    const rows = linhasComputadas.map(r => ({
      'Tipo': r.tipo, 'Origem': r.origem, 'Código': r.codigo, 'Descrição': r.nome.replace(/^\s+↳\s/, ''), 'Qtd': r.qtd,
      'Val. Atual Unit.': r.preco_unitario, 'Val. Atual Total': r.preco_unitario * r.qtd,
      'Val. Mínimo Unit.': r.valor_minimo, 'Val. Mínimo Total': r.valor_minimo * r.qtd,
      'Locação Unit.': r.valor_locacao, 'Locação Total': r.valor_locacao * r.qtd,
      'Mín. Locação Unit.': r.valor_minimo_locacao, 'Mín. Locação Total': r.valor_minimo_locacao * r.qtd,
      'Instalação Unit.': r.valor_instalacao, 'Instalação Total': r.valor_instalacao * r.qtd,
    }));
    rows.push({
      'Tipo': '', 'Origem': '', 'Código': '', 'Descrição': 'TOTAL', 'Qtd': '' as any,
      'Val. Atual Unit.': '' as any, 'Val. Atual Total': totais.atual,
      'Val. Mínimo Unit.': '' as any, 'Val. Mínimo Total': totais.minimo,
      'Locação Unit.': '' as any, 'Locação Total': totais.locacao,
      'Mín. Locação Unit.': '' as any, 'Mín. Locação Total': totais.minLocacao,
      'Instalação Unit.': '' as any, 'Instalação Total': totais.instalacao,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 42 }, { wch: 6 }, ...Array(10).fill({ wch: 15 })];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orçamento Manual');
    const safe = (cliente || 'orcamento-manual').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    XLSX.writeFile(wb, `${safe}.xlsx`);
  };

  const exportPDF = () => {
    if (linhasComputadas.length === 0) { toast({ title: 'Adicione itens ao orçamento', variant: 'destructive' }); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14); doc.text('Orçamento Manual', 40, 40);
    doc.setFontSize(10);
    if (cliente) doc.text(`Cliente: ${cliente}`, 40, 58);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 40, 72);

    autoTable(doc, {
      startY: 90, styles: { fontSize: 7, cellPadding: 3 }, headStyles: { fillColor: [60, 60, 60] },
      head: [['Tipo', 'Código', 'Descrição', 'Qtd', 'Atual', 'Mínimo', 'Locação', 'Mín.Loc.', 'Instalação']],
      body: linhasComputadas.map(r => [
        r.tipo === 'KIT-ITEM' ? '' : r.tipo, r.codigo, r.nome, r.qtd,
        fmtBRL(r.preco_unitario * r.qtd), fmtBRL(r.valor_minimo * r.qtd),
        fmtBRL(r.valor_locacao * r.qtd), fmtBRL(r.valor_minimo_locacao * r.qtd),
        fmtBRL(r.valor_instalacao * r.qtd),
      ]),
      foot: [['', '', 'TOTAL', '', fmtBRL(totais.atual), fmtBRL(totais.minimo), fmtBRL(totais.locacao), fmtBRL(totais.minLocacao), fmtBRL(totais.instalacao)]],
      footStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
    });

    if (obs) {
      const y = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(9); doc.text('Observações:', 40, y);
      doc.setFontSize(8); doc.text(doc.splitTextToSize(obs, 750), 40, y + 14);
    }

    const safe = (cliente || 'orcamento-manual').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    doc.save(`${safe}.pdf`);
  };

  return (
    <Layout>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6" /> Orçamento Manual</h1>
            <p className="text-sm text-muted-foreground">Monte um orçamento adicionando kits, produtos avulsos e serviços.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
            <Button variant="outline" onClick={exportPDF}><FileText className="h-4 w-4 mr-2" />PDF</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Cliente / Identificação</Label><Input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nome do cliente ou referência" /></div>
            <div><Label>Observações</Label><Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Notas opcionais" /></div>
          </CardContent>
        </Card>

        <Tabs defaultValue="kits">
          <TabsList>
            <TabsTrigger value="kits">Adicionar Kits</TabsTrigger>
            <TabsTrigger value="produtos">Adicionar Produtos</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
          </TabsList>

          <TabsContent value="kits">
            <Card><CardContent className="p-4 space-y-3">
              <div className="relative max-w-md">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar kit..." value={filtroKit} onChange={e => setFiltroKit(e.target.value)} />
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                {loading && <div className="p-3 text-sm text-muted-foreground">Carregando...</div>}
                {!loading && kitsFiltrados.slice(0, 50).map(k => (
                  <div key={k.id} className="flex items-center justify-between p-2 hover:bg-muted/50">
                    <div className="text-sm"><span className="font-mono text-xs text-muted-foreground mr-2">{k.codigo || '-'}</span>{k.nome} <Badge variant="outline" className="ml-2 text-[10px]">{k.categoria}</Badge></div>
                    <Button size="sm" variant="ghost" onClick={() => addKit(k.id)}><Plus className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="produtos">
            <Card><CardContent className="p-4 space-y-3">
              <div className="relative max-w-md">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar produto..." value={filtroProd} onChange={e => setFiltroProd(e.target.value)} />
              </div>
              <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                {loading && <div className="p-3 text-sm text-muted-foreground">Carregando...</div>}
                {!loading && produtosFiltrados.slice(0, 80).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 hover:bg-muted/50">
                    <div className="text-sm"><span className="font-mono text-xs text-muted-foreground mr-2">{p.codigo || '-'}</span>{p.nome} <Badge variant="outline" className="ml-2 text-[10px]">{p.categoria}</Badge></div>
                    <Button size="sm" variant="ghost" onClick={() => addProd(p.id)} disabled={!!linhasProds.find(l => l.produto_id === p.id)}><Plus className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="servicos">
            <Card><CardContent className="p-4 space-y-3">
              <Button size="sm" variant="outline" onClick={addServ}><Plus className="h-4 w-4 mr-2" />Adicionar serviço</Button>
              <div className="space-y-2">
                {linhasServ.map((ls, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6"><Label className="text-xs">Descrição</Label><Input value={ls.descricao} onChange={e => setLinhasServ(p => p.map((x, idx) => idx === i ? { ...x, descricao: e.target.value } : x))} /></div>
                    <div className="col-span-2"><Label className="text-xs">Qtd</Label><Input type="number" min={1} value={ls.qtd} onChange={e => setLinhasServ(p => p.map((x, idx) => idx === i ? { ...x, qtd: Number(e.target.value) || 0 } : x))} /></div>
                    <div className="col-span-3"><Label className="text-xs">Valor unit. (R$)</Label><Input type="number" step="0.01" value={ls.valor_unit} onChange={e => setLinhasServ(p => p.map((x, idx) => idx === i ? { ...x, valor_unit: Number(e.target.value) || 0 } : x))} /></div>
                    <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => setLinhasServ(p => p.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                  </div>
                ))}
                {linhasServ.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço adicionado.</p>}
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        {/* Items selected lists with qty */}
        {(linhasKits.length > 0 || linhasProds.length > 0) && (
          <Card><CardHeader><CardTitle className="text-base">Itens selecionados</CardTitle></CardHeader><CardContent className="p-4 space-y-3">
            {linhasKits.map(lk => {
              const kit = kits.find(k => k.id === lk.kit_id); if (!kit) return null;
              return (
                <div key={lk.kit_id} className="flex items-center gap-3 border rounded-md p-2">
                  <Badge className="bg-primary text-primary-foreground">Kit</Badge>
                  <span className="flex-1 text-sm">{kit.nome}</span>
                  <Input type="number" min={1} value={lk.qtd} onChange={e => setLinhasKits(p => p.map(x => x.kit_id === lk.kit_id ? { ...x, qtd: Number(e.target.value) || 1 } : x))} className="w-20" />
                  <Button size="icon" variant="ghost" onClick={() => setLinhasKits(p => p.filter(x => x.kit_id !== lk.kit_id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              );
            })}
            {linhasProds.map(lp => {
              const p = produtos.find(x => x.id === lp.produto_id); if (!p) return null;
              return (
                <div key={lp.produto_id} className="flex items-center gap-3 border rounded-md p-2">
                  <Badge variant="secondary">Avulso</Badge>
                  <span className="flex-1 text-sm">{p.nome}</span>
                  <Input type="number" min={1} value={lp.qtd} onChange={e => setLinhasProds(prev => prev.map(x => x.produto_id === lp.produto_id ? { ...x, qtd: Number(e.target.value) || 1 } : x))} className="w-20" />
                  <Button size="icon" variant="ghost" onClick={() => setLinhasProds(prev => prev.filter(x => x.produto_id !== lp.produto_id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              );
            })}
          </CardContent></Card>
        )}

        {/* Final table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tabela do Orçamento</CardTitle>
            <div className="text-xs text-muted-foreground">{linhasComputadas.length} linhas</div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs">
                  <th className="px-2 py-2 text-left">Tipo</th>
                  <th className="px-2 py-2 text-left">Código</th>
                  <th className="px-2 py-2 text-left">Descrição</th>
                  <th className="px-2 py-2 text-center">Qtd</th>
                  <th className="px-2 py-2 text-right">Val. Atual</th>
                  <th className="px-2 py-2 text-right">Val. Mínimo</th>
                  <th className="px-2 py-2 text-right">Locação</th>
                  <th className="px-2 py-2 text-right">Mín. Locação</th>
                  <th className="px-2 py-2 text-right">Instalação</th>
                </tr>
              </thead>
              <tbody>
                {linhasComputadas.map((r, i) => (
                  <tr key={i} className={`border-b last:border-0 ${r.isItem ? 'bg-muted/30 text-xs text-muted-foreground' : ''}`}>
                    <td className="px-2 py-1.5">{r.isItem ? '' : <Badge variant="outline" className="text-[10px]">{r.tipo}</Badge>}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{r.codigo}</td>
                    <td className="px-2 py-1.5">{r.nome}</td>
                    <td className="px-2 py-1.5 text-center">{r.qtd}</td>
                    <td className="px-2 py-1.5 text-right">{fmtBRL(r.preco_unitario * r.qtd)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtBRL(r.valor_minimo * r.qtd)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtBRL(r.valor_locacao * r.qtd)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtBRL(r.valor_minimo_locacao * r.qtd)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtBRL(r.valor_instalacao * r.qtd)}</td>
                  </tr>
                ))}
                {linhasComputadas.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-muted-foreground text-sm">Adicione kits, produtos ou serviços para montar o orçamento.</td></tr>
                )}
              </tbody>
              {linhasComputadas.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/50 font-semibold">
                    <td className="px-2 py-2" colSpan={4}>TOTAL</td>
                    <td className="px-2 py-2 text-right">{fmtBRL(totais.atual)}</td>
                    <td className="px-2 py-2 text-right">{fmtBRL(totais.minimo)}</td>
                    <td className="px-2 py-2 text-right">{fmtBRL(totais.locacao)}</td>
                    <td className="px-2 py-2 text-right">{fmtBRL(totais.minLocacao)}</td>
                    <td className="px-2 py-2 text-right">{fmtBRL(totais.instalacao)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
