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
  id_produto: number | null;
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
  codigo: string | null;
  preco_kit: number;
  valor_minimo: number;
  valor_locacao: number;
  valor_minimo_locacao: number;
  valor_instalacao: number;
  ativo: boolean;
  historico_alteracoes?: any[];
  itens?: { id: string; produto_id: string; quantidade: number; produto?: Produto }[];
  orcamento_kit_itens?: any[];
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

  type ColKey = 'id_produto' | 'codigo' | 'nome' | 'grupo' | 'subgrupo' | 'unidade' | 'qtd_max' | 'valor_atual' | 'valor_minimo' | 'valor_locacao' | 'valor_min_locacao' | 'valor_instalacao' | 'adicional' | 'ativo';
  const ALL_COLUMNS: { key: ColKey; label: string }[] = [
    { key: 'id_produto', label: 'Id' },
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
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(['id_produto', 'codigo', 'nome', 'grupo', 'subgrupo', 'unidade', 'valor_atual', 'valor_minimo', 'valor_locacao', 'valor_min_locacao', 'valor_instalacao', 'adicional', 'ativo']));

  // Kit filters & sorting (Excel-style per-column)
  const [kitColumnFilters, setKitColumnFilters] = useState<Record<string, string>>({});
  const [kitSearchTerm, setKitSearchTerm] = useState('');
  const [kitSortField, setKitSortField] = useState<string>('nome');
  const [kitSortDir, setKitSortDir] = useState<'asc' | 'desc'>('asc');
  const [kitActiveFilterCol, setKitActiveFilterCol] = useState<string | null>(null);

  const toggleKitSort = (field: string) => {
    if (kitSortField === field) setKitSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setKitSortField(field); setKitSortDir('asc'); }
  };

  const kitSortIcon = (field: string) => {
    if (kitSortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return kitSortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const setKitFilter = (col: string, value: string) => {
    setKitColumnFilters(prev => {
      const next = { ...prev };
      if (!value || value === 'all') delete next[col];
      else next[col] = value;
      return next;
    });
    setKitActiveFilterCol(null);
  };

  const getKitTotals = (k: Kit) => {
    const t = { atual: 0, minimo: 0, locacao: 0, minLocacao: 0, instalacao: 0 };
    k.itens?.forEach(i => { if (i.produto) { t.atual += (i.produto.preco_unitario || 0) * i.quantidade; t.minimo += (i.produto.valor_minimo || 0) * i.quantidade; t.locacao += (i.produto.valor_locacao || 0) * i.quantidade; t.minLocacao += (i.produto.valor_minimo_locacao || 0) * i.quantidade; t.instalacao += (i.produto.valor_instalacao || 0) * i.quantidade; } });
    return t;
  };

  const getKitUniqueValues = (col: string) => {
    const values = kits.map(k => {
      if (col === 'categoria') return catLabel(k.categoria);
      if (col === 'ativo') return k.ativo ? 'Ativo' : 'Inativo';
      return '';
    });
    return [...new Set(values)].filter(Boolean).sort();
  };

  const filteredKits = useMemo(() => {
    let result = [...kits];

    // Global search filter
    if (kitSearchTerm.trim()) {
      const lower = kitSearchTerm.toLowerCase();
      result = result.filter(k =>
        k.nome.toLowerCase().includes(lower) ||
        ((k as any).id_kit?.toString() || '').includes(lower) ||
        (k.codigo || '').toLowerCase().includes(lower) ||
        catLabel(k.categoria).toLowerCase().includes(lower)
      );
    }

    Object.entries(kitColumnFilters).forEach(([col, val]) => {
      const lower = val.toLowerCase();
      result = result.filter(k => {
        const t = getKitTotals(k);
        switch (col) {
          case 'id_kit': return ((k as any).id_kit?.toString() || '').includes(lower);
          case 'nome': return k.nome.toLowerCase().includes(lower);
          case 'categoria': return catLabel(k.categoria).toLowerCase().includes(lower);
          case 'itens': return (k.itens?.length || 0).toString().includes(val);
          case 'atual': return t.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).includes(val);
          case 'minimo': return t.minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).includes(val);
          case 'locacao': return t.locacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).includes(val);
          case 'minLocacao': return t.minLocacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).includes(val);
          case 'instalacao': return t.instalacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).includes(val);
          case 'ativo': return (k.ativo ? 'Ativo' : 'Inativo').toLowerCase().includes(lower);
          default: return true;
        }
      });
    });

    result.sort((a, b) => {
      let va: any, vb: any;
      const ta = getKitTotals(a), tb = getKitTotals(b);
      switch (kitSortField) {
        case 'id_kit': va = (a as any).id_kit || 0; vb = (b as any).id_kit || 0; break;
        case 'nome': va = a.nome.toLowerCase(); vb = b.nome.toLowerCase(); break;
        case 'categoria': va = a.categoria; vb = b.categoria; break;
        case 'itens': va = a.itens?.length || 0; vb = b.itens?.length || 0; break;
        case 'atual': va = ta.atual; vb = tb.atual; break;
        case 'minimo': va = ta.minimo; vb = tb.minimo; break;
        case 'locacao': va = ta.locacao; vb = tb.locacao; break;
        case 'minLocacao': va = ta.minLocacao; vb = tb.minLocacao; break;
        case 'instalacao': va = ta.instalacao; vb = tb.instalacao; break;
        case 'ativo': va = a.ativo ? 1 : 0; vb = b.ativo ? 1 : 0; break;
        default: va = a.nome.toLowerCase(); vb = b.nome.toLowerCase();
      }
      if (va < vb) return kitSortDir === 'asc' ? -1 : 1;
      if (va > vb) return kitSortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [kits, kitColumnFilters, kitSearchTerm, kitSortField, kitSortDir]);

  const hasKitFilters = Object.keys(kitColumnFilters).length > 0 || kitSearchTerm.trim() !== '';
  const clearKitFilters = () => { setKitColumnFilters({}); setKitSearchTerm(''); };

  const renderKitColHeader = (col: string, label: string, align: 'left' | 'right' | 'center' = 'left') => {
    const hasFilter = !!kitColumnFilters[col];
    const isSelect = col === 'categoria' || col === 'ativo';
    const searchCoveredCols = ['nome', 'id_kit'];
    const hideFilter = searchCoveredCols.includes(col);
    return (
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        <button onClick={() => toggleKitSort(col)} className="flex items-center gap-1 hover:text-foreground transition-colors">
          {label} {kitSortIcon(col)}
        </button>
        {!hideFilter && (
          <Popover open={kitActiveFilterCol === col} onOpenChange={open => setKitActiveFilterCol(open ? col : null)}>
            <PopoverTrigger asChild>
              <button className={`p-1 rounded hover:bg-accent transition-colors ${hasFilter ? 'text-primary' : 'text-muted-foreground'}`}>
                <Filter className={`h-3 w-3 ${hasFilter ? 'fill-current' : ''}`} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="space-y-3">
                <div className="font-medium text-sm">Filtrar {label}</div>
                {isSelect ? (
                  <Select value={kitColumnFilters[col] || ''} onValueChange={v => setKitFilter(col, v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {getKitUniqueValues(col).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder={`Buscar ${label.toLowerCase()}...`} value={kitColumnFilters[col] || ''} onChange={e => setKitFilter(col, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} className="w-full" />
                )}
                {hasFilter && <Button variant="ghost" size="sm" className="w-full" onClick={() => setKitFilter(col, '')}>Limpar filtro</Button>}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  };

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
        case 'id_produto': va = a.id_produto || 0; vb = b.id_produto || 0; break;
        case 'codigo': va = a.codigo || ''; vb = b.codigo || ''; break;
        case 'nome': va = a.nome; vb = b.nome; break;
        case 'grupo': va = a.categoria; vb = b.categoria; break;
        case 'subgrupo': va = a.subgrupo || ''; vb = b.subgrupo || ''; break;
        case 'unidade': va = a.unidade || ''; vb = b.unidade || ''; break;
        case 'qtd_max': va = a.qtd_max || 0; vb = b.qtd_max || 0; break;
        case 'valor_atual': va = a.preco_unitario; vb = b.preco_unitario; break;
        case 'valor_minimo': va = a.valor_minimo; vb = b.valor_minimo; break;
        case 'valor_locacao': va = a.valor_locacao || 0; vb = b.valor_locacao || 0; break;
        case 'valor_min_locacao': va = a.valor_minimo_locacao || 0; vb = b.valor_minimo_locacao || 0; break;
        case 'valor_instalacao': va = a.valor_instalacao || 0; vb = b.valor_instalacao || 0; break;
        case 'adicional': va = a.adicional ? 1 : 0; vb = b.adicional ? 1 : 0; break;
        case 'ativo': va = a.ativo ? 1 : 0; vb = b.ativo ? 1 : 0; break;
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
  const [pForm, setPForm] = useState({ nome: '', descricao: '', categoria: 'Smartportaria', subgrupo: '', codigo: '', id_produto: '', preco_unitario: '', unidade: 'un', qtd_max: '', valor_minimo: '', valor_locacao: '', valor_instalacao: '', valor_minimo_locacao: '', adicional: false });

  // Kit form
  const [showKitForm, setShowKitForm] = useState(false);
  const [editKit, setEditKit] = useState<Kit | null>(null);
  const [viewKit, setViewKit] = useState<Kit | null>(null);
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
        orcamento_kit_itens: (itens || []).filter(i => i.kit_id === k.id),
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
      id_produto: p.id_produto != null ? String(p.id_produto) : '',
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
      id_produto: pForm.id_produto ? parseInt(pForm.id_produto) : null,
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

      const { error } = await supabase.from('orcamento_produtos').update(payload).eq('id', editProduto.id);
      if (error) {
        console.error('Erro ao atualizar produto:', error);
        toast({ title: 'Erro ao salvar produto', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      payload.historico_alteracoes = [{
        user_name: user?.nome || 'Desconhecido',
        alteracao: 'Produto criado',
        data: new Date().toISOString(),
      }];
      const { error } = await supabase.from('orcamento_produtos').insert(payload);
      if (error) {
        console.error('Erro ao criar produto:', error);
        toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' });
        return;
      }
    }
    // Recalculate kit prices if editing a product (price may have changed)
    if (editProduto) {
      await recalcAllKitPrices();
    }
    setShowProdutoForm(false);
    setEditProduto(null);
    resetPForm();
    fetchAll();
    toast({ title: editProduto ? 'Produto atualizado' : 'Produto criado' });
  };

  const resetPForm = () => setPForm({ nome: '', descricao: '', categoria: 'Smartportaria', subgrupo: '', codigo: '', id_produto: '', preco_unitario: '', unidade: 'un', qtd_max: '', valor_minimo: '', valor_locacao: '', valor_instalacao: '', valor_minimo_locacao: '', adicional: false });

  // Recalculate all kit prices based on current product prices
  const recalcAllKitPrices = async () => {
    const { data: allKitItens } = await supabase.from('orcamento_kit_itens').select('kit_id, produto_id, quantidade');
    const { data: allProdutos } = await supabase.from('orcamento_produtos').select('id, preco_unitario, valor_minimo, valor_locacao, valor_minimo_locacao, valor_instalacao');
    if (!allKitItens || !allProdutos) return;

    const prodMap = new Map(allProdutos.map(p => [p.id, p]));
    const kitTotals = new Map<string, { preco_kit: number; valor_minimo: number; valor_locacao: number; valor_minimo_locacao: number; valor_instalacao: number }>();

    allKitItens.forEach(item => {
      const prod = prodMap.get(item.produto_id);
      if (!prod) return;
      const existing = kitTotals.get(item.kit_id) || { preco_kit: 0, valor_minimo: 0, valor_locacao: 0, valor_minimo_locacao: 0, valor_instalacao: 0 };
      existing.preco_kit += (prod.preco_unitario || 0) * item.quantidade;
      existing.valor_minimo += (prod.valor_minimo || 0) * item.quantidade;
      existing.valor_locacao += (prod.valor_locacao || 0) * item.quantidade;
      existing.valor_minimo_locacao += (prod.valor_minimo_locacao || 0) * item.quantidade;
      existing.valor_instalacao += (prod.valor_instalacao || 0) * item.quantidade;
      kitTotals.set(item.kit_id, existing);
    });

    for (const [kitId, totals] of kitTotals) {
      await supabase.from('orcamento_kits').update(totals).eq('id', kitId);
    }
  };

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
      // Build change history entry
      const changes: string[] = [];
      if (editKit.nome !== payload.nome) changes.push(`Nome: "${editKit.nome}" → "${payload.nome}"`);
      if (editKit.descricao !== payload.descricao) changes.push(`Descrição alterada`);
      if (editKit.categoria !== payload.categoria) changes.push(`Categoria: "${editKit.categoria}" → "${payload.categoria}"`);
      if (editKit.codigo !== payload.codigo) changes.push(`Código: "${editKit.codigo || ''}" → "${payload.codigo || ''}"`);
      if (Number(editKit.preco_kit) !== payload.preco_kit) changes.push(`Preço Kit: ${Number(editKit.preco_kit)} → ${payload.preco_kit}`);
      if (Number(editKit.valor_minimo) !== payload.valor_minimo) changes.push(`Val. Mínimo: ${Number(editKit.valor_minimo)} → ${payload.valor_minimo}`);
      if (Number(editKit.valor_locacao) !== payload.valor_locacao) changes.push(`Val. Locação: ${Number(editKit.valor_locacao)} → ${payload.valor_locacao}`);
      if (Number(editKit.valor_minimo_locacao) !== payload.valor_minimo_locacao) changes.push(`Mín. Locação: ${Number(editKit.valor_minimo_locacao)} → ${payload.valor_minimo_locacao}`);
      if (Number(editKit.valor_instalacao) !== payload.valor_instalacao) changes.push(`Instalação: ${Number(editKit.valor_instalacao)} → ${payload.valor_instalacao}`);

      // Check items changes
      const oldItens = (editKit as any).orcamento_kit_itens || [];
      const oldItensMap = new Map(oldItens.map((i: any) => [i.produto_id, i.quantidade]));
      const newItensMap = new Map(kitItens.filter(i => i.produto_id).map(i => [i.produto_id, i.quantidade]));
      const addedItems = kitItens.filter(i => i.produto_id && !oldItensMap.has(i.produto_id));
      const removedItems = oldItens.filter((i: any) => !newItensMap.has(i.produto_id));
      const changedQty = kitItens.filter(i => i.produto_id && oldItensMap.has(i.produto_id) && oldItensMap.get(i.produto_id) !== i.quantidade);
      if (addedItems.length) changes.push(`${addedItems.length} produto(s) adicionado(s)`);
      if (removedItems.length) changes.push(`${removedItems.length} produto(s) removido(s)`);
      if (changedQty.length) changes.push(`Qtd alterada em ${changedQty.length} produto(s)`);

      if (changes.length > 0) {
        const historico = Array.isArray(editKit.historico_alteracoes) ? editKit.historico_alteracoes : [];
        const entry = {
          data: new Date().toISOString(),
          usuario: user?.nome || user?.email || 'Desconhecido',
          usuario_id: user?.id,
          alteracoes: changes,
        };
        (payload as any).historico_alteracoes = [...historico, entry];
      }

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
          <p className="text-muted-foreground">Gerencie produtos e kits para orçamentos — {produtos.length} produtos e {kits.length} kits cadastrados</p>
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
                      {visibleCols.has('id_produto') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('id_produto')}><div className="flex items-center gap-1">Id {sortField === 'id_produto' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('codigo') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('codigo')}><div className="flex items-center gap-1">Código {sortField === 'codigo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('nome') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('nome')}><div className="flex items-center gap-1">Nome {sortField === 'nome' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('grupo') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('grupo')}><div className="flex items-center gap-1">Grupo {sortField === 'grupo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('subgrupo') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('subgrupo')}><div className="flex items-center gap-1">Subgrupo {sortField === 'subgrupo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('unidade') && <th className="px-3 py-2 text-left cursor-pointer hover:bg-muted" onClick={() => toggleSort('unidade')}><div className="flex items-center gap-1">Unidade {sortField === 'unidade' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('qtd_max') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('qtd_max')}><div className="flex items-center justify-end gap-1">Qtd Máx {sortField === 'qtd_max' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('valor_atual') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('valor_atual')}><div className="flex items-center justify-end gap-1">Valor Atual {sortField === 'valor_atual' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('valor_minimo') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('valor_minimo')}><div className="flex items-center justify-end gap-1">Val. Mín {sortField === 'valor_minimo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('valor_locacao') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('valor_locacao')}><div className="flex items-center justify-end gap-1">Val. Loc. {sortField === 'valor_locacao' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('valor_min_locacao') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('valor_min_locacao')}><div className="flex items-center justify-end gap-1">Mín. Loc. {sortField === 'valor_min_locacao' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('valor_instalacao') && <th className="px-3 py-2 text-right cursor-pointer hover:bg-muted" onClick={() => toggleSort('valor_instalacao')}><div className="flex items-center justify-end gap-1">Instalação {sortField === 'valor_instalacao' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('adicional') && <th className="px-3 py-2 text-center cursor-pointer hover:bg-muted" onClick={() => toggleSort('adicional')}><div className="flex items-center justify-center gap-1">Adic. {sortField === 'adicional' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      {visibleCols.has('ativo') && <th className="px-3 py-2 text-center cursor-pointer hover:bg-muted" onClick={() => toggleSort('ativo')}><div className="flex items-center justify-center gap-1">Ativo {sortField === 'ativo' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}</div></th>}
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProdutos.map(p => (
                      <tr key={p.id} className={`border-b hover:bg-muted/30 ${!p.ativo ? 'opacity-50' : ''}`}>
                        {visibleCols.has('id_produto') && <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.id_produto ?? '-'}</td>}
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
            <div className="flex items-center gap-3 flex-wrap justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                <Input
                  placeholder="Pesquisar kit por nome, ID ou código..."
                  value={kitSearchTerm}
                  onChange={e => setKitSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              {hasKitFilters && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Filtros:</span>
                  {Object.entries(kitColumnFilters).map(([col, val]) => (
                    <span key={col} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                      {col}: {val}
                      <button onClick={() => setKitFilter(col, '')} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <Button variant="ghost" size="sm" onClick={clearKitFilters}>Limpar todos</Button>
                </div>
              )}
              <div className={!hasKitFilters ? 'ml-auto' : ''}>
                <Button onClick={() => { setEditKit(null); setKForm({ nome: '', descricao: '', categoria: 'Smartportaria', codigo: '', preco_kit: '', valor_minimo: '', valor_locacao: '', valor_minimo_locacao: '', valor_instalacao: '' }); setKitItens([]); setShowKitForm(true); }}>
                  <Plus className="mr-2 h-4 w-4" />Novo Kit
                </Button>
              </div>
            </div>

            {hasKitFilters && (
              <div className="text-sm text-muted-foreground">
                Exibindo {filteredKits.length} de {kits.length} kits
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : filteredKits.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">{kits.length === 0 ? 'Nenhum kit cadastrado.' : 'Nenhum kit encontrado com os filtros aplicados.'}</CardContent></Card>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-center w-16">{renderKitColHeader('id_kit', 'ID')}</th>
                      <th className="px-3 py-2 text-left">{renderKitColHeader('nome', 'Kit')}</th>
                      <th className="px-3 py-2 text-left">{renderKitColHeader('categoria', 'Categoria')}</th>
                      <th className="px-3 py-2 text-center">{renderKitColHeader('itens', 'Itens', 'center')}</th>
                      <th className="px-3 py-2 text-right">{renderKitColHeader('atual', 'Val. Atual', 'right')}</th>
                      <th className="px-3 py-2 text-right">{renderKitColHeader('minimo', 'Val. Mínimo', 'right')}</th>
                      <th className="px-3 py-2 text-right">{renderKitColHeader('locacao', 'Val. Locação', 'right')}</th>
                      <th className="px-3 py-2 text-right">{renderKitColHeader('minLocacao', 'Mín. Locação', 'right')}</th>
                      <th className="px-3 py-2 text-right">{renderKitColHeader('instalacao', 'Instalação', 'right')}</th>
                      <th className="px-3 py-2 text-center">{renderKitColHeader('ativo', 'Ativo', 'center')}</th>
                      <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKits.map(k => {
                      const totals = { atual: 0, minimo: 0, locacao: 0, minLocacao: 0, instalacao: 0 };
                      k.itens?.forEach(i => {
                        if (i.produto) {
                          totals.atual += (i.produto.preco_unitario || 0) * i.quantidade;
                          totals.minimo += (i.produto.valor_minimo || 0) * i.quantidade;
                          totals.locacao += (i.produto.valor_locacao || 0) * i.quantidade;
                          totals.minLocacao += (i.produto.valor_minimo_locacao || 0) * i.quantidade;
                          totals.instalacao += (i.produto.valor_instalacao || 0) * i.quantidade;
                        }
                      });
                      return (
                        <tr key={k.id} className={`border-b hover:bg-muted/30 cursor-pointer ${!k.ativo ? 'opacity-50' : ''}`} onClick={() => setViewKit(k)}>
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs font-mono text-muted-foreground">{(k as any).id_kit ? `#${(k as any).id_kit}` : '—'}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-medium text-foreground">{k.nome}</span>
                          </td>
                          <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{catLabel(k.categoria)}</Badge></td>
                          <td className="px-3 py-2 text-center text-xs">{k.itens?.length || 0}</td>
                          <td className="px-3 py-2 text-right text-xs font-medium">R$ {totals.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right text-xs">R$ {totals.minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right text-xs">R$ {totals.locacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right text-xs">R$ {totals.minLocacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right text-xs">R$ {totals.instalacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}><Switch checked={k.ativo} onCheckedChange={v => toggleAtivo('kit', k.id, v)} /></td>
                          <td className="px-3 py-2 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openKitEdit(k)}><Pencil className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'kit', id: k.id })}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Nome *</Label><Input value={pForm.nome} onChange={e => setPForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div><Label>Id</Label><Input type="number" value={pForm.id_produto} onChange={e => setPForm(p => ({ ...p, id_produto: e.target.value }))} placeholder="Ex: 3246" /></div>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editKit ? 'Editar Kit' : 'Novo Kit'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2"><Label>Nome *</Label><Input value={kForm.nome} onChange={e => setKForm(k => ({ ...k, nome: e.target.value }))} /></div>
              <div><Label>ID do Kit</Label><Input value={kForm.codigo} onChange={e => setKForm(k => ({ ...k, codigo: e.target.value }))} placeholder="Ex: KIT-001" /></div>
              <div>
                <Label>Categoria</Label>
                <Select value={kForm.categoria} onValueChange={v => setKForm(k => ({ ...k, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRUPOS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea value={kForm.descricao} onChange={e => setKForm(k => ({ ...k, descricao: e.target.value }))} rows={2} /></div>

            <div>
              <Label className="mb-2 block">Produtos do Kit</Label>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-2 text-left">Produto</th>
                      <th className="px-2 py-2 text-center w-16">Qtd</th>
                      <th className="px-2 py-2 text-right">Val. Atual</th>
                      <th className="px-2 py-2 text-right">Val. Mínimo</th>
                      <th className="px-2 py-2 text-right">Val. Locação</th>
                      <th className="px-2 py-2 text-right">Mín. Locação</th>
                      <th className="px-2 py-2 text-right">Instalação</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kitItens.map((item, idx) => {
                      const prod = produtos.find(p => p.id === item.produto_id);
                      return (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-2 py-1.5">
                            <Select value={item.produto_id} onValueChange={v => { const updated = kitItens.map((it, i) => i === idx ? { ...it, produto_id: v } : it); setKitItens(updated); recalcKitPrices(updated); }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                              <SelectContent>{produtos.filter(p => p.ativo).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <Input type="number" min="1" className="w-16 h-8 text-xs text-center" value={item.quantidade} onChange={e => { const updated = kitItens.map((it, i) => i === idx ? { ...it, quantidade: parseInt(e.target.value) || 1 } : it); setKitItens(updated); recalcKitPrices(updated); }} />
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs">R$ {((prod?.preco_unitario || 0) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 text-right text-xs">R$ {((prod?.valor_minimo || 0) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 text-right text-xs">R$ {((prod?.valor_locacao || 0) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 text-right text-xs">R$ {((prod?.valor_minimo_locacao || 0) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 text-right text-xs">R$ {((prod?.valor_instalacao || 0) * item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1.5 text-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { const updated = kitItens.filter((_, i) => i !== idx); setKitItens(updated); recalcKitPrices(updated); }}><Trash2 className="h-3 w-3" /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 font-semibold text-xs">
                      <td className="px-2 py-2" colSpan={2}>Total do Kit</td>
                      <td className="px-2 py-2 text-right">{kForm.preco_kit ? `R$ ${kForm.preco_kit}` : 'R$ 0,00'}</td>
                      <td className="px-2 py-2 text-right">{kForm.valor_minimo ? `R$ ${kForm.valor_minimo}` : 'R$ 0,00'}</td>
                      <td className="px-2 py-2 text-right">{kForm.valor_locacao ? `R$ ${kForm.valor_locacao}` : 'R$ 0,00'}</td>
                      <td className="px-2 py-2 text-right">{kForm.valor_minimo_locacao ? `R$ ${kForm.valor_minimo_locacao}` : 'R$ 0,00'}</td>
                      <td className="px-2 py-2 text-right">{kForm.valor_instalacao ? `R$ ${kForm.valor_instalacao}` : 'R$ 0,00'}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setKitItens(prev => [...prev, { produto_id: '', quantidade: 1 }])}>
                <Plus className="mr-1 h-3 w-3" />Adicionar Produto
              </Button>
            </div>

            <Button onClick={saveKit} className="w-full">{editKit ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kit Detail View Dialog */}
      <Dialog open={!!viewKit} onOpenChange={v => { if (!v) setViewKit(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {viewKit && (() => {
            const totals = { atual: 0, minimo: 0, locacao: 0, minLocacao: 0, instalacao: 0 };
            viewKit.itens?.forEach(i => {
              if (i.produto) {
                totals.atual += (i.produto.preco_unitario || 0) * i.quantidade;
                totals.minimo += (i.produto.valor_minimo || 0) * i.quantidade;
                totals.locacao += (i.produto.valor_locacao || 0) * i.quantidade;
                totals.minLocacao += (i.produto.valor_minimo_locacao || 0) * i.quantidade;
                totals.instalacao += (i.produto.valor_instalacao || 0) * i.quantidade;
              }
            });
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {(viewKit as any).id_kit && <span className="text-sm font-mono text-muted-foreground">#{(viewKit as any).id_kit}</span>}
                    {viewKit.nome}
                    <Badge variant="outline" className="text-xs">{catLabel(viewKit.categoria)}</Badge>
                    <div className="ml-auto flex items-center gap-2">
                      <Switch checked={viewKit.ativo} onCheckedChange={v => { toggleAtivo('kit', viewKit.id, v); setViewKit({ ...viewKit, ativo: v }); }} />
                      <Button size="icon" variant="ghost" onClick={() => { openKitEdit(viewKit); setViewKit(null); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { setDeleteTarget({ type: 'kit', id: viewKit.id }); setViewKit(null); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                {viewKit.descricao && <p className="text-sm text-muted-foreground">{viewKit.descricao}</p>}
                
                {viewKit.itens && viewKit.itens.length > 0 && (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left">Código</th>
                          <th className="px-3 py-2 text-left">Produto</th>
                          <th className="px-3 py-2 text-center">Qtd</th>
                          <th className="px-3 py-2 text-right">Val. Atual</th>
                          <th className="px-3 py-2 text-right">Val. Mínimo</th>
                          <th className="px-3 py-2 text-right">Val. Locação</th>
                          <th className="px-3 py-2 text-right">Mín. Locação</th>
                          <th className="px-3 py-2 text-right">Instalação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewKit.itens.map(i => (
                          <tr key={i.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{i.produto?.codigo || '-'}</td>
                            <td className="px-3 py-2 text-foreground">{i.produto?.nome || 'Produto removido'}</td>
                            <td className="px-3 py-2 text-center">{i.quantidade}</td>
                            <td className="px-3 py-2 text-right">R$ {((i.produto?.preco_unitario || 0) * i.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right">R$ {((i.produto?.valor_minimo || 0) * i.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right">R$ {((i.produto?.valor_locacao || 0) * i.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right">R$ {((i.produto?.valor_minimo_locacao || 0) * i.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2 text-right">R$ {((i.produto?.valor_instalacao || 0) * i.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 font-semibold">
                          <td className="px-3 py-2" colSpan={3}>Total do Kit</td>
                          <td className="px-3 py-2 text-right">R$ {totals.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">R$ {totals.minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">R$ {totals.locacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">R$ {totals.minLocacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">R$ {totals.instalacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            );
          })()}
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
