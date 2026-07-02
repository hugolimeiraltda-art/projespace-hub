import { Fragment, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Trash2, Columns3, FileDown, GripVertical } from 'lucide-react';
import * as XLSX from 'xlsx';
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
  tipo: string | null;
  data_ativacao: string | null;
  data_termino: string | null;
  taxa_ativacao: number | null;
  portoes: number;
  zonas_perimetro: number;
  cameras: number;
  mensalidade: number | null;
  endereco?: string | null;
  sistema?: string | null;
}

interface ColumnFilter {
  column: string;
  value: string;
}

type SortDirection = 'asc' | 'desc' | null;
type ColumnKey = 'contrato' | 'alarme_codigo' | 'razao_social' | 'filial' | 'tipo' | 'qtd_produto' | 'qtd_cameras' | 'data_ativacao' | 'data_termino' | 'taxa_ativacao' | 'portoes' | 'zonas_perimetro' | 'cameras' | 'mensalidade' | 'endereco';

interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface CarteiraClientesTableProps {
  customers: Customer[];
  onDelete?: () => void;
  basePath?: string;
  tableName?: string;
  totensCountMap?: Record<string, number>;
  camerasCountMap?: Record<string, number>;
}

const TABLE_COLUMNS: { key: ColumnKey; label: string; align?: 'left' | 'right' }[] = [
  { key: 'contrato', label: 'Contrato' },
  { key: 'alarme_codigo', label: 'Código Alarme' },
  { key: 'razao_social', label: 'Razão Social' },
  { key: 'filial', label: 'Filial' },
  { key: 'tipo', label: 'Tipo de Produto' },
  { key: 'qtd_produto', label: 'Qtd Totens', align: 'right' },
  { key: 'qtd_cameras', label: 'Qtd Câmeras', align: 'right' },
  { key: 'data_ativacao', label: 'Início' },
  { key: 'data_termino', label: 'Término' },
  { key: 'taxa_ativacao', label: 'Taxa Ativação', align: 'right' },
  { key: 'portoes', label: 'Portões', align: 'right' },
  { key: 'zonas_perimetro', label: 'Zonas', align: 'right' },
  { key: 'cameras', label: 'Câmeras', align: 'right' },
  { key: 'mensalidade', label: 'Mensalidade', align: 'right' },
  { key: 'endereco', label: 'Endereço' },
];

const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = [
  'contrato',
  'alarme_codigo',
  'razao_social',
  'filial',
  'tipo',
  'qtd_produto',
  'data_ativacao',
  'mensalidade',
];

const STORAGE_KEY = 'carteira-clientes-table-config';

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  contrato: 110,
  alarme_codigo: 130,
  razao_social: 220,
  filial: 80,
  tipo: 140,
  qtd_produto: 110,
  qtd_cameras: 120,
  data_ativacao: 110,
  data_termino: 110,
  taxa_ativacao: 130,
  portoes: 85,
  zonas_perimetro: 85,
  cameras: 85,
  mensalidade: 130,
  endereco: 260,
};

function loadStoredConfig(): { order: ColumnKey[]; visible: ColumnKey[]; widths: Record<ColumnKey, number> } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.order) || !Array.isArray(parsed.visible) || typeof parsed.widths !== 'object') return null;
    return {
      order: parsed.order,
      visible: parsed.visible,
      widths: { ...DEFAULT_WIDTHS, ...parsed.widths },
    };
  } catch {
    return null;
  }
}

function saveStoredConfig(order: ColumnKey[], visible: ColumnKey[], widths: Record<ColumnKey, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, visible, widths }));
  } catch {
    // ignore storage errors
  }
}

