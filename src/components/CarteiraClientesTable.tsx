import { Fragment, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Trash2, Columns3 } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  contrato: string;
  alarme_codigo?: string | null;
  razao_social: string;
  filial: string | null;
  data_ativacao: string | null;
  data_termino: string | null;
  taxa_ativacao: number | null;
  portoes: number;
  zonas_perimetro: number;
  cameras: number;
  mensalidade: number | null;
}

interface ColumnFilter {
  column: string;
  value: string;
}

type SortDirection = 'asc' | 'desc' | null;
type ColumnKey = 'contrato' | 'alarme_codigo' | 'razao_social' | 'filial' | 'data_ativacao' | 'data_termino' | 'taxa_ativacao' | 'portoes' | 'zonas_perimetro' | 'cameras' | 'mensalidade';

interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface CarteiraClientesTableProps {
  customers: Customer[];
  onDelete?: () => void;
  basePath?: string;
}

const TABLE_COLUMNS: { key: ColumnKey; label: string; className: string; align?: 'left' | 'right' }[] = [
  { key: 'contrato', label: 'Contrato', className: 'min-w-[100px]' },
  { key: 'alarme_codigo', label: 'Código Alarme', className: 'min-w-[130px]' },
  { key: 'razao_social', label: 'Razão Social', className: 'min-w-[200px]' },
  { key: 'filial', label: 'Filial', className: 'min-w-[80px]' },
  { key: 'data_ativacao', label: 'Início', className: 'min-w-[100px]' },
  { key: 'data_termino', label: 'Término', className: 'min-w-[100px]' },
  { key: 'taxa_ativacao', label: 'Taxa Ativação', className: 'min-w-[120px] text-right', align: 'right' },
  { key: 'portoes', label: 'Portões', className: 'min-w-[80px] text-right', align: 'right' },
  { key: 'zonas_perimetro', label: 'Zonas', className: 'min-w-[80px] text-right', align: 'right' },
  { key: 'cameras', label: 'Câmeras', className: 'min-w-[80px] text-right', align: 'right' },
  { key: 'mensalidade', label: 'Mensalidade', className: 'min-w-[120px] text-right', align: 'right' },
];

