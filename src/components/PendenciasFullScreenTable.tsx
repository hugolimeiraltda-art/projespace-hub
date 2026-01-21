import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, ArrowUp, ArrowDown, ArrowUpDown, Filter, Eye, List } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { differenceInDays } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';

interface Pendencia {
  id: string;
  numero_os: string;
  customer_id: string | null;
  contrato: string;
  razao_social: string;
  numero_ticket: string | null;
  tipo: string;
  setor: string;
  descricao: string | null;
  status: string;
  sla_dias: number;
  data_abertura: string;
  data_prazo: string;
  data_conclusao: string | null;
  created_by_name: string | null;
  created_at: string;
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

interface PendenciasFullScreenTableProps {
  pendencias: Pendencia[];
  isOpen: boolean;
  onClose: () => void;
  onViewCustomer: (customerId: string | null) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  getTipoLabel: (tipo: string) => string;
  statusOptions: { value: string; label: string; color: string }[];
}

export function PendenciasFullScreenTable({
  pendencias,
  isOpen,
  onClose,
  onViewCustomer,
  onStatusChange,
  getTipoLabel,
  statusOptions,
}: PendenciasFullScreenTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);

  // Get unique values for each column
  const getUniqueValues = (column: string) => {
    const values = pendencias.map((p) => {
      switch (column) {
        case 'numero_os': return p.numero_os;
        case 'numero_ticket': return p.numero_ticket || '-';
        case 'razao_social': return p.razao_social;
        case 'contrato': return p.contrato;
        case 'tipo': return getTipoLabel(p.tipo);
        case 'setor': return p.setor;
        case 'status': return p.status;
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

  // Filter and sort pendencias
  const filteredAndSortedPendencias = useMemo(() => {
    let result = [...pendencias];

    // Apply filters
    columnFilters.forEach((filter) => {
      result = result.filter((p) => {
        switch (filter.column) {
          case 'numero_os': return p.numero_os.toLowerCase().includes(filter.value.toLowerCase());
          case 'numero_ticket': return (p.numero_ticket || '-').toLowerCase().includes(filter.value.toLowerCase());
          case 'razao_social': return p.razao_social.toLowerCase().includes(filter.value.toLowerCase());
          case 'contrato': return p.contrato.toLowerCase().includes(filter.value.toLowerCase());
          case 'tipo': return getTipoLabel(p.tipo).toLowerCase().includes(filter.value.toLowerCase());
          case 'setor': return p.setor === filter.value;
          case 'status': return p.status === filter.value;
          default: return true;
        }
      });
    });

    // Apply sorting
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (sortConfig.column) {
          case 'numero_os':
            aValue = a.numero_os;
            bValue = b.numero_os;
            break;
          case 'numero_ticket':
            aValue = a.numero_ticket || '';
            bValue = b.numero_ticket || '';
            break;
          case 'razao_social':
            aValue = a.razao_social;
            bValue = b.razao_social;
            break;
          case 'contrato':
            aValue = a.contrato;
            bValue = b.contrato;
            break;
          case 'tipo':
            aValue = getTipoLabel(a.tipo);
            bValue = getTipoLabel(b.tipo);
            break;
          case 'setor':
            aValue = a.setor;
            bValue = b.setor;
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          case 'data_prazo':
            aValue = new Date(a.data_prazo).getTime();
            bValue = new Date(b.data_prazo).getTime();
            break;
          case 'data_abertura':
            aValue = new Date(a.data_abertura).getTime();
            bValue = new Date(b.data_abertura).getTime();
            break;
        }

        if (typeof aValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue as string)
            : (bValue as string).localeCompare(aValue);
        }
        return sortConfig.direction === 'asc' ? aValue - (bValue as number) : (bValue as number) - aValue;
      });
    }

    return result;
  }, [pendencias, columnFilters, sortConfig, getTipoLabel]);

