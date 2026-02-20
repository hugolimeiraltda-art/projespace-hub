import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Package, Boxes, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, SlidersHorizontal } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Currency formatting helpers
const formatBRL = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseBRL = (value: string): string => {
  // Remove thousand separators (.) and replace decimal comma with dot
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return num.toString();
};

const GRUPOS = [
  { value: 'Smartportaria', label: 'Smartportaria' },
  { value: 'Cftv', label: 'CFTV' },
  { value: 'Alarme', label: 'Alarme' },
  { value: 'Ambos', label: 'Ambos' },
];

const SUBGRUPOS = [
  { value: 'Controle', label: 'Controle' },
  { value: 'Cabo', label: 'Cabo' },
  { value: 'Camera', label: 'Câmera' },
  { value: 'Cftv', label: 'CFTV' },
  { value: 'Comunicador', label: 'Comunicador' },
  { value: 'Fonte', label: 'Fonte' },
  { value: 'Gabinete', label: 'Gabinete' },
  { value: 'Central', label: 'Central' },
  { value: 'Cerca', label: 'Cerca' },
  { value: 'Bateria', label: 'Bateria' },
  { value: 'Serviço', label: 'Serviço' },
  { value: 'Suporte', label: 'Suporte' },
  { value: 'Transformador', label: 'Transformador' },
  { value: 'Transmissor', label: 'Transmissor' },
  { value: 'Sensor Magnetico', label: 'Sensor Magnético' },
  { value: 'Receptor', label: 'Receptor' },
  { value: 'Radio', label: 'Rádio' },
  { value: 'Teclado', label: 'Teclado' },
  { value: 'Kit', label: 'Kit' },
  { value: 'Anunciador', label: 'Anunciador' },
  { value: 'Arame', label: 'Arame' },
  { value: 'Sirene', label: 'Sirene' },
];

const UNIDADES = [
  { value: 'un', label: 'Unidade' },
  { value: 'kit', label: 'Kit' },
  { value: 'metro', label: 'Metro' },
  { value: 'metro_linear', label: 'Metro Linear' },
];

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  subgrupo: string | null;
  codigo: string | null;
  preco_unitario: number;
  unidade: string;
  qtd_max: number;
  valor_minimo: number;
  valor_locacao: number;
  valor_instalacao: number;
  valor_minimo_locacao: number;
  adicional: boolean;
  ativo: boolean;
  historico_alteracoes?: { user_name: string; alteracao: string; data: string }[];
  updated_by_name?: string;
}

interface Kit {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  preco_kit: number;
  valor_minimo: number;
  valor_locacao: number;
  valor_minimo_locacao: number;
  valor_instalacao: number;
  ativo: boolean;
  itens?: { id: string; produto_id: string; quantidade: number; produto?: Produto }[];
}