export function CarteiraClientesTable({ customers, onDelete, basePath = '/carteira-clientes', tableName = 'customer_portfolio', totensCountMap = {}, camerasCountMap = {} }: CarteiraClientesTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const stored = loadStoredConfig();
  const initialOrder = stored?.order ?? TABLE_COLUMNS.map((c) => c.key);
  const initialVisible = stored?.visible ?? DEFAULT_VISIBLE_COLUMNS;
  const initialWidths = stored?.widths ?? { ...DEFAULT_WIDTHS };

  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(initialVisible);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(initialOrder);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(initialWidths);
  const [globalSearch, setGlobalSearch] = useState('');

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ key: ColumnKey; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    saveStoredConfig(columnOrder, visibleColumns, columnWidths);
  }, [columnOrder, visibleColumns, columnWidths]);

  const isColumnVisible = (column: ColumnKey) => visibleColumns.includes(column);
  const visibleColumnCount = visibleColumns.length + 1;
  const footerLabelColSpan = isColumnVisible('mensalidade') ? Math.max(1, visibleColumnCount - 1) : visibleColumnCount;

  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter((key) => visibleColumns.includes(key));
  }, [columnOrder, visibleColumns]);

  const toggleColumn = (column: ColumnKey) => {
    setVisibleColumns((prev) => {
      if (prev.includes(column)) {
        return prev.length === 1 ? prev : prev.filter((key) => key !== column);
      }
      return [...prev, column];
    });
  };

  const resetColumns = () => {
    setVisibleColumns(TABLE_COLUMNS.map((column) => column.key));
    setColumnOrder(TABLE_COLUMNS.map((c) => c.key));
    setColumnWidths({ ...DEFAULT_WIDTHS });
  };

  // Drag & drop reordering helpers
  const moveColumn = useCallback((fromKey: ColumnKey, toKey: ColumnKey) => {
    if (fromKey === toKey) return;
    setColumnOrder((prev) => {
      const fromIndex = prev.indexOf(fromKey);
      const toIndex = prev.indexOf(toKey);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, fromKey);
      return next;
    });
  }, []);

  // Resize helpers
  const startResize = useCallback((key: ColumnKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { key, startX: e.clientX, startWidth: columnWidths[key] };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const { key, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + delta);
      setColumnWidths((prev) => ({ ...prev, [key]: newWidth }));
    };

    const handleMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

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
        case 'alarme_codigo': return c.alarme_codigo || '-';
        case 'razao_social': return c.razao_social;
        case 'filial': return c.filial || '-';
        case 'tipo': return c.tipo || '-';
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

    // Global search across key fields
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase();
      result = result.filter((c) =>
        [c.contrato, c.alarme_codigo, c.razao_social, c.filial, c.tipo, c.endereco]
          .some((v) => (v || '').toString().toLowerCase().includes(q))
      );
    }

    // Apply filters
    columnFilters.forEach((filter) => {
      result = result.filter((c) => {
        const filterLower = filter.value.toLowerCase();
        switch (filter.column) {
          case 'contrato': return c.contrato.toLowerCase().includes(filterLower);
          case 'alarme_codigo': return (c.alarme_codigo || '-').toLowerCase().includes(filterLower);
          case 'razao_social': return c.razao_social.toLowerCase().includes(filterLower);
          case 'filial': return (c.filial || '-').toLowerCase().includes(filterLower);
          case 'tipo': return (c.tipo || '-').toLowerCase().includes(filterLower);
          case 'qtd_produto': return (totensCountMap[c.id] || 0).toString().includes(filter.value);
          case 'qtd_cameras': return (camerasCountMap[c.id] || 0).toString().includes(filter.value);
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
          case 'endereco': return (c.endereco || '-').toLowerCase().includes(filterLower);
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
          case 'alarme_codigo':
            aValue = a.alarme_codigo || '';
            bValue = b.alarme_codigo || '';
            break;
          case 'razao_social':
            aValue = a.razao_social;
            bValue = b.razao_social;
            break;
          case 'filial':
            aValue = a.filial || '';
            bValue = b.filial || '';
            break;
          case 'tipo':
            aValue = a.tipo || '';
            bValue = b.tipo || '';
            break;
          case 'qtd_produto':
            aValue = totensCountMap[a.id] || 0;
            bValue = totensCountMap[b.id] || 0;
            break;
          case 'qtd_cameras':
            aValue = camerasCountMap[a.id] || 0;
            bValue = camerasCountMap[b.id] || 0;
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
          case 'endereco':
            aValue = a.endereco || '';
            bValue = b.endereco || '';
            break;
        }

        if (typeof aValue === 'string') {
          if (sortConfig.column === 'contrato' || sortConfig.column === 'alarme_codigo') {
            const aNum = parseInt((aValue as string).replace(/\D/g, ''), 10);
            const bNum = parseInt((bValue as string).replace(/\D/g, ''), 10);
            const aOk = !isNaN(aNum);
            const bOk = !isNaN(bNum);
            if (aOk && bOk && aNum !== bNum) {
              return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
            }
            if (aOk !== bOk) return aOk ? -1 : 1;
          }
          return sortConfig.direction === 'asc'
            ? (aValue as string).localeCompare(bValue as string, undefined, { numeric: true, sensitivity: 'base' })
            : (bValue as string).localeCompare(aValue as string, undefined, { numeric: true, sensitivity: 'base' });
        }
        return sortConfig.direction === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      });
    }

    return result;
  }, [customers, columnFilters, sortConfig, globalSearch, totensCountMap, camerasCountMap]);

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
              {column === 'filial' || column === 'tipo' ? (
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

  const getColumnDef = (key: ColumnKey) => TABLE_COLUMNS.find((c) => c.key === key)!;

  const renderCell = (customer: Customer, column: ColumnKey) => {
    switch (column) {
      case 'contrato':
        return <TableCell className="font-medium text-primary hover:underline">{customer.contrato}</TableCell>;
      case 'alarme_codigo':
        return <TableCell>{customer.alarme_codigo || '-'}</TableCell>;
      case 'razao_social':
        return <TableCell className="max-w-[200px] truncate text-primary hover:underline">{customer.razao_social}</TableCell>;
      case 'filial':
        return <TableCell>{customer.filial || '-'}</TableCell>;
      case 'tipo':
        return <TableCell>{customer.tipo || '-'}</TableCell>;
      case 'qtd_produto':
        return <TableCell className="text-right">{totensCountMap[customer.id] || 0}</TableCell>;
      case 'qtd_cameras':
        return <TableCell className="text-right">{camerasCountMap[customer.id] || 0}</TableCell>;
      case 'data_ativacao':
        if (!customer.data_ativacao && customer.sistema === 'EM_IMPLANTACAO') {
          return <TableCell><span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-xs font-medium">Implantação</span></TableCell>;
        }
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
      case 'endereco':
        return <TableCell className="max-w-[280px] truncate" title={customer.endereco || ''}>{customer.endereco || '-'}</TableCell>;
    }
  };

  const handleExportExcel = () => {
    const rows = filteredAndSortedCustomers.map((c) => ({
      Contrato: c.contrato,
      'Código Alarme': c.alarme_codigo || '',
      'Razão Social': c.razao_social,
      Filial: c.filial || '',
      'Tipo de Produto': c.tipo || '',
      'Qtd Totens': totensCountMap[c.id] || 0,
      'Qtd Câmeras': camerasCountMap[c.id] || 0,
      'Início': formatDate(c.data_ativacao),
      'Término': calculateTermino(c),
      'Taxa Ativação': c.taxa_ativacao || 0,
      'Portões': c.portoes,
      'Zonas': c.zonas_perimetro,
      'Câmeras': c.cameras,
      'Mensalidade': c.mensalidade || 0,
      'Endereço': c.endereco || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    const date = format(new Date(), 'yyyy-MM-dd');
    XLSX.writeFile(wb, `carteira-clientes-${date}.xlsx`);
    toast({ title: 'Exportado!', description: `${rows.length} cliente(s) exportado(s) para Excel.` });
  };

  // Drag state for header reordering
  const [dragOverKey, setDragOverKey] = useState<ColumnKey | null>(null);
  const [dragFromKey, setDragFromKey] = useState<ColumnKey | null>(null);

  // Drag state for popover reordering
  const [popoverDragOver, setPopoverDragOver] = useState<ColumnKey | null>(null);
  const [popoverDragFrom, setPopoverDragFrom] = useState<ColumnKey | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex justify-end items-center gap-2">
        <Input
          placeholder="Pesquisar cliente (contrato, código, razão social, filial, tipo)..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="h-9 w-full max-w-sm"
        />
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
          <FileDown className="h-4 w-4" />
          Exportar Excel
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Columns3 className="h-4 w-4" />
              Colunas
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Exibir e ordenar colunas</span>
                <Button variant="ghost" size="sm" onClick={resetColumns}>Padrão</Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Arraste as linhas para reordenar. Marque para exibir/ocultar.
              </div>
              <div className="space-y-1">
                {TABLE_COLUMNS.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 text-sm rounded px-1 py-1 transition-colors hover:bg-accent"
                    draggable
                    onDragStart={() => setPopoverDragFrom(column.key)}
                    onDragEnd={() => {
                      if (popoverDragFrom && popoverDragOver && popoverDragFrom !== popoverDragOver) {
                        moveColumn(popoverDragFrom, popoverDragOver);
                      }
                      setPopoverDragFrom(null);
                      setPopoverDragOver(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setPopoverDragOver(column.key);
                    }}
                    style={popoverDragOver === column.key && popoverDragFrom !== column.key ? { borderTop: '2px solid hsl(var(--primary))' } : undefined}
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab" />
                    <Checkbox checked={isColumnVisible(column.key)} onCheckedChange={() => toggleColumn(column.key)} />
                    <span className="flex-1">{column.label}</span>
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

      <div className="overflow-x-auto" ref={tableContainerRef}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[40px]"></TableHead>
              {orderedVisibleColumns.map((key) => {
                const col = getColumnDef(key);
                return (
                  <TableHead
                    key={key}
                    className="relative select-none"
                    style={{ width: columnWidths[key], minWidth: 60 }}
                    draggable
                    onDragStart={() => setDragFromKey(key)}
                    onDragEnd={() => {
                      if (dragFromKey && dragOverKey && dragFromKey !== dragOverKey) {
                        moveColumn(dragFromKey, dragOverKey);
                      }
                      setDragFromKey(null);
                      setDragOverKey(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverKey(key);
                    }}
                  >
                    <div className={dragOverKey === key && dragFromKey !== key ? 'border-t-2 border-primary' : ''}>
                      {renderColumnHeader(col.key, col.label, col.align)}
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute top-0 right-0 h-full w-[4px] cursor-col-resize z-10 hover:bg-primary/20 active:bg-primary/40"
                      onMouseDown={(e) => startResize(key, e)}
                    />
                  </TableHead>
                );
              })}
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
                  {orderedVisibleColumns.map((key) => (
                    <Fragment key={key}>
                      <TableCell
                        style={{ width: columnWidths[key], minWidth: 60 }}
                        className={getColumnDef(key).align === 'right' ? 'text-right' : ''}
                      >
                        {(() => {
                          switch (key) {
                            case 'contrato': return <span className="font-medium text-primary hover:underline">{customer.contrato}</span>;
                            case 'alarme_codigo': return customer.alarme_codigo || '-';
                            case 'razao_social': return <span className="truncate text-primary hover:underline">{customer.razao_social}</span>;
                            case 'filial': return customer.filial || '-';
                            case 'tipo': return customer.tipo || '-';
                            case 'qtd_produto': return totensCountMap[customer.id] || 0;
                            case 'qtd_cameras': return camerasCountMap[customer.id] || 0;
                            case 'data_ativacao': return formatDate(customer.data_ativacao);
                            case 'data_termino': return calculateTermino(customer);
                            case 'taxa_ativacao': return customer.taxa_ativacao ? `R$ ${customer.taxa_ativacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';
                            case 'portoes': return customer.portoes;
                            case 'zonas_perimetro': return customer.zonas_perimetro;
                            case 'cameras': return customer.cameras;
                            case 'mensalidade': return customer.mensalidade ? `R$ ${customer.mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';
                            case 'endereco': return <span className="truncate" title={customer.endereco || ''}>{customer.endereco || '-'}</span>;
                            default: return '-';
                          }
                        })()}
                      </TableCell>
                    </Fragment>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {filteredAndSortedCustomers.length > 0 && (() => {
            const isAtivado = (c: Customer) => !!c.data_ativacao && new Date(c.data_ativacao).getFullYear() >= 2020;
            const ativados = filteredAndSortedCustomers.filter(isAtivado);
            const naoAtivados = filteredAndSortedCustomers.filter(c => !isAtivado(c));

            const sum = (list: typeof ativados) => list.reduce((s, c) => s + (c.mensalidade || 0), 0);
            const withValue = (list: typeof ativados) => list.filter(c => c.mensalidade && c.mensalidade > 0);
            const avg = (list: typeof ativados) => {
              const wv = withValue(list);
              return wv.length > 0 ? sum(list) / wv.length : 0;
            };

            const totalSum = sum(filteredAndSortedCustomers);
            const totalWithValue = withValue(filteredAndSortedCustomers).length;
            const totalAvg = totalWithValue > 0 ? totalSum / totalWithValue : 0;

            return (
              <tfoot>
                <TableRow className="bg-muted/50 font-semibold border-t-2">
                  <TableCell colSpan={footerLabelColSpan} className="text-right">
                    Total Mensalidades
                  </TableCell>
                  {isColumnVisible('mensalidade') && <TableCell className="text-right">R$ {totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                </TableRow>
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={footerLabelColSpan} className="text-right">
                    Faturamento Mensalidade Carteira Ativada ({ativados.length})
                  </TableCell>
                  {isColumnVisible('mensalidade') && <TableCell className="text-right">R$ {sum(ativados).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                </TableRow>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={footerLabelColSpan} className="text-right">
                    Ticket Médio Ativados ({withValue(ativados).length} de {ativados.length})
                  </TableCell>
                  {isColumnVisible('mensalidade') && <TableCell className="text-right">R$ {avg(ativados).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                </TableRow>
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={footerLabelColSpan} className="text-right">
                    Ticket Médio Não Ativados ({withValue(naoAtivados).length} de {naoAtivados.length})
                  </TableCell>
                  {isColumnVisible('mensalidade') && <TableCell className="text-right">R$ {avg(naoAtivados).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
                </TableRow>
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={footerLabelColSpan} className="text-right">
                    Ticket Médio Total ({totalWithValue} de {filteredAndSortedCustomers.length})
                  </TableCell>
                  {isColumnVisible('mensalidade') && <TableCell className="text-right">R$ {totalAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>}
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
                    .from(tableName as any)
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