  const getStatusBadge = (status: string) => {
    const statusInfo = statusOptions.find((s) => s.value === status);
    return (
      <Badge className={`${statusInfo?.color} text-white`}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const getPrazoBadge = (pendencia: Pendencia) => {
    if (pendencia.status === 'CONCLUIDO' || pendencia.status === 'CANCELADO') {
      return null;
    }

    const hoje = new Date();
    const prazo = new Date(pendencia.data_prazo);
    const diasRestantes = differenceInDays(prazo, hoje);

    if (diasRestantes < 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Atrasado ({Math.abs(diasRestantes)} dias)
        </Badge>
      );
    } else if (diasRestantes === 0) {
      return (
        <Badge className="bg-warning text-warning-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Vence hoje
        </Badge>
      );
    } else if (diasRestantes <= 2) {
      return (
        <Badge className="bg-warning/80 text-warning-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {diasRestantes} dia(s)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {diasRestantes} dias
      </Badge>
    );
  };

  const renderColumnHeader = (column: string, label: string, filterable: boolean = true) => {
    const uniqueValues = filterable ? getUniqueValues(column) : [];
    const hasActiveFilter = hasFilter(column);

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleSort(column)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {label}
          {getSortIcon(column)}
        </button>
        {filterable && (
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
                {column === 'status' || column === 'setor' ? (
                  <Select
                    value={getFilterValue(column)}
                    onValueChange={(value) => setFilter(column, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {uniqueValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {column === 'status' ? statusOptions.find((s) => s.value === value)?.label || value : value}
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
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <List className="h-5 w-5" />
            <h1 className="text-xl font-bold">
              Todas as Pendências ({filteredAndSortedPendencias.length})
            </h1>
            {columnFilters.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                {columnFilters.length} filtro(s) ativo(s)
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(columnFilters.length > 0 || sortConfig.column) && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar tudo
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-1" />
              Fechar
            </Button>
          </div>
        </div>

        {/* Active filters display */}
        {columnFilters.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {columnFilters.map((filter) => (
              <Badge key={filter.column} variant="outline" className="flex items-center gap-1">
                {filter.column}: {filter.value}
                <button
                  onClick={() => setFilter(filter.column, '')}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto h-[calc(100vh-80px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
            <TableRow>
              <TableHead className="min-w-[100px]">{renderColumnHeader('numero_os', 'Nº OS')}</TableHead>
              <TableHead className="min-w-[100px]">{renderColumnHeader('numero_ticket', 'Ticket')}</TableHead>
              <TableHead className="min-w-[200px]">{renderColumnHeader('razao_social', 'Cliente')}</TableHead>
              <TableHead className="min-w-[100px]">{renderColumnHeader('contrato', 'Contrato')}</TableHead>
              <TableHead className="min-w-[150px]">{renderColumnHeader('tipo', 'Tipo')}</TableHead>
              <TableHead className="min-w-[120px]">{renderColumnHeader('setor', 'Setor')}</TableHead>
              <TableHead className="min-w-[120px]">{renderColumnHeader('status', 'Status')}</TableHead>
              <TableHead className="min-w-[150px]">{renderColumnHeader('data_prazo', 'Prazo', false)}</TableHead>
              <TableHead className="min-w-[100px]">{renderColumnHeader('data_abertura', 'Abertura', false)}</TableHead>
              <TableHead className="min-w-[200px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedPendencias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhuma pendência encontrada com os filtros aplicados
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedPendencias.map((pendencia) => (
                <TableRow key={pendencia.id}>
                  <TableCell className="font-medium">{pendencia.numero_os}</TableCell>
                  <TableCell>{pendencia.numero_ticket || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={pendencia.razao_social}>
                    {pendencia.razao_social}
                  </TableCell>
                  <TableCell>{pendencia.contrato}</TableCell>
                  <TableCell>{getTipoLabel(pendencia.tipo)}</TableCell>
                  <TableCell>{pendencia.setor}</TableCell>
                  <TableCell>{getStatusBadge(pendencia.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(pendencia.data_prazo), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      {getPrazoBadge(pendencia)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(pendencia.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewCustomer(pendencia.customer_id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Detalhes
                      </Button>
                      {pendencia.status !== 'CONCLUIDO' && pendencia.status !== 'CANCELADO' && (
                        <Select
                          value={pendencia.status}
                          onValueChange={(value) => onStatusChange(pendencia.id, value)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