export default function OrcamentoProdutos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters, sorting, columns
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrupo, setFilterGrupo] = useState<string>('all');
  const [filterSubgrupo, setFilterSubgrupo] = useState<string>('all');
  const [filterAdicional, setFilterAdicional] = useState<string>('all');
  const [filterAtivo, setFilterAtivo] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  type ColKey = 'codigo' | 'nome' | 'grupo' | 'subgrupo' | 'unidade' | 'qtd_max' | 'valor_atual' | 'valor_minimo' | 'valor_locacao' | 'valor_min_locacao' | 'valor_instalacao' | 'adicional' | 'ativo';
  const ALL_COLUMNS: { key: ColKey; label: string }[] = [
    { key: 'codigo', label: 'Código' },
    { key: 'nome', label: 'Nome' },
    { key: 'grupo', label: 'Grupo' },
    { key: 'subgrupo', label: 'Subgrupo' },
    { key: 'unidade', label: 'Unidade' },
    { key: 'qtd_max', label: 'Qtd Máx' },
    { key: 'valor_atual', label: 'Valor Atual' },
    { key: 'valor_minimo', label: 'Valor Mínimo' },
    { key: 'valor_locacao', label: 'Valor Locação' },
    { key: 'valor_min_locacao', label: 'Valor Mín. Loc.' },
    { key: 'valor_instalacao', label: 'Valor Instalação' },
    { key: 'adicional', label: 'Adicional' },
    { key: 'ativo', label: 'Ativo' },
  ];
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(['codigo', 'nome', 'grupo', 'subgrupo', 'unidade', 'valor_atual', 'valor_minimo', 'adicional', 'ativo']));

  const toggleCol = (key: ColKey) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filteredProdutos = useMemo(() => {
    let result = [...produtos];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.nome.toLowerCase().includes(term) ||
        (p.codigo && p.codigo.toLowerCase().includes(term)) ||
        (p.descricao && p.descricao.toLowerCase().includes(term))
      );
    }
    if (filterGrupo !== 'all') result = result.filter(p => p.categoria === filterGrupo);
    if (filterSubgrupo !== 'all') result = result.filter(p => p.subgrupo === filterSubgrupo);
    if (filterAdicional !== 'all') result = result.filter(p => filterAdicional === 'sim' ? p.adicional : !p.adicional);
    if (filterAtivo !== 'all') result = result.filter(p => filterAtivo === 'sim' ? p.ativo : !p.ativo);

    result.sort((a, b) => {
      let va: any, vb: any;
      switch (sortField) {
        case 'codigo': va = a.codigo || ''; vb = b.codigo || ''; break;
        case 'nome': va = a.nome; vb = b.nome; break;
        case 'grupo': va = a.categoria; vb = b.categoria; break;
        case 'subgrupo': va = a.subgrupo || ''; vb = b.subgrupo || ''; break;
        case 'valor_atual': va = a.preco_unitario; vb = b.preco_unitario; break;
        case 'valor_minimo': va = a.valor_minimo; vb = b.valor_minimo; break;
        case 'valor_instalacao': va = a.valor_instalacao; vb = b.valor_instalacao; break;
        default: va = a.nome; vb = b.nome;
      }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [produtos, searchTerm, filterGrupo, filterSubgrupo, filterAdicional, filterAtivo, sortField, sortDir]);

  const hasActiveFilters = searchTerm || filterGrupo !== 'all' || filterSubgrupo !== 'all' || filterAdicional !== 'all' || filterAtivo !== 'all';
  const clearFilters = () => { setSearchTerm(''); setFilterGrupo('all'); setFilterSubgrupo('all'); setFilterAdicional('all'); setFilterAtivo('all'); };

  const [showProdutoForm, setShowProdutoForm] = useState(false);
  const [editProduto, setEditProduto] = useState<Produto | null>(null);
  const [pForm, setPForm] = useState({ nome: '', descricao: '', categoria: 'Smartportaria', subgrupo: '', codigo: '', preco_unitario: '', unidade: 'un', qtd_max: '', valor_minimo: '', valor_locacao: '', valor_instalacao: '', valor_minimo_locacao: '', adicional: false });

  // Kit form
  const [showKitForm, setShowKitForm] = useState(false);
  const [editKit, setEditKit] = useState<Kit | null>(null);
  const [kForm, setKForm] = useState({ nome: '', descricao: '', categoria: 'Smartportaria', codigo: '', preco_kit: '', valor_minimo: '', valor_locacao: '', valor_minimo_locacao: '', valor_instalacao: '' });
  const [kitItens, setKitItens] = useState<{ produto_id: string; quantidade: number }[]>([]);

  // Auto-calculate kit prices from products
  const recalcKitPrices = (itens: { produto_id: string; quantidade: number }[]) => {
    let totalAtual = 0, totalMinimo = 0, totalLocacao = 0, totalMinLocacao = 0, totalInstalacao = 0;
    itens.forEach(item => {
      const prod = produtos.find(p => p.id === item.produto_id);
      if (prod) {
        totalAtual += (prod.preco_unitario || 0) * item.quantidade;
        totalMinimo += (prod.valor_minimo || 0) * item.quantidade;
        totalLocacao += (prod.valor_locacao || 0) * item.quantidade;
        totalMinLocacao += (prod.valor_minimo_locacao || 0) * item.quantidade;
        totalInstalacao += (prod.valor_instalacao || 0) * item.quantidade;
      }
    });
    setKForm(prev => ({
      ...prev,
      preco_kit: formatBRL(totalAtual),
      valor_minimo: formatBRL(totalMinimo),
      valor_locacao: formatBRL(totalLocacao),
      valor_minimo_locacao: formatBRL(totalMinLocacao),
      valor_instalacao: formatBRL(totalInstalacao),
    }));
  };

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'produto' | 'kit'; id: string } | null>(null);

  // Pricing rules from DB
  const [pricingRules, setPricingRules] = useState<Record<string, number>>({
    valor_minimo: 90, valor_locacao: 3.57, valor_minimo_locacao: 90, valor_instalacao: 10,
  });

  const fetchAll = async () => {
    const [{ data: prods }, { data: kitsData }, { data: regras }] = await Promise.all([
      supabase.from('orcamento_produtos').select('*').order('categoria').order('nome'),
      supabase.from('orcamento_kits').select('*').order('categoria').order('nome'),
      supabase.from('orcamento_regras_precificacao').select('campo, percentual'),
    ]);
    setProdutos((prods as unknown as Produto[]) || []);

    if (regras) {
      const map: Record<string, number> = {};
      regras.forEach((r: any) => { map[r.campo] = Number(r.percentual); });
      setPricingRules(prev => ({ ...prev, ...map }));
    }

    // Fetch kit items
    if (kitsData && kitsData.length > 0) {
      const { data: itens } = await supabase
        .from('orcamento_kit_itens')
        .select('*')
        .in('kit_id', kitsData.map(k => k.id));

      const kitsWithItens = (kitsData as unknown as Kit[]).map(k => ({
        ...k,
        itens: (itens || []).filter(i => i.kit_id === k.id).map(i => ({
          ...i,
          produto: (prods as unknown as Produto[])?.find(p => p.id === i.produto_id),
        })),
      }));
      setKits(kitsWithItens);
    } else {
      setKits([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ---- Produto CRUD ----
  const openProdutoEdit = (p: Produto) => {
    setEditProduto(p);
    setPForm({
      nome: p.nome, descricao: p.descricao || '', categoria: p.categoria,
      subgrupo: p.subgrupo || '', codigo: p.codigo || '',
      preco_unitario: formatBRL(p.preco_unitario), unidade: p.unidade,
      qtd_max: String(p.qtd_max || ''), valor_minimo: formatBRL(p.valor_minimo || 0),
      valor_locacao: formatBRL(p.valor_locacao || 0),
      valor_instalacao: formatBRL(p.valor_instalacao || 0), valor_minimo_locacao: formatBRL(p.valor_minimo_locacao || 0),
      adicional: p.adicional || false,
    });
    setShowProdutoForm(true);
  };

  const saveProduto = async () => {
    if (!pForm.nome.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return; }
    const payload: any = {
      nome: pForm.nome.trim(),
      descricao: pForm.descricao.trim() || null,
      categoria: pForm.categoria,
      subgrupo: pForm.subgrupo.trim() || null,
      codigo: pForm.codigo.trim() || null,
      preco_unitario: parseFloat(parseBRL(pForm.preco_unitario)) || 0,
      unidade: pForm.unidade,
      qtd_max: parseInt(pForm.qtd_max) || 0,
      valor_minimo: parseFloat(parseBRL(pForm.valor_minimo)) || 0,
      valor_locacao: parseFloat(parseBRL(pForm.valor_locacao)) || 0,
      valor_instalacao: parseFloat(parseBRL(pForm.valor_instalacao)) || 0,
      valor_minimo_locacao: parseFloat(parseBRL(pForm.valor_minimo_locacao)) || 0,
      adicional: pForm.adicional,
      updated_by: user?.id,
      updated_by_name: user?.nome,
    };

    if (editProduto) {
      // Build change description
      const changes: string[] = [];
      const old = editProduto;
      if (payload.nome !== old.nome) changes.push(`Nome: "${old.nome}" → "${payload.nome}"`);
      if (payload.codigo !== old.codigo) changes.push(`Código: "${old.codigo || ''}" → "${payload.codigo || ''}"`);
      if (payload.categoria !== old.categoria) changes.push(`Grupo: ${old.categoria} → ${payload.categoria}`);
      if (payload.preco_unitario !== old.preco_unitario) changes.push(`Valor Atual: ${formatBRL(old.preco_unitario)} → ${formatBRL(payload.preco_unitario)}`);
      if (payload.valor_minimo !== old.valor_minimo) changes.push(`Valor Mínimo: ${formatBRL(old.valor_minimo)} → ${formatBRL(payload.valor_minimo)}`);
      if (payload.valor_locacao !== (old.valor_locacao || 0)) changes.push(`Valor Locação: ${formatBRL(old.valor_locacao || 0)} → ${formatBRL(payload.valor_locacao)}`);
      if (payload.valor_instalacao !== (old.valor_instalacao || 0)) changes.push(`Valor Instalação: ${formatBRL(old.valor_instalacao || 0)} → ${formatBRL(payload.valor_instalacao)}`);
      if (payload.adicional !== old.adicional) changes.push(`Adicional: ${old.adicional ? 'Sim' : 'Não'} → ${payload.adicional ? 'Sim' : 'Não'}`);
      if (payload.qtd_max !== old.qtd_max) changes.push(`Qtd Máx: ${old.qtd_max} → ${payload.qtd_max}`);

      if (changes.length > 0) {
        const historico = [...(old.historico_alteracoes || [])];
        historico.unshift({
          user_name: user?.nome || 'Desconhecido',
          alteracao: changes.join('; '),
          data: new Date().toISOString(),
        });
        // Keep last 50 entries
        payload.historico_alteracoes = historico.slice(0, 50);
      }

      await supabase.from('orcamento_produtos').update(payload).eq('id', editProduto.id);
    } else {
      payload.historico_alteracoes = [{
        user_name: user?.nome || 'Desconhecido',
        alteracao: 'Produto criado',
        data: new Date().toISOString(),
      }];
      await supabase.from('orcamento_produtos').insert(payload);
    }
    setShowProdutoForm(false);
    setEditProduto(null);
    resetPForm();
    fetchAll();
    toast({ title: editProduto ? 'Produto atualizado' : 'Produto criado' });
  };

  const resetPForm = () => setPForm({ nome: '', descricao: '', categoria: 'Smartportaria', subgrupo: '', codigo: '', preco_unitario: '', unidade: 'un', qtd_max: '', valor_minimo: '', valor_locacao: '', valor_instalacao: '', valor_minimo_locacao: '', adicional: false });

  // ---- Kit CRUD ----
  const openKitEdit = (k: Kit) => {
    setEditKit(k);
    const itens = k.itens?.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })) || [];
    setKForm({ nome: k.nome, descricao: k.descricao || '', categoria: k.categoria, codigo: (k as any).codigo || '', preco_kit: formatBRL(k.preco_kit), valor_minimo: formatBRL(k.valor_minimo || 0), valor_locacao: formatBRL(k.valor_locacao || 0), valor_minimo_locacao: formatBRL(k.valor_minimo_locacao || 0), valor_instalacao: formatBRL(k.valor_instalacao || 0) });
    setKitItens(itens);
    setShowKitForm(true);
  };

  const saveKit = async () => {
    if (!kForm.nome.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return; }
    const payload = { nome: kForm.nome.trim(), descricao: kForm.descricao.trim() || null, categoria: kForm.categoria, codigo: kForm.codigo.trim() || null, preco_kit: parseFloat(parseBRL(kForm.preco_kit)) || 0, valor_minimo: parseFloat(parseBRL(kForm.valor_minimo)) || 0, valor_locacao: parseFloat(parseBRL(kForm.valor_locacao)) || 0, valor_minimo_locacao: parseFloat(parseBRL(kForm.valor_minimo_locacao)) || 0, valor_instalacao: parseFloat(parseBRL(kForm.valor_instalacao)) || 0 };

    let kitId = editKit?.id;
    if (editKit) {
      await supabase.from('orcamento_kits').update(payload).eq('id', editKit.id);
      await supabase.from('orcamento_kit_itens').delete().eq('kit_id', editKit.id);
    } else {
      const { data } = await supabase.from('orcamento_kits').insert(payload).select('id').single();
      kitId = data?.id;
    }

    if (kitId && kitItens.length > 0) {
      await supabase.from('orcamento_kit_itens').insert(
        kitItens.filter(i => i.produto_id).map(i => ({ kit_id: kitId!, produto_id: i.produto_id, quantidade: i.quantidade }))
      );
    }

    setShowKitForm(false);
    setEditKit(null);
    setKForm({ nome: '', descricao: '', categoria: 'Smartportaria', codigo: '', preco_kit: '', valor_minimo: '', valor_locacao: '', valor_minimo_locacao: '', valor_instalacao: '' });
    setKitItens([]);
    fetchAll();
    toast({ title: editKit ? 'Kit atualizado' : 'Kit criado' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'produto') {
      await supabase.from('orcamento_produtos').delete().eq('id', deleteTarget.id);
    } else {
      await supabase.from('orcamento_kits').delete().eq('id', deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
    toast({ title: 'Excluído com sucesso' });
  };

  const toggleAtivo = async (type: 'produto' | 'kit', id: string, ativo: boolean) => {
    if (type === 'produto') {
      await supabase.from('orcamento_produtos').update({ ativo }).eq('id', id);
    } else {
      await supabase.from('orcamento_kits').update({ ativo }).eq('id', id);
    }
    fetchAll();
  };

  const catLabel = (cat: string) => GRUPOS.find(c => c.value === cat)?.label || cat;
  const subLabel = (sub: string) => SUBGRUPOS.find(s => s.value === sub)?.label || sub;
  const unLabel = (un: string) => UNIDADES.find(u => u.value === un)?.label || un;

  if (user?.role !== 'admin') {
    return <Layout><div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos e Kits</h1>
          <p className="text-muted-foreground">Gerencie produtos e kits para orçamentos</p>
        </div>

        <Tabs defaultValue="produtos">
          <TabsList>
            <TabsTrigger value="produtos"><Package className="mr-2 h-4 w-4" />Produtos</TabsTrigger>
            <TabsTrigger value="kits"><Boxes className="mr-2 h-4 w-4" />Kits</TabsTrigger>
          </TabsList>

          {/* PRODUTOS TAB */}
          <TabsContent value="produtos" className="space-y-4">
            {/* Toolbar: Search + Filters + Columns + Add */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, código..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterGrupo} onValueChange={setFilterGrupo}>
                <SelectTrigger className="w-[160px]"><Filter className="mr-2 h-3 w-3" /><SelectValue placeholder="Grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Grupos</SelectItem>
                  {GRUPOS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSubgrupo} onValueChange={setFilterSubgrupo}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Subgrupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Subgrupos</SelectItem>
                  {SUBGRUPOS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterAdicional} onValueChange={setFilterAdicional}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Adicional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sim">Adicional</SelectItem>
                  <SelectItem value="nao">Não Adicional</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAtivo} onValueChange={setFilterAtivo}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sim">Ativos</SelectItem>
                  <SelectItem value="nao">Inativos</SelectItem>
                </SelectContent>
              </Select>

              {/* Column selector */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-3 w-3" />Colunas</Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3">
                  <p className="text-sm font-medium mb-2">Colunas visíveis</p>
                  <div className="space-y-2">
                    {ALL_COLUMNS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={visibleCols.has(col.key)} onCheckedChange={() => toggleCol(col.key)} />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-3 w-3" />Limpar filtros</Button>
              )}

              <div className="ml-auto">
                <Button onClick={() => { setEditProduto(null); resetPForm(); setShowProdutoForm(true); }}>
                  <Plus className="mr-2 h-4 w-4" />Novo Produto
                </Button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{filteredProdutos.length} de {produtos.length} produtos</span>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : filteredProdutos.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                {produtos.length === 0 ? 'Nenhum produto cadastrado.' : 'Nenhum produto encontrado com os filtros atuais.'}
              </CardContent></Card>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {visibleCols.has('codigo') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('codigo')}><div className="flex items-center gap-1">Código {sortField === 'codigo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('nome') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('nome')}><div className="flex items-center gap-1">Nome {sortField === 'nome' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('grupo') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('grupo')}><div className="flex items-center gap-1">Grupo {sortField === 'grupo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('subgrupo') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('subgrupo')}><div className="flex items-center gap-1">Subgrupo {sortField === 'subgrupo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('unidade') && <th className="px-3 py-2 text-left">Unidade</th>}
                      {visibleCols.has('qtd_max') && <th className="px-3 py-2 text-right">Qtd Máx</th>}
                      {visibleCols.has('valor_atual') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('valor_atual')}><div className="flex items-center justify-end gap-1">Valor Atual {sortField === 'valor_atual' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('valor_minimo') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('valor_minimo')}><div className="flex items-center justify-end gap-1">Val. Mín {sortField === 'valor_minimo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('valor_locacao') && <th className="px-3 py-2 text-right">Val. Loc.</th>}
                      {visibleCols.has('valor_min_locacao') && <th className="px-3 py-2 text-right">Mín. Loc.</th>}
                      {visibleCols.has('valor_instalacao') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('valor_instalacao')}><div className="flex items-center justify-end gap-1">Instalação {sortField === 'valor_instalacao' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('adicional') && <th className="px-3 py-2 text-center">Adic.</th>}
                      {visibleCols.has('ativo') && <th className="px-3 py-2 text-center">Ativo</th>}
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProdutos.map(p => (
                      <tr key={p.id} className={`border-b hover:bg-muted/30 ${!p.ativo ? 'opacity-50' : ''}`}>
                        {visibleCols.has('codigo') && <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.codigo || '-'}</td>}
                        {visibleCols.has('nome') && <td className="px-3 py-2 font-medium text-foreground max-w-[300px] truncate">{p.nome}</td>}
                        {visibleCols.has('grupo') && <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{catLabel(p.categoria)}</Badge></td>}
                        {visibleCols.has('subgrupo') && <td className="px-3 py-2">{p.subgrupo ? <Badge variant="outline" className="text-xs">{subLabel(p.subgrupo)}</Badge> : '-'}</td>}
                        {visibleCols.has('unidade') && <td className="px-3 py-2 text-xs">{unLabel(p.unidade)}</td>}
                        {visibleCols.has('qtd_max') && <td className="px-3 py-2 text-right text-xs">{p.qtd_max}</td>}
                        {visibleCols.has('valor_atual') && <td className="px-3 py-2 text-right text-xs font-medium">R$ {p.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                        {visibleCols.has('valor_minimo') && <td className="px-3 py-2 text-right text-xs">R$ {p.valor_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                        {visibleCols.has('valor_locacao') && <td className="px-3 py-2 text-right text-xs">R$ {(p.valor_locacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                        {visibleCols.has('valor_min_locacao') && <td className="px-3 py-2 text-right text-xs">R$ {p.valor_minimo_locacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                        {visibleCols.has('valor_instalacao') && <td className="px-3 py-2 text-right text-xs">R$ {p.valor_instalacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>}
                        {visibleCols.has('adicional') && <td className="px-3 py-2 text-center">{p.adicional ? <Badge className="text-xs bg-primary/20 text-primary">Sim</Badge> : <span className="text-xs text-muted-foreground">Não</span>}</td>}
                        {visibleCols.has('ativo') && <td className="px-3 py-2 text-center"><Switch checked={p.ativo} onCheckedChange={v => toggleAtivo('produto', p.id, v)} /></td>}
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openProdutoEdit(p)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'produto', id: p.id })}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* KITS TAB */}
          <TabsContent value="kits" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditKit(null); setKForm({ nome: '', descricao: '', categoria: 'Smartportaria', codigo: '', preco_kit: '', valor_minimo: '', valor_locacao: '', valor_minimo_locacao: '', valor_instalacao: '' }); setKitItens([]); setShowKitForm(true); }}>
                <Plus className="mr-2 h-4 w-4" />Novo Kit
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : kits.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum kit cadastrado.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {kits.map(k => (
                  <Card key={k.id} className={!k.ativo ? 'opacity-50' : ''}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{k.nome}</span>
                            <Badge variant="outline" className="text-xs">{catLabel(k.categoria)}</Badge>
                            {!k.ativo && <Badge variant="secondary">Inativo</Badge>}
                          </div>
                          {k.descricao && <p className="text-xs text-muted-foreground mt-1">{k.descricao}</p>}
                          {k.itens && k.itens.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {k.itens.map(i => (
                                <span key={i.id} className="mr-3">{i.quantidade}x {i.produto?.nome || 'Produto removido'}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap justify-end">
                          <div className="text-right text-xs space-y-0.5">
                            <div><span className="text-muted-foreground">Atual:</span> <span className="font-semibold text-foreground">R$ {k.preco_kit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                            <div><span className="text-muted-foreground">Mínimo:</span> R$ {(k.valor_minimo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div><span className="text-muted-foreground">Locação:</span> R$ {(k.valor_locacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div><span className="text-muted-foreground">Mín. Loc.:</span> R$ {(k.valor_minimo_locacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            <div><span className="text-muted-foreground">Instalação:</span> R$ {(k.valor_instalacao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                          <Switch checked={k.ativo} onCheckedChange={v => toggleAtivo('kit', k.id, v)} />
                          <Button size="icon" variant="ghost" onClick={() => openKitEdit(k)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'kit', id: k.id })}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Produto Dialog */}
      <Dialog open={showProdutoForm} onOpenChange={v => { if (!v) { setShowProdutoForm(false); setEditProduto(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome *</Label><Input value={pForm.nome} onChange={e => setPForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div><Label>Código</Label><Input value={pForm.codigo} onChange={e => setPForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Ex: 8500" /></div>
            </div>
            <div><Label>Descrição</Label><Textarea value={pForm.descricao} onChange={e => setPForm(p => ({ ...p, descricao: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Grupo</Label>
                <Select value={pForm.categoria} onValueChange={v => setPForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRUPOS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subgrupo</Label>
                <Select value={pForm.subgrupo || ''} onValueChange={v => {
                  const updates: any = { subgrupo: v };
                  if (v === 'Serviço') updates.valor_instalacao = '';
                  setPForm(p => ({ ...p, ...updates }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{SUBGRUPOS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidade</Label>
                <Select value={pForm.unidade} onValueChange={v => setPForm(p => ({ ...p, unidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIDADES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Qtd Máxima</Label><Input type="number" value={pForm.qtd_max} onChange={e => setPForm(p => ({ ...p, qtd_max: e.target.value }))} /></div>
              <div><Label>Valor Atual (R$)</Label><Input
                value={pForm.preco_unitario}
                onChange={e => setPForm(p => ({ ...p, preco_unitario: e.target.value }))}
                onBlur={e => {
                  const raw = parseBRL(e.target.value);
                  const val = parseFloat(raw);
                  if (!isNaN(val) && val > 0) {
                    const isServico = pForm.subgrupo === 'Serviço';
                    if (isServico) {
                      const svcMinPct = pricingRules.servico_valor_minimo ?? pricingRules.valor_minimo;
                      const svcLocPct = pricingRules.servico_valor_locacao ?? pricingRules.valor_locacao;
                      const svcMinLocPct = pricingRules.servico_valor_minimo_locacao ?? pricingRules.valor_minimo_locacao;
                      const svcInstPct = pricingRules.servico_valor_instalacao ?? pricingRules.valor_instalacao;
                      const svcLocacao = val * (svcLocPct / 100);
                      setPForm(p => ({
                        ...p,
                        preco_unitario: formatBRL(val),
                        valor_minimo: formatBRL(val * (svcMinPct / 100)),
                        valor_locacao: formatBRL(svcLocacao),
                        valor_minimo_locacao: formatBRL(svcLocacao * (svcMinLocPct / 100)),
                        valor_instalacao: formatBRL(val * (svcInstPct / 100)),
                      }));
                    } else {
                      const locacao = val * (pricingRules.valor_locacao / 100);
                      setPForm(p => ({
                        ...p,
                        preco_unitario: formatBRL(val),
                        valor_minimo: formatBRL(val * (pricingRules.valor_minimo / 100)),
                        valor_locacao: formatBRL(locacao),
                        valor_minimo_locacao: formatBRL(locacao * (pricingRules.valor_minimo_locacao / 100)),
                        valor_instalacao: formatBRL(val * (pricingRules.valor_instalacao / 100)),
                      }));
                    }
                  }
                }}
                placeholder="0,00"
              /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor Mínimo (R$)</Label><Input value={pForm.valor_minimo} onChange={e => setPForm(p => ({ ...p, valor_minimo: e.target.value }))} onBlur={e => { const v = parseFloat(parseBRL(e.target.value)); if (!isNaN(v)) setPForm(p => ({ ...p, valor_minimo: formatBRL(v) })); }} placeholder="0,00" /></div>
              <div><Label>Valor Locação (R$)</Label><Input value={pForm.valor_locacao} onChange={e => setPForm(p => ({ ...p, valor_locacao: e.target.value }))} onBlur={e => { const v = parseFloat(parseBRL(e.target.value)); if (!isNaN(v)) setPForm(p => ({ ...p, valor_locacao: formatBRL(v) })); }} placeholder="0,00" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor Mín. Locação (R$)</Label><Input value={pForm.valor_minimo_locacao} onChange={e => setPForm(p => ({ ...p, valor_minimo_locacao: e.target.value }))} onBlur={e => { const v = parseFloat(parseBRL(e.target.value)); if (!isNaN(v)) setPForm(p => ({ ...p, valor_minimo_locacao: formatBRL(v) })); }} placeholder="0,00" /></div>
              <div>
                <Label>Valor Instalação (R$)</Label>
                <Input value={pForm.valor_instalacao} onChange={e => setPForm(p => ({ ...p, valor_instalacao: e.target.value }))} onBlur={e => { const v = parseFloat(parseBRL(e.target.value)); if (!isNaN(v)) setPForm(p => ({ ...p, valor_instalacao: formatBRL(v) })); }} placeholder={pForm.subgrupo === 'Serviço' ? '0,00 (Serviço)' : '0,00'} />
                {pForm.subgrupo === 'Serviço' && <p className="text-xs text-warning mt-1">Subgrupo Serviço: instalação zerada. Edite manualmente se necessário.</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={pForm.adicional} onCheckedChange={v => setPForm(p => ({ ...p, adicional: v }))} />
              <Label>Adicional</Label>
            </div>
            {editProduto && editProduto.historico_alteracoes && editProduto.historico_alteracoes.length > 0 && (
              <div className="border-t pt-3 mt-2">
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Histórico de Alterações</Label>
                <div className="max-h-[150px] overflow-y-auto space-y-2">
                  {editProduto.historico_alteracoes.map((h, i) => (
                    <div key={i} className="text-xs border rounded p-2 bg-muted/30">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-foreground">{h.user_name}</span>
                        <span className="text-muted-foreground">{new Date(h.data).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-muted-foreground">{h.alteracao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={saveProduto} className="w-full">{editProduto ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kit Dialog */}
      <Dialog open={showKitForm} onOpenChange={v => { if (!v) { setShowKitForm(false); setEditKit(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editKit ? 'Editar Kit' : 'Novo Kit'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome *</Label><Input value={kForm.nome} onChange={e => setKForm(k => ({ ...k, nome: e.target.value }))} /></div>
              <div><Label>ID do Kit</Label><Input value={kForm.codigo} onChange={e => setKForm(k => ({ ...k, codigo: e.target.value }))} placeholder="Ex: KIT-001" /></div>
            </div>
            <div><Label>Descrição</Label><Textarea value={kForm.descricao} onChange={e => setKForm(k => ({ ...k, descricao: e.target.value }))} rows={2} /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={kForm.categoria} onValueChange={v => setKForm(k => ({ ...k, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GRUPOS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>Valor Atual (R$)</Label><Input value={kForm.preco_kit} readOnly className="bg-muted" /></div>
              <div><Label>Valor Mínimo (R$)</Label><Input value={kForm.valor_minimo} readOnly className="bg-muted" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Valor Locação (R$)</Label><Input value={kForm.valor_locacao} readOnly className="bg-muted" /></div>
              <div><Label>Valor Mín. Locação (R$)</Label><Input value={kForm.valor_minimo_locacao} readOnly className="bg-muted" /></div>
              <div><Label>Valor Instalação (R$)</Label><Input value={kForm.valor_instalacao} readOnly className="bg-muted" /></div>
            </div>

            <div>
              <Label>Produtos do Kit</Label>
              <div className="space-y-2 mt-2">
                {kitItens.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={item.produto_id} onValueChange={v => { const updated = kitItens.map((it, i) => i === idx ? { ...it, produto_id: v } : it); setKitItens(updated); recalcKitPrices(updated); }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                      <SelectContent>{produtos.filter(p => p.ativo).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min="1" className="w-20" value={item.quantidade} onChange={e => { const updated = kitItens.map((it, i) => i === idx ? { ...it, quantidade: parseInt(e.target.value) || 1 } : it); setKitItens(updated); recalcKitPrices(updated); }} />
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { const updated = kitItens.filter((_, i) => i !== idx); setKitItens(updated); recalcKitPrices(updated); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setKitItens(prev => [...prev, { produto_id: '', quantidade: 1 }])}>
                  <Plus className="mr-1 h-3 w-3" />Adicionar Produto
                </Button>
              </div>
            </div>

            <Button onClick={saveKit} className="w-full">{editKit ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteTarget?.type === 'produto' ? 'produto' : 'kit'}?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
