import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  contrato: string;
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

interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface CarteiraClientesTableProps {
  customers: Customer[];
}

export function CarteiraClientesTable({ customers }: CarteiraClientesTableProps) {
  const navigate = useNavigate();
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);

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

  return (
    <div className="space-y-2">
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
              <TableHead className="min-w-[100px]">{renderColumnHeader('contrato', 'Contrato')}</TableHead>
              <TableHead className="min-w-[200px]">{renderColumnHeader('razao_social', 'Razão Social')}</TableHead>
              <TableHead className="min-w-[80px]">{renderColumnHeader('filial', 'Filial')}</TableHead>
              <TableHead className="min-w-[100px]">{renderColumnHeader('data_ativacao', 'Início')}</TableHead>
              <TableHead className="min-w-[100px]">{renderColumnHeader('data_termino', 'Término')}</TableHead>
              <TableHead className="min-w-[120px] text-right">{renderColumnHeader('taxa_ativacao', 'Taxa Ativação', 'right')}</TableHead>
              <TableHead className="min-w-[80px] text-right">{renderColumnHeader('portoes', 'Portões', 'right')}</TableHead>
              <TableHead className="min-w-[80px] text-right">{renderColumnHeader('zonas_perimetro', 'Zonas', 'right')}</TableHead>
              <TableHead className="min-w-[80px] text-right">{renderColumnHeader('cameras', 'Câmeras', 'right')}</TableHead>
              <TableHead className="min-w-[120px] text-right">{renderColumnHeader('mensalidade', 'Mensalidade', 'right')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado com os filtros aplicados
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedCustomers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/carteira-clientes/${customer.id}`)}
                >
                  <TableCell className="font-medium text-primary hover:underline">
                    {customer.contrato}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-primary hover:underline">
                    {customer.razao_social}
                  </TableCell>
                  <TableCell>{customer.filial || '-'}</TableCell>
                  <TableCell>{formatDate(customer.data_ativacao)}</TableCell>
                  <TableCell>{calculateTermino(customer)}</TableCell>
                  <TableCell className="text-right">
                    {customer.taxa_ativacao 
                      ? `R$ ${customer.taxa_ativacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-right">{customer.portoes}</TableCell>
                  <TableCell className="text-right">{customer.zonas_perimetro}</TableCell>
                  <TableCell className="text-right">{customer.cameras}</TableCell>
                  <TableCell className="text-right">
                    {customer.mensalidade 
                      ? `R$ ${customer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Exibindo {filteredAndSortedCustomers.length} de {customers.length} clientes
      </div>
    </div>
  );
}
