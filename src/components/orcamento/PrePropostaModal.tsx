import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Plus, Trash2, Search, FileText, Package, ArrowRightLeft, Percent } from 'lucide-react';

export type PrePropostaItem = {
  nome: string;
  codigo?: string;
  id_kit?: number;
  id_produto?: number;
  qtd: number;
  valor_locacao: number;
  valor_instalacao: number;
  desconto?: number;
};

export type PrePropostaData = {
  kits: PrePropostaItem[];
  avulsos: PrePropostaItem[];
  aproveitados: PrePropostaItem[];
  servicos: PrePropostaItem[];
  mensalidade_total: number;
  taxa_conexao_total: number;
  ambientes?: any[];
};

interface Props {
  open: boolean;
  onClose: () => void;
  initialData: PrePropostaData;
  onConfirm: (editedData: PrePropostaData) => void;
  isGenerating?: boolean;
}

type CatalogItem = {
  id: string;
  nome: string;
  codigo?: string;
  id_produto?: number;
  id_kit?: number;
  valor_locacao: number;
  valor_instalacao: number;
  categoria: string;
  type: 'produto' | 'kit';
};

type GroupKey = 'kits' | 'avulsos' | 'aproveitados' | 'servicos';

const GROUP_CONFIG: Record<GroupKey, { label: string; badgeClass: string; badgeVariant?: any }> = {
  kits: { label: 'Kits', badgeClass: 'bg-primary text-primary-foreground' },
  avulsos: { label: 'Itens Avulsos', badgeClass: '' },
  aproveitados: { label: 'Aproveitados (50%)', badgeClass: 'bg-accent text-accent-foreground' },
  servicos: { label: 'Serviços', badgeClass: '' },
};

