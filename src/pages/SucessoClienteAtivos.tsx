import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { Search, Building2, MoreHorizontal, RefreshCw, UserCheck, MessageSquareWarning, ThumbsUp, Eye, ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Hammer, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  filial: string | null;
  praca: string | null;
  unidades: number | null;
  mensalidade: number | null;
  data_ativacao: string | null;
  data_termino: string | null;
  endereco: string | null;
  project_id?: string | null;
  status_implantacao?: string | null;
}


type SortDir = 'asc' | 'desc' | null;
type SortKey = 'contrato' | 'razao_social' | 'filial' | 'unidades' | 'mensalidade' | 'data_ativacao' | 'data_termino' | 'contrato_status';

const getContractStatus = (c: Customer) => {
  const termino = c.data_termino
    ? parseISO(c.data_termino)
    : c.data_ativacao
      ? addMonths(parseISO(c.data_ativacao), 36)
      : null;
  if (!termino) return null;
  const dias = differenceInDays(termino, new Date());
  if (dias < 0) return { label: 'Vencido', variant: 'destructive' as const, dias };
  if (dias <= 90) return { label: `${dias}d`, variant: 'destructive' as const, dias };
  if (dias <= 180) return { label: `${dias}d`, variant: 'secondary' as const, dias };
  return { label: 'Vigente', variant: 'secondary' as const, dias };
};

function ColumnHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  filterValues,
  selectedFilters,
  onFilterChange,
  className,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  filterValues: string[];
  selectedFilters: string[];
  onFilterChange: (key: SortKey, values: string[]) => void;
  className?: string;
}) {
  const [filterSearch, setFilterSearch] = useState('');
  const isActive = currentSort === sortKey;
  const hasFilter = selectedFilters.length > 0;

  const filteredValues = filterValues.filter(v =>
    v.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const toggleValue = (val: string) => {
    const next = selectedFilters.includes(val)
      ? selectedFilters.filter(v => v !== val)
      : [...selectedFilters, val];
    onFilterChange(sortKey, next);
  };

  return (
    <TableHead className={className}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSort(sortKey)}
          className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-medium"
        >
          {label}
          {isActive && currentDir === 'asc' && <ArrowUp className="h-3 w-3" />}
          {isActive && currentDir === 'desc' && <ArrowDown className="h-3 w-3" />}
          {!isActive && <ArrowUpDown className="h-3 w-3 opacity-30" />}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className={`p-0.5 rounded hover:bg-accent transition-colors ${hasFilter ? 'text-primary' : 'text-muted-foreground opacity-50 hover:opacity-100'}`}>
              <Filter className="h-3 w-3" />
              {hasFilter && (
                <span className="sr-only">{selectedFilters.length} filtros</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-2">
              <Input
                placeholder="Buscar..."
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                className="h-7 text-xs"
              />
              {hasFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs w-full"
                  onClick={() => onFilterChange(sortKey, [])}
                >
                  <X className="h-3 w-3 mr-1" /> Limpar
                </Button>
              )}
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {filteredValues.map(val => (
                    <label key={val} className="flex items-center gap-2 text-xs py-0.5 px-1 hover:bg-accent rounded cursor-pointer">
                      <Checkbox
                        checked={selectedFilters.includes(val)}
                        onCheckedChange={() => toggleValue(val)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="truncate">{val}</span>
                    </label>
                  ))}
                  {filteredValues.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhum valor</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TableHead>
  );
}

export default function SucessoClienteAtivos() {
  const navigate = useNavigate();
  const [carteira, setCarteira] = useState<'pci' | 'ppe'>('pci');
  const [customersPci, setCustomersPci] = useState<Customer[]>([]);
  const [customersPpe, setCustomersPpe] = useState<Customer[]>([]);
  const [loadingPci, setLoadingPci] = useState(true);
  const [loadingPpe, setLoadingPpe] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

  const customers = carteira === 'pci' ? customersPci : customersPpe;
  const loading = carteira === 'pci' ? loadingPci : loadingPpe;

  const { toast } = useToast();
  const [renovacaoCustomer, setRenovacaoCustomer] = useState<Customer | null>(null);
  const [renovacaoObs, setRenovacaoObs] = useState('');
  const [renovacaoSaving, setRenovacaoSaving] = useState(false);

  const openRenovacao = (c: Customer) => {
    setRenovacaoCustomer(c);
    setRenovacaoObs('');
  };

  const handleAbrirChamadoRenovacao = async () => {
    if (!renovacaoCustomer) return;
    setRenovacaoSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const userName = userData.user?.user_metadata?.nome || userData.user?.email || 'Sistema';

      const termino = renovacaoCustomer.data_termino
        ? parseISO(renovacaoCustomer.data_termino)
        : renovacaoCustomer.data_ativacao
          ? addMonths(parseISO(renovacaoCustomer.data_ativacao), 36)
          : null;
      const dias = termino ? differenceInDays(termino, new Date()) : null;

      const partes: string[] = [
        'Processo de Renovação Contratual iniciado.',
        `Cliente: ${renovacaoCustomer.razao_social} (${renovacaoCustomer.contrato})`,
        `Data de Ativação: ${renovacaoCustomer.data_ativacao ? format(parseISO(renovacaoCustomer.data_ativacao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}`,
        `Término do Contrato: ${termino ? format(termino, 'dd/MM/yyyy', { locale: ptBR }) : '-'}`,
        `Mensalidade Atual: ${renovacaoCustomer.mensalidade != null ? `R$ ${renovacaoCustomer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}`,
        `Status: ${dias === null ? 'Sem informação' : dias < 0 ? 'Contrato vencido' : `${dias} dias restantes`}`,
      ];
      if (renovacaoObs.trim()) partes.push('', `Observações: ${renovacaoObs.trim()}`);

      const { error } = await supabase.from('customer_chamados').insert({
        customer_id: renovacaoCustomer.id,
        assunto: 'Renovação Contratual',
        descricao: partes.join('\n'),
        prioridade: 'alta',
        status: 'aberto',
        created_by: userId,
        created_by_name: userName,
      });
      if (error) throw error;

      toast({ title: 'Chamado aberto', description: 'Chamado de Renovação Contratual criado com sucesso.' });
      setRenovacaoCustomer(null);
      setRenovacaoObs('');
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro', description: 'Não foi possível abrir o chamado.', variant: 'destructive' });
    } finally {
      setRenovacaoSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [{ data }, { data: cancelled }] = await Promise.all([
        supabase
          .from('customer_portfolio')
          .select('id, contrato, razao_social, filial, praca, unidades, mensalidade, data_ativacao, data_termino, endereco, project_id, status_implantacao')
          .order('razao_social'),
        supabase.from('customer_cancelamentos').select('customer_id'),
      ]);
      const cancelledIds = new Set((cancelled || []).map((r: any) => r.customer_id));
      const pciData = (data || []).filter((c: any) =>
        /^(TEMP-|SP|PR|PD|PCI)/i.test(c.contrato) && !cancelledIds.has(c.id)
      ) as Customer[];
      setCustomersPci(pciData);
      setLoadingPci(false);
    })();
    (async () => {
      const { data } = await supabase
        .from('ppe_customers')
        .select('id, contrato, razao_social, filial, mensalidade, data_ativacao, data_termino, endereco, cameras')
        .order('razao_social');
      const mapped: Customer[] = (data || []).map((r: any) => ({
        id: r.id,
        contrato: r.contrato,
        razao_social: r.razao_social,
        filial: r.filial,
        praca: null,
        unidades: r.cameras ?? null,
        mensalidade: r.mensalidade,
        data_ativacao: r.data_ativacao,
        data_termino: r.data_termino,
        endereco: r.endereco,
        project_id: null,
        status_implantacao: null,
      }));
      setCustomersPpe(mapped);
      setLoadingPpe(false);
    })();
  }, []);


  // Reset filters when switching tabs
  useEffect(() => {
    setColumnFilters({});
    setSearch('');
  }, [carteira]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleFilterChange = (key: SortKey, values: string[]) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (values.length === 0) delete next[key];
      else next[key] = values;
      return next;
    });
  };

  // Compute unique values per column for filter dropdowns
  const filterOptions = useMemo(() => {
    const unique = (arr: (string | null | undefined)[]) =>
      [...new Set(arr.filter(Boolean).map(v => String(v)))].sort();

    return {
      contrato: unique(customers.map(c => c.contrato)),
      razao_social: unique(customers.map(c => c.razao_social)),
      filial: unique(customers.map(c => c.filial)),
      unidades: unique(customers.map(c => c.unidades != null ? String(c.unidades) : null)),
      mensalidade: unique(customers.map(c => c.mensalidade != null ? `R$ ${Number(c.mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null)),
      data_ativacao: unique(customers.map(c => c.data_ativacao ? new Date(c.data_ativacao + 'T00:00:00').toLocaleDateString('pt-BR') : null)),
      data_termino: unique(customers.map(c => c.data_termino ? new Date(c.data_termino + 'T00:00:00').toLocaleDateString('pt-BR') : (c.data_ativacao ? addMonths(parseISO(c.data_ativacao), 36).toLocaleDateString('pt-BR') : null))),
      contrato_status: ['Vigente', 'Vencido', ...new Set(customers.map(c => {
        const s = getContractStatus(c);
        return s && s.label !== 'Vigente' && s.label !== 'Vencido' ? s.label : null;
      }).filter(Boolean) as string[])].filter((v, i, a) => a.indexOf(v) === i),
    };
  }, [customers]);

  const getDisplayValue = (c: Customer, key: SortKey): string => {
    switch (key) {
      case 'contrato': return c.contrato;
      case 'razao_social': return c.razao_social;
      case 'filial': return c.filial || '';
      case 'unidades': return c.unidades != null ? String(c.unidades) : '';
      case 'mensalidade': return c.mensalidade != null ? `R$ ${Number(c.mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
      case 'data_ativacao': return c.data_ativacao ? new Date(c.data_ativacao + 'T00:00:00').toLocaleDateString('pt-BR') : '';
      case 'data_termino': {
        const t = c.data_termino ? new Date(c.data_termino + 'T00:00:00') : (c.data_ativacao ? addMonths(parseISO(c.data_ativacao), 36) : null);
        return t ? t.toLocaleDateString('pt-BR') : '';
      }
      case 'contrato_status': {
        const s = getContractStatus(c);
        return s ? s.label : 'Vigente';
      }
      default: return '';
    }
  };

  const getSortValue = (c: Customer, key: SortKey): string | number => {
    switch (key) {
      case 'contrato': return c.contrato.toLowerCase();
      case 'razao_social': return c.razao_social.toLowerCase();
      case 'filial': return (c.filial || '').toLowerCase();
      case 'unidades': return c.unidades ?? -1;
      case 'mensalidade': return c.mensalidade ?? -1;
      case 'data_ativacao': return c.data_ativacao || '';
      case 'data_termino': {
        if (c.data_termino) return c.data_termino;
        if (c.data_ativacao) return addMonths(parseISO(c.data_ativacao), 36).toISOString();
        return '';
      }
      case 'contrato_status': {
        const s = getContractStatus(c);
        return s ? s.dias : 99999;
      }
      default: return '';
    }
  };

  const processed = useMemo(() => {
    let result = customers.filter(c => {
      if (search) {
        const s = search.toLowerCase();
        if (!(
          c.razao_social.toLowerCase().includes(s) ||
          c.contrato.toLowerCase().includes(s) ||
          (c.filial || '').toLowerCase().includes(s) ||
          (c.praca || '').toLowerCase().includes(s)
        )) return false;
      }

      // Apply column filters
      for (const [key, values] of Object.entries(columnFilters)) {
        if (values.length === 0) continue;
        const display = getDisplayValue(c, key as SortKey);
        if (!values.includes(display)) return false;
      }

      return true;
    });

    // Sort
    if (sortKey && sortDir) {
      result = [...result].sort((a, b) => {
        const va = getSortValue(a, sortKey);
        const vb = getSortValue(b, sortKey);
        const cmp = typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), 'pt-BR');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [customers, search, sortKey, sortDir, columnFilters]);

  const totalMensalidade = processed.reduce((sum, c) => sum + (c.mensalidade || 0), 0);
  const totalUnidades = processed.reduce((sum, c) => sum + (c.unidades || 0), 0);
  const activeFilterCount = Object.values(columnFilters).filter(v => v.length > 0).length;

  const expiringCount = customers.filter(c => {
    const status = getContractStatus(c);
    return status !== null && (status.label === 'Vencido' || status.dias <= 180);
  }).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes Ativos</h1>
          <p className="text-muted-foreground">Gestão completa da carteira de clientes ativos</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{customers.length}</div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalUnidades}</div>
              <p className="text-sm text-muted-foreground">{carteira === 'ppe' ? 'Total de Câmeras' : 'Total de Unidades'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                R$ {totalMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground">Receita Mensal</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{expiringCount}</div>
              <p className="text-sm text-muted-foreground">Contratos a Vencer</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={carteira} onValueChange={(v) => setCarteira(v as 'pci' | 'ppe')}>
          <TabsList>
            <TabsTrigger value="pci">Clientes PCI ({customersPci.length})</TabsTrigger>
            <TabsTrigger value="ppe">Clientes PPE ({customersPpe.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Carteira de Clientes
            </CardTitle>
            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setColumnFilters({})}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar {activeFilterCount} filtro(s)
                </Button>
              )}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, contrato..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : processed.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nenhum cliente encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <ColumnHeader label="Contrato" sortKey="contrato" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.contrato} selectedFilters={columnFilters.contrato || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Razão Social" sortKey="razao_social" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.razao_social} selectedFilters={columnFilters.razao_social || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Filial" sortKey="filial" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.filial} selectedFilters={columnFilters.filial || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label={carteira === 'ppe' ? 'Câmeras' : 'Unid.'} sortKey="unidades" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.unidades} selectedFilters={columnFilters.unidades || []} onFilterChange={handleFilterChange} className="text-center" />
                      <ColumnHeader label="Mensalidade" sortKey="mensalidade" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.mensalidade} selectedFilters={columnFilters.mensalidade || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Ativação" sortKey="data_ativacao" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.data_ativacao} selectedFilters={columnFilters.data_ativacao || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Término" sortKey="data_termino" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.data_termino} selectedFilters={columnFilters.data_termino || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Contrato" sortKey="contrato_status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.contrato_status} selectedFilters={columnFilters.contrato_status || []} onFilterChange={handleFilterChange} />
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processed.map(c => {
                      const status = getContractStatus(c);
                      const showBadge = status && (status.label === 'Vencido' || status.dias <= 180);
                      return (
                        <TableRow key={c.id} className="group">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{c.contrato}</span>
                              {c.contrato?.startsWith('TEMP-') && (
                                <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">
                                  <Hammer className="h-3 w-3" />
                                  {c.status_implantacao === 'CONCLUIDO_IMPLANTACAO' ? 'Implantado' : 'Em Obra'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-left hover:text-primary hover:underline transition-colors font-medium"
                              onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}`)}
                            >
                              {c.razao_social}
                            </button>
                          </TableCell>
                          <TableCell>
                            {c.filial ? <Badge variant="outline">{c.filial}</Badge> : '-'}
                          </TableCell>

                          <TableCell className="text-center">{c.unidades || '-'}</TableCell>
                          <TableCell>
                            {c.mensalidade
                              ? `R$ ${Number(c.mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {c.data_ativacao
                              ? new Date(c.data_ativacao + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {c.data_termino
                              ? new Date(c.data_termino + 'T00:00:00').toLocaleDateString('pt-BR')
                              : c.data_ativacao
                                ? addMonths(parseISO(c.data_ativacao), 36).toLocaleDateString('pt-BR')
                                : '-'}
                          </TableCell>
                          <TableCell>
                            {showBadge ? (
                              <Badge variant={status!.variant}>{status!.label}</Badge>
                            ) : (
                              <Badge variant="secondary">Vigente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                {c.project_id && (
                                  <DropdownMenuItem onClick={() => navigate(`/projetos/${c.project_id}`)}>
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Ver Projeto Vinculado
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openRenovacao(c)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Renovar Contrato
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}#administradores`)}>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Mandatos de Síndicos
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}?action=reclamacao`)}>
                                  <MessageSquareWarning className="h-4 w-4 mr-2" />
                                  Abrir Chamado / Reclamação
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}?action=depoimento`)}>
                                  <ThumbsUp className="h-4 w-4 mr-2" />
                                  Registrar Depoimento / Elogio
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Footer totals */}
            {!loading && processed.length > 0 && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                <span>{processed.length} cliente(s) encontrado(s)</span>
                <div className="flex gap-6">
                  <span>Total Mensalidades: <strong className="text-foreground">R$ {totalMensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                  <span>Ticket Médio: <strong className="text-foreground">R$ {(processed.filter(c => (c.mensalidade || 0) > 0).length > 0 ? totalMensalidade / processed.filter(c => (c.mensalidade || 0) > 0).length : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!renovacaoCustomer} onOpenChange={(o) => !o && setRenovacaoCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Abrir Chamado - Renovação Contratual</DialogTitle>
            <DialogDescription>
              Um chamado será aberto para a equipe de Sucesso do Cliente com as informações atuais do contrato.
            </DialogDescription>
          </DialogHeader>
          {renovacaoCustomer && (() => {
            const termino = renovacaoCustomer.data_termino
              ? parseISO(renovacaoCustomer.data_termino)
              : renovacaoCustomer.data_ativacao
                ? addMonths(parseISO(renovacaoCustomer.data_ativacao), 36)
                : null;
            const dias = termino ? differenceInDays(termino, new Date()) : null;
            return (
              <div className="grid grid-cols-2 gap-4 py-2 text-sm">
                <div className="col-span-2">
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{renovacaoCustomer.razao_social} <span className="text-muted-foreground">({renovacaoCustomer.contrato})</span></p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data de Ativação</p>
                  <p className="font-medium">{renovacaoCustomer.data_ativacao ? format(parseISO(renovacaoCustomer.data_ativacao), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Término do Contrato</p>
                  <p className="font-medium">{termino ? format(termino, 'dd/MM/yyyy', { locale: ptBR }) : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mensalidade Atual</p>
                  <p className="font-medium">{renovacaoCustomer.mensalidade != null ? `R$ ${renovacaoCustomer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{dias === null ? 'Sem informação' : dias < 0 ? 'Contrato vencido' : `${dias} dias restantes`}</p>
                </div>
              </div>
            );
          })()}
          <div className="space-y-2">
            <Label>Observações / Comentários</Label>
            <Textarea
              value={renovacaoObs}
              onChange={(e) => setRenovacaoObs(e.target.value)}
              placeholder="Adicione detalhes, condições propostas, contexto do cliente..."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenovacaoCustomer(null)} disabled={renovacaoSaving}>Cancelar</Button>
            <Button onClick={handleAbrirChamadoRenovacao} disabled={renovacaoSaving} className="bg-amber-500 hover:bg-amber-600">
              {renovacaoSaving ? 'Abrindo...' : 'Abrir Chamado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