export function CarteiraClientesTable({ customers, onDelete, basePath = '/carteira-clientes' }: CarteiraClientesTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(TABLE_COLUMNS.map((column) => column.key));

  const isColumnVisible = (column: ColumnKey) => visibleColumns.includes(column);
  const visibleColumnCount = visibleColumns.length + 1;
  const footerLabelColSpan = isColumnVisible('mensalidade') ? Math.max(1, visibleColumnCount - 1) : visibleColumnCount;

  const toggleColumn = (column: ColumnKey) => {
    setVisibleColumns((prev) => {
      if (prev.includes(column)) {
        return prev.length === 1 ? prev : prev.filter((key) => key !== column);
      }
      return [...prev, column];
    });
  };

  const resetColumns = () => setVisibleColumns(TABLE_COLUMNS.map((column) => column.key));

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const calculateTermino = (customer: Customer) => {
    if (customer.data_termino) {
      return formatDate(customer.data_termino);
    }
    if (!customer.data_ativacao) return '-';
    try {
      const dataInicio = new Date(customer.data_ativacao);
      const dataTermino = addMonths(dataInicio, 36);
      return format(dataTermino, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getTerminoDate = (customer: Customer): Date | null => {
    if (customer.data_termino) {
      return new Date(customer.data_termino);
    }
    if (customer.data_ativacao) {
      return addMonths(new Date(customer.data_ativacao), 36);
    }
    return null;
  };

  // Get unique values for each column
  const getUniqueValues = (column: string) => {
    const values = customers.map((c) => {
      switch (column) {
        case 'contrato': return c.contrato;
        case 'razao_social': return c.razao_social;
        case 'filial': return c.filial || '-';
        default: return '';
      }
    });
    return [...new Set(values)].filter(Boolean).sort();
  };

  // Get filter value for a column
  const getFilterValue = (column: string) => {
    const filter = columnFilters.find((f) => f.column === column);
    return filter?.value || '';
  };

  // Set filter for a column
  const setFilter = (column: string, value: string) => {
    setColumnFilters((prev) => {
      const existing = prev.findIndex((f) => f.column === column);
      if (value === '' || value === 'all') {
        return prev.filter((f) => f.column !== column);
      }
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { column, value };
        return updated;
      }
      return [...prev, { column, value }];
    });
    setActiveFilterColumn(null);
  };

  // Handle sorting
  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        if (prev.direction === 'asc') return { column, direction: 'desc' };
        if (prev.direction === 'desc') return { column: '', direction: null };
      }
      return { column, direction: 'asc' };
    });
  };

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sortConfig.column !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    return <ArrowDown className="h-3 w-3 text-primary" />;
  };

  // Check if column has filter
  const hasFilter = (column: string) => {
    return columnFilters.some((f) => f.column === column && f.value);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setColumnFilters([]);
    setSortConfig({ column: '', direction: null });
  };

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    // Apply filters
    columnFilters.forEach((filter) => {
      result = result.filter((c) => {
        const filterLower = filter.value.toLowerCase();
        switch (filter.column) {
          case 'contrato': return c.contrato.toLowerCase().includes(filterLower);
          case 'razao_social': return c.razao_social.toLowerCase().includes(filterLower);
          case 'filial': return (c.filial || '-').toLowerCase().includes(filterLower);
          case 'data_ativacao': return formatDate(c.data_ativacao).includes(filter.value);
          case 'data_termino': return calculateTermino(c).includes(filter.value);
          case 'taxa_ativacao': 
            if (!c.taxa_ativacao) return filter.value === '-' || filter.value === '';
            return c.taxa_ativacao.toString().includes(filter.value);
          case 'portoes': return c.portoes.toString().includes(filter.value);
          case 'zonas_perimetro': return c.zonas_perimetro.toString().includes(filter.value);
          case 'cameras': return c.cameras.toString().includes(filter.value);
          case 'mensalidade':
            if (!c.mensalidade) return filter.value === '-' || filter.value === '';
            return c.mensalidade.toString().includes(filter.value);
          default: return true;
        }
      });
    });

    // Apply sorting
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let aValue: string | number | Date | null = '';
        let bValue: string | number | Date | null = '';

        switch (sortConfig.column) {
          case 'contrato':
            aValue = a.contrato;
            bValue = b.contrato;
            break;
          case 'razao_social':
            aValue = a.razao_social;
            bValue = b.razao_social;
            break;
          case 'filial':
            aValue = a.filial || '';
            bValue = b.filial || '';
            break;
          case 'data_ativacao':
            aValue = a.data_ativacao ? new Date(a.data_ativacao).getTime() : 0;
            bValue = b.data_ativacao ? new Date(b.data_ativacao).getTime() : 0;
            break;
          case 'data_termino':
            aValue = getTerminoDate(a)?.getTime() || 0;
            bValue = getTerminoDate(b)?.getTime() || 0;
            break;
          case 'taxa_ativacao':
            aValue = a.taxa_ativacao || 0;
            bValue = b.taxa_ativacao || 0;
            break;
          case 'portoes':
            aValue = a.portoes;
            bValue = b.portoes;
            break;
          case 'zonas_perimetro':
            aValue = a.zonas_perimetro;
            bValue = b.zonas_perimetro;
            break;
          case 'cameras':
            aValue = a.cameras;
            bValue = b.cameras;
            break;
          case 'mensalidade':
            aValue = a.mensalidade || 0;
            bValue = b.mensalidade || 0;
            break;
        }

        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue as string)
            : (bValue as string).localeCompare(aValue);
        }
        return sortConfig.direction === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      });
    }

    return result;
  }, [customers, columnFilters, sortConfig]);

  const renderColumnHeader = (column: string, label: string, align: 'left' | 'right' = 'left') => {
    const hasActiveFilter = hasFilter(column);

    return (
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <button
          onClick={() => handleSort(column)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {label}
          {getSortIcon(column)}
        </button>
        <Popover open={activeFilterColumn === column} onOpenChange={(open) => setActiveFilterColumn(open ? column : null)}>
          <PopoverTrigger asChild>
            <button
              className={`p-1 rounded hover:bg-accent transition-colors ${hasActiveFilter ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Filter className={`h-3 w-3 ${hasActiveFilter ? 'fill-current' : ''}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-3">
              <div className="font-medium text-sm">Filtrar {label}</div>
              {column === 'filial' ? (
                <Select
                  value={getFilterValue(column)}
                  onValueChange={(value) => setFilter(column, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {getUniqueValues(column).map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  value={getFilterValue(column)}
                  onChange={(e) => setFilter(column, e.target.value)}
                  className="w-full"
                />
              )}
              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setFilter(column, '')}
                >
                  Limpar filtro
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const renderCell = (customer: Customer, column: ColumnKey) => {
    switch (column) {
      case 'contrato':
        return <TableCell className="font-medium text-primary hover:underline">{customer.contrato}</TableCell>;
      case 'razao_social':
        return <TableCell className="max-w-[200px] truncate text-primary hover:underline">{customer.razao_social}</TableCell>;
      case 'filial':
        return <TableCell>{customer.filial || '-'}</TableCell>;
      case 'data_ativacao':
        return <TableCell>{formatDate(customer.data_ativacao)}</TableCell>;
      case 'data_termino':
        return <TableCell>{calculateTermino(customer)}</TableCell>;
      case 'taxa_ativacao':
        return <TableCell className="text-right">{customer.taxa_ativacao ? `R$ ${customer.taxa_ativacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>;
      case 'portoes':
        return <TableCell className="text-right">{customer.portoes}</TableCell>;
      case 'zonas_perimetro':
        return <TableCell className="text-right">{customer.zonas_perimetro}</TableCell>;
      case 'cameras':
        return <TableCell className="text-right">{customer.cameras}</TableCell>;
      case 'mensalidade':
        return <TableCell className="text-right">{customer.mensalidade ? `R$ ${customer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</TableCell>;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Colunas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Exibir colunas</span>
                <Button variant="ghost" size="sm" onClick={resetColumns}>Todas</Button>
              </div>
              <div className="space-y-2">
                {TABLE_COLUMNS.map((column) => (
                  <label key={column.key} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={isColumnVisible(column.key)} onCheckedChange={() => toggleColumn(column.key)} />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters display */}
      {columnFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          {columnFilters.map((filter) => (
            <span key={filter.column} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
              {filter.column}: {filter.value}
              <button
                onClick={() => setFilter(filter.column, '')}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Limpar todos
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[40px]"></TableHead>
              {TABLE_COLUMNS.filter((column) => isColumnVisible(column.key)).map((column) => (
                <TableHead key={column.key} className={column.className}>{renderColumnHeader(column.key, column.label, column.align)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado com os filtros aplicados
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedCustomers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`${basePath}/${customer.id}`)}
                >
                  <TableCell className="p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCustomer(customer);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  {TABLE_COLUMNS.filter((column) => isColumnVisible(column.key)).map((column) => (
                    <Fragment key={column.key}>{renderCell(customer, column.key)}</Fragment>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {filteredAndSortedCustomers.length > 0 && (() => {
            const total = filteredAndSortedCustomers.reduce((sum, c) => sum + (c.mensalidade || 0), 0);
            const comMensalidade = filteredAndSortedCustomers.filter(c => c.mensalidade && c.mensalidade > 0);
            const ticketMedio = comMensalidade.length > 0 ? total / comMensalidade.length : 0;
            return (
              <tfoot>
                <TableRow className="bg-muted/50 font-semibold border-t-2">
                  <TableCell colSpan={footerLabelColSpan} className="text-right">
                    Total Mensalidades
                  </TableCell>
                  {isColumnVisible('mensalidade') && <TableCell className="text-right">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                </TableRow>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={footerLabelColSpan} className="text-right">
                    Ticket Médio ({comMensalidade.length} clientes)
                  </TableCell>
                  {isColumnVisible('mensalidade') && <TableCell className="text-right">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                </TableRow>
              </tfoot>
            );
          })()}
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Exibindo {filteredAndSortedCustomers.length} de {customers.length} clientes
      </div>

      <AlertDialog open={!!deleteCustomer} onOpenChange={(open) => !open && setDeleteCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{deleteCustomer?.razao_social}</strong> (Contrato: {deleteCustomer?.contrato})? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteCustomer) return;
                setDeleting(true);
                try {
                  const { error } = await supabase
                    .from('customer_portfolio')
                    .delete()
                    .eq('id', deleteCustomer.id);
                  if (error) throw error;
                  toast({ title: 'Cliente excluído', description: `${deleteCustomer.razao_social} foi removido.` });
                  setDeleteCustomer(null);
                  onDelete?.();
                } catch (error) {
                  console.error(error);
                  toast({ title: 'Erro', description: 'Não foi possível excluir o cliente.', variant: 'destructive' });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