export default function PrePropostaModal({ open, onClose, initialData, onConfirm, isGenerating }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<PrePropostaData>(initialData);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [addingTo, setAddingTo] = useState<GroupKey | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'gerente_comercial';

  useEffect(() => {
    if (open) {
      setData(initialData);
      loadCatalog();
    }
  }, [open, initialData]);

  const loadCatalog = async () => {
    if (catalog.length > 0) return;
    setLoadingCatalog(true);
    const [{ data: produtos }, { data: kits }] = await Promise.all([
      supabase.from('orcamento_produtos').select('id, nome, codigo, id_produto, valor_locacao, valor_instalacao, categoria').eq('ativo', true),
      supabase.from('orcamento_kits').select('id, nome, codigo, id_kit, valor_locacao, valor_instalacao, categoria').eq('ativo', true),
    ]);
    const items: CatalogItem[] = [
      ...(produtos || []).map(p => ({ ...p, type: 'produto' as const, valor_locacao: p.valor_locacao || 0, valor_instalacao: p.valor_instalacao || 0 })),
      ...(kits || []).map(k => ({ ...k, type: 'kit' as const, id_kit: k.id_kit, valor_locacao: k.valor_locacao || 0, valor_instalacao: k.valor_instalacao || 0 })),
    ];
    setCatalog(items);
    setLoadingCatalog(false);
  };

  const updateItem = (group: GroupKey, index: number, field: keyof PrePropostaItem, value: any) => {
    setData(prev => {
      const items = [...prev[group]];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [group]: items };
    });
  };

  const removeItem = (group: GroupKey, index: number) => {
    setData(prev => ({
      ...prev,
      [group]: prev[group].filter((_, i) => i !== index),
    }));
  };

  const addItemFromCatalog = (item: CatalogItem, group: GroupKey) => {
    const newItem: PrePropostaItem = {
      nome: item.nome,
      codigo: item.codigo,
      id_kit: item.id_kit,
      id_produto: item.id_produto,
      qtd: 1,
      valor_locacao: item.valor_locacao,
      valor_instalacao: item.valor_instalacao,
      desconto: group === 'aproveitados' ? 50 : 0,
    };
    setData(prev => ({
      ...prev,
      [group]: [...prev[group], newItem],
    }));
    setAddingTo(null);
    setSearchTerm('');
  };

  const swapItem = (group: GroupKey, index: number, catalogItem: CatalogItem) => {
    setData(prev => {
      const items = [...prev[group]];
      const old = items[index];
      items[index] = {
        ...old,
        nome: catalogItem.nome,
        codigo: catalogItem.codigo,
        id_kit: catalogItem.id_kit,
        id_produto: catalogItem.id_produto,
        valor_locacao: catalogItem.valor_locacao,
        valor_instalacao: catalogItem.valor_instalacao,
      };
      return { ...prev, [group]: items };
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    const allItems = [...data.kits, ...data.avulsos, ...data.aproveitados, ...data.servicos];
    const mensalidade = allItems.reduce((sum, i) => {
      const desc = (i.desconto || 0) / 100;
      return sum + (i.valor_locacao || 0) * (1 - desc) * i.qtd;
    }, 0);
    const instalacao = allItems.reduce((sum, i) => {
      const desc = (i.desconto || 0) / 100;
      return sum + (i.valor_instalacao || 0) * (1 - desc) * i.qtd;
    }, 0);
    return { mensalidade, instalacao, totalItens: allItems.length };
  }, [data]);

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return catalog.slice(0, 30);
    const term = searchTerm.toLowerCase();
    return catalog.filter(c =>
      c.nome.toLowerCase().includes(term) ||
      c.codigo?.toLowerCase().includes(term) ||
      c.categoria?.toLowerCase().includes(term)
    ).slice(0, 30);
  }, [catalog, searchTerm]);

  const handleConfirm = () => {
    onConfirm({
      ...data,
      mensalidade_total: totals.mensalidade,
      taxa_conexao_total: totals.instalacao,
    });
  };

  const renderGroup = (groupKey: GroupKey) => {
    const items = data[groupKey];
    const config = GROUP_CONFIG[groupKey];

    return (
      <Card key={groupKey}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge className={config.badgeClass}>{config.label}</Badge>
            {canEdit && (
              <Popover open={addingTo === groupKey} onOpenChange={open => { setAddingTo(open ? groupKey : null); setSearchTerm(''); }}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-2 border-b">
                    <div className="flex items-center gap-2 px-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        placeholder="Buscar produto ou kit..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-60">
                    {loadingCatalog ? (
                      <div className="p-4 text-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                    ) : filteredCatalog.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">Nenhum item encontrado</div>
                    ) : (
                      <div className="p-1">
                        {filteredCatalog.map(item => (
                          <button
                            key={`${item.type}-${item.id}`}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm transition-colors"
                            onClick={() => addItemFromCatalog(item, groupKey)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate mr-2">{item.nome}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">{item.type === 'kit' ? 'Kit' : 'Prod'}</Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {item.codigo && <span className="mr-2">{item.codigo}</span>}
                              Loc: {formatBRL(item.valor_locacao)} · Inst: {formatBRL(item.valor_instalacao)}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum item nesta categoria</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1.5 pr-1 w-14 text-xs font-medium">Qtd</th>
                    <th className="text-left py-1.5 pr-1 text-xs font-medium">Descrição</th>
                    <th className="text-left py-1.5 pr-1 w-16 text-xs font-medium">Código</th>
                    <th className="text-right py-1.5 px-1 w-24 text-xs font-medium">Locação</th>
                    <th className="text-right py-1.5 px-1 w-24 text-xs font-medium">Instalação</th>
                    {groupKey === 'aproveitados' && <th className="text-right py-1.5 px-1 w-16 text-xs font-medium">Desc%</th>}
                    <th className="text-right py-1.5 pl-1 w-24 text-xs font-medium">Total Loc.</th>
                    {canEdit && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const desc = (item.desconto || 0) / 100;
                    const totalLoc = (item.valor_locacao || 0) * (1 - desc) * item.qtd;
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 pr-1">
                          {canEdit ? (
                            <Input
                              type="number"
                              min={1}
                              className="h-7 w-14 text-xs px-1.5"
                              value={item.qtd}
                              onChange={e => updateItem(groupKey, i, 'qtd', Math.max(1, parseInt(e.target.value) || 1))}
                            />
                          ) : (
                            <span className="text-xs">{item.qtd}</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-1">
                          {canEdit ? (
                            <SwapableItem
                              item={item}
                              catalog={catalog}
                              onSwap={catalogItem => swapItem(groupKey, i, catalogItem)}
                            />
                          ) : (
                            <span className="text-xs font-medium truncate block" title={item.nome}>{item.nome}</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-1 text-xs text-muted-foreground">{item.codigo || '-'}</td>
                        <td className="py-1.5 px-1">
                          {canEdit ? (
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              className="h-7 w-24 text-xs px-1.5 text-right"
                              value={item.valor_locacao}
                              onChange={e => updateItem(groupKey, i, 'valor_locacao', parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <span className="text-xs text-right block">{formatBRL(item.valor_locacao)}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-1">
                          {canEdit ? (
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              className="h-7 w-24 text-xs px-1.5 text-right"
                              value={item.valor_instalacao}
                              onChange={e => updateItem(groupKey, i, 'valor_instalacao', parseFloat(e.target.value) || 0)}
                            />
                          ) : (
                            <span className="text-xs text-right block">{formatBRL(item.valor_instalacao)}</span>
                          )}
                        </td>
                        {groupKey === 'aproveitados' && (
                          <td className="py-1.5 px-1">
                            {canEdit ? (
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                className="h-7 w-16 text-xs px-1.5 text-right"
                                value={item.desconto || 0}
                                onChange={e => updateItem(groupKey, i, 'desconto', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                              />
                            ) : (
                              <span className="text-xs text-right block">{item.desconto || 0}%</span>
                            )}
                          </td>
                        )}
                        <td className="py-1.5 pl-1 text-right text-xs font-medium whitespace-nowrap">
                          {formatBRL(totalLoc)}
                        </td>
                        {canEdit && (
                          <td className="py-1.5 pl-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(groupKey, i)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={open => { if (!open && !isGenerating) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Pré-Proposta — Validação Comercial
          </DialogTitle>
          <DialogDescription>
            Revise e ajuste equipamentos, quantidades e valores antes de gerar a proposta final.
            {!canEdit && ' (Somente administradores e gerentes comerciais podem editar)'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-3 pb-4">
            {(['kits', 'avulsos', 'aproveitados', 'servicos'] as GroupKey[]).map(renderGroup)}

            {/* Totals */}
            <Card className="bg-muted/50 border-primary/20">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Mensalidade Estimada</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatBRL(totals.mensalidade)}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                    </p>
                  </div>
                  <Separator orientation="vertical" className="hidden sm:block" />
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa de Instalação Estimada</p>
                    <p className="text-xl font-bold text-foreground">
                      {formatBRL(totals.instalacao)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">até 10x de {formatBRL(totals.instalacao / 10)}</p>
                  </div>
                  <Separator orientation="vertical" className="hidden sm:block" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total de Itens</p>
                    <p className="text-xl font-bold text-foreground">{totals.totalItens}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={isGenerating || totals.totalItens === 0}>
            {isGenerating ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Gerando Proposta...</>
            ) : (
              <><FileText className="mr-1.5 h-4 w-4" /> Gerar Proposta Final</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component for swappable item
function SwapableItem({ item, catalog, onSwap }: { item: PrePropostaItem; catalog: CatalogItem[]; onSwap: (item: CatalogItem) => void }) {
  const [swapOpen, setSwapOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return catalog.slice(0, 20);
    const t = search.toLowerCase();
    return catalog.filter(c => c.nome.toLowerCase().includes(t) || c.codigo?.toLowerCase().includes(t)).slice(0, 20);
  }, [catalog, search]);

  return (
    <Popover open={swapOpen} onOpenChange={setSwapOpen}>
      <PopoverTrigger asChild>
        <button className="text-left w-full group" title={`${item.nome} — clique para trocar`}>
          <span className="text-xs font-medium truncate block group-hover:text-primary transition-colors">{item.nome}</span>
          <ArrowRightLeft className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity inline-block ml-1" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="flex items-center gap-2 px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Trocar por..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="h-48">
          <div className="p-1">
            {filtered.map(c => (
              <button
                key={`${c.type}-${c.id}`}
                className="w-full text-left px-3 py-1.5 rounded-md hover:bg-muted text-xs transition-colors"
                onClick={() => { onSwap(c); setSwapOpen(false); setSearch(''); }}
              >
                <span className="font-medium">{c.nome}</span>
                {c.codigo && <span className="text-muted-foreground ml-1">({c.codigo})</span>}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
