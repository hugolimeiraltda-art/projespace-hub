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
import { Search, Building2, MoreHorizontal, RefreshCw, UserCheck, MessageSquareWarning, ThumbsUp, Eye, ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, addMonths } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}

type SortDir = 'asc' | 'desc' | null;
type SortKey = 'contrato' | 'razao_social' | 'filial' | 'unidades' | 'mensalidade' | 'data_ativacao' | 'contrato_status';

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('customer_portfolio')
        .select('id, contrato, razao_social, filial, praca, unidades, mensalidade, data_ativacao, data_termino, endereco')
        .order('razao_social');

      setCustomers((data || []) as Customer[]);
      setLoading(false);
    };
    load();
  }, []);

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
              <p className="text-sm text-muted-foreground">Total de Unidades</p>
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
                      <ColumnHeader label="Unid." sortKey="unidades" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.unidades} selectedFilters={columnFilters.unidades || []} onFilterChange={handleFilterChange} className="text-center" />
                      <ColumnHeader label="Mensalidade" sortKey="mensalidade" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.mensalidade} selectedFilters={columnFilters.mensalidade || []} onFilterChange={handleFilterChange} />
                      <ColumnHeader label="Ativação" sortKey="data_ativacao" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} filterValues={filterOptions.data_ativacao} selectedFilters={columnFilters.data_ativacao || []} onFilterChange={handleFilterChange} />
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
                          <TableCell className="font-medium">{c.contrato}</TableCell>
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/sucesso-cliente/cliente/${c.id}#renovacao`)}>
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
    </Layout>
  );
}
