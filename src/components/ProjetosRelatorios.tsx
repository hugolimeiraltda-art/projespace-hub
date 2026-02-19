import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart3, Clock, FileText, CheckCircle2, Users, CalendarDays, ExternalLink, ChevronDown, ChevronUp, X, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { format, subDays, differenceInDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function countBusinessDays(start: Date, end: Date): number {
  if (start > end) return 0;
  return eachDayOfInterval({ start, end }).filter(d => !isWeekend(d)).length;
}

interface ProjectRow {
  id: string;
  created_at: string;
  engineering_status: string | null;
  engineering_received_at: string | null;
  engineering_completed_at: string | null;
  created_by_user_id: string;
  status: string;
  cliente_condominio_nome: string;
  numero_projeto: number;
  vendedor_nome: string;
}

interface ProfileRow {
  id: string;
  nome: string;
}

interface ProjetistaStats {
  id: string;
  nome: string;
  chamadosRecebidos: number;
  projetosAbertos: number;
  projetosConcluidos: number;
  tempoMedioConclusao: number | null;
  mediaPorDiaUtil: number | null;
  conclusaoList: number[];
}

type CardType = 'chamados' | 'abertos' | 'concluidos' | null;

export function ProjetosRelatorios() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projetistas, setProjetistas] = useState<ProfileRow[]>([]);
  const [vendedores, setVendedores] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('30');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Drill-down state
  const [activeCard, setActiveCard] = useState<CardType>(null);
  const [expandedProjetista, setExpandedProjetista] = useState<string | null>(null);
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null);

  // Sorting for projetista table
  type ProjetistaSortField = 'nome' | 'chamadosRecebidos' | 'projetosAbertos' | 'projetosConcluidos' | 'tempoMedioConclusao' | 'mediaPorDiaUtil';
  const [projetistaSortField, setProjetistaSortField] = useState<ProjetistaSortField>('nome');
  const [projetistaSortDir, setProjetistaSortDir] = useState<'asc' | 'desc'>('asc');

  // Sorting for vendedor table
  type VendedorSortField = 'nome' | 'projetosAbertos' | 'projetosAprovados' | 'vendasConcluidas';
  const [vendedorSortField, setVendedorSortField] = useState<VendedorSortField>('nome');
  const [vendedorSortDir, setVendedorSortDir] = useState<'asc' | 'desc'>('asc');

  // Column filters for projetista table
  const [filterProjetistaNome, setFilterProjetistaNome] = useState<string[]>([]);

  // Column filters for vendedor table
  const [filterVendedorNome, setFilterVendedorNome] = useState<string[]>([]);

  const handleProjetistaSort = (field: ProjetistaSortField) => {
    if (projetistaSortField === field) {
      setProjetistaSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setProjetistaSortField(field);
      setProjetistaSortDir('asc');
    }
  };

  const handleVendedorSort = (field: VendedorSortField) => {
    if (vendedorSortField === field) {
      setVendedorSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setVendedorSortField(field);
      setVendedorSortDir('asc');
    }
  };

  const SortHeaderIcon = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) => {
    if (!active) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground/40" />;
    return dir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary" />
      : <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary" />;
  };

  const FilterColumnHeader = ({ 
    label, field, sortField, sortDir, onSort, uniqueValues, selectedValues, onSelectedChange, align = 'left'
  }: { 
    label: string; field: string; sortField: string; sortDir: 'asc' | 'desc'; onSort: () => void; 
    uniqueValues: string[]; selectedValues: string[]; onSelectedChange: (v: string[]) => void; align?: 'left' | 'center';
  }) => {
    const hasFilter = selectedValues.length > 0;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className={`flex items-center gap-1 cursor-pointer select-none ${align === 'center' ? 'justify-center' : ''}`}>
            {label}
            <SortHeaderIcon active={sortField === field} dir={sortDir} />
            {hasFilter && <Badge variant="default" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{selectedValues.length}</Badge>}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-2">
            <div className="flex gap-1">
              <Button size="sm" variant={sortField === field && sortDir === 'asc' ? 'default' : 'outline'} className="flex-1 text-xs h-7" onClick={onSort}>
                A→Z
              </Button>
              <Button size="sm" variant={sortField === field && sortDir === 'desc' ? 'default' : 'outline'} className="flex-1 text-xs h-7" onClick={onSort}>
                Z→A
              </Button>
            </div>
            <div className="border-t pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Filtrar por valor</p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {uniqueValues.map(val => (
                  <label key={val} className="flex items-center gap-2 text-sm py-0.5 px-1 rounded hover:bg-muted cursor-pointer">
                    <Checkbox
                      checked={selectedValues.includes(val)}
                      onCheckedChange={(checked) => {
                        if (checked) onSelectedChange([...selectedValues, val]);
                        else onSelectedChange(selectedValues.filter(v => v !== val));
                      }}
                    />
                    <span className="truncate">{val}</span>
                  </label>
                ))}
              </div>
            </div>
            {hasFilter && (
              <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => onSelectedChange([])}>
                <X className="w-3 h-3 mr-1" /> Limpar filtro
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projetistasRoles, vendedoresRoles] = await Promise.all([
        supabase.from('user_roles').select('user_id').eq('role', 'projetos'),
        supabase.from('user_roles').select('user_id').eq('role', 'vendedor'),
      ]);

      const projetistaIds = projetistasRoles.data?.map(r => r.user_id) || [];
      const vendedorIds = vendedoresRoles.data?.map(r => r.user_id) || [];
      const allIds = [...new Set([...projetistaIds, ...vendedorIds])];

      const [profilesRes, projectsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, nome')
          .in('id', allIds.length > 0 ? allIds : ['none']),
        supabase
          .from('projects')
          .select('id, created_at, engineering_status, engineering_received_at, engineering_completed_at, created_by_user_id, status, cliente_condominio_nome, numero_projeto, vendedor_nome')
          .not('status', 'eq', 'RASCUNHO'),
      ]);

      const allProfiles = profilesRes.data || [];
      setProjetistas(allProfiles.filter(p => projetistaIds.includes(p.id)));
      setVendedores(allProfiles.filter(p => vendedorIds.includes(p.id)));
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    }
    setLoading(false);
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    if (periodo === 'custom') {
      if (dataInicio && dataFim) {
        return { start: new Date(dataInicio), end: new Date(dataFim + 'T23:59:59') };
      }
      return { start: subDays(now, 30), end: now };
    }
    if (periodo === 'mes_atual') {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    const days = parseInt(periodo) || 30;
    return { start: subDays(now, days), end: now };
  }, [periodo, dataInicio, dataFim]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const created = new Date(p.created_at);
      return created >= dateRange.start && created <= dateRange.end;
    });
  }, [projects, dateRange]);

  // Projects by category for card drill-down
  const chamadosRecebidosProjects = useMemo(() => projects.filter(p => {
    if (!p.engineering_received_at) return false;
    const received = new Date(p.engineering_received_at);
    return received >= dateRange.start && received <= dateRange.end;
  }), [projects, dateRange]);

  const concluidosProjects = useMemo(() => projects.filter(p => {
    if (!p.engineering_completed_at) return false;
    const completed = new Date(p.engineering_completed_at);
    return completed >= dateRange.start && completed <= dateRange.end;
  }), [projects, dateRange]);

  const stats = useMemo((): ProjetistaStats[] => {
    return projetistas.map(projetista => {
      const chamadosRecebidos = chamadosRecebidosProjects.length;
      const projetosAbertos = filteredProjects.length;
      const concluidos = concluidosProjects;
      const projetosConcluidos = concluidos.length;

      const conclusaoList = concluidos
        .filter(p => p.engineering_received_at && p.engineering_completed_at)
        .map(p => differenceInDays(parseISO(p.engineering_completed_at!), parseISO(p.engineering_received_at!)));

      const tempoMedioConclusao = conclusaoList.length > 0
        ? Math.round(conclusaoList.reduce((a, b) => a + b, 0) / conclusaoList.length)
        : null;

      const diasUteis = countBusinessDays(dateRange.start, dateRange.end);
      const mediaPorDiaUtil = diasUteis > 0 && projetosConcluidos > 0
        ? Math.round((projetosConcluidos / diasUteis) * 100) / 100
        : null;

      return { id: projetista.id, nome: projetista.nome, chamadosRecebidos, projetosAbertos, projetosConcluidos, tempoMedioConclusao, mediaPorDiaUtil, conclusaoList };
    });
  }, [projetistas, chamadosRecebidosProjects, filteredProjects, concluidosProjects, dateRange]);

  const sortedStats = useMemo(() => {
    let filtered = [...stats];
    if (filterProjetistaNome.length > 0) {
      filtered = filtered.filter(s => filterProjetistaNome.includes(s.nome));
    }
    return filtered.sort((a, b) => {
      const f = projetistaSortField;
      let valA: string | number = f === 'nome' ? a.nome.toLowerCase() : (a[f] ?? -1);
      let valB: string | number = f === 'nome' ? b.nome.toLowerCase() : (b[f] ?? -1);
      if (valA < valB) return projetistaSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return projetistaSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stats, projetistaSortField, projetistaSortDir, filterProjetistaNome]);

  const globalStats = useMemo(() => {
    const allTimes = concluidosProjects
      .filter(p => p.engineering_received_at && p.engineering_completed_at)
      .map(p => differenceInDays(parseISO(p.engineering_completed_at!), parseISO(p.engineering_received_at!)));

    const tempoMedio = allTimes.length > 0
      ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
      : null;

    return {
      totalChamados: chamadosRecebidosProjects.length,
      totalAbertos: filteredProjects.length,
      totalConcluidos: concluidosProjects.length,
      tempoMedio,
    };
  }, [chamadosRecebidosProjects, filteredProjects, concluidosProjects]);

  const vendedorStats = useMemo(() => {
    return vendedores.map(vendedor => {
      const vendedorProjects = filteredProjects.filter(p => p.created_by_user_id === vendedor.id);
      const projetosAbertos = vendedorProjects.length;

      const projetosAprovados = projects.filter(p => {
        if (p.created_by_user_id !== vendedor.id) return false;
        if (p.status !== 'APROVADO_PROJETO') return false;
        const created = new Date(p.created_at);
        return created >= dateRange.start && created <= dateRange.end;
      }).length;

      const vendasConcluidas = projects.filter(p => {
        if (p.created_by_user_id !== vendedor.id) return false;
        if (!p.engineering_completed_at) return false;
        const completed = new Date(p.engineering_completed_at);
        return completed >= dateRange.start && completed <= dateRange.end;
      }).length;

      return { id: vendedor.id, nome: vendedor.nome, projetosAbertos, projetosAprovados, vendasConcluidas };
    }).filter(v => v.projetosAbertos > 0 || v.projetosAprovados > 0 || v.vendasConcluidas > 0);
  }, [vendedores, projects, filteredProjects, dateRange]);

  const sortedVendedorStats = useMemo(() => {
    let filtered = [...vendedorStats];
    if (filterVendedorNome.length > 0) {
      filtered = filtered.filter(v => filterVendedorNome.includes(v.nome));
    }
    return filtered.sort((a, b) => {
      const f = vendedorSortField;
      let valA: string | number = f === 'nome' ? a.nome.toLowerCase() : a[f];
      let valB: string | number = f === 'nome' ? b.nome.toLowerCase() : b[f];
      if (valA < valB) return vendedorSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return vendedorSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [vendedorStats, vendedorSortField, vendedorSortDir, filterVendedorNome]);

  // Unique values for filters
  const uniqueProjetistaNomes = useMemo(() => stats.map(s => s.nome).sort(), [stats]);
  const uniqueVendedorNomes = useMemo(() => vendedorStats.map(v => v.nome).sort(), [vendedorStats]);

  // Get projects for expanded vendedor
  const getVendedorProjectsList = (vendedorId: string) => {
    return filteredProjects.filter(p => p.created_by_user_id === vendedorId);
  };

  // Get card drill-down projects
  const getCardProjects = () => {
    switch (activeCard) {
      case 'chamados': return chamadosRecebidosProjects;
      case 'abertos': return filteredProjects;
      case 'concluidos': return concluidosProjects;
      default: return [];
    }
  };

  const cardTitle = activeCard === 'chamados' ? 'Chamados Recebidos' : activeCard === 'abertos' ? 'Projetos Abertos' : 'Projetos Concluídos';

  const ProjectList = ({ projectList }: { projectList: ProjectRow[] }) => (
    <div className="space-y-1 mt-2">
      {projectList.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nenhum projeto encontrado</p>
      ) : (
        projectList.map(p => (
          <div
            key={p.id}
            className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors group"
            onClick={() => navigate(`/projetos/${p.id}`)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">#{p.numero_projeto}</span>
              <span className="text-sm font-medium">{p.cliente_condominio_nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{p.vendedor_nome}</span>
              <span className="text-xs text-muted-foreground">{format(parseISO(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="mes_atual">Mês atual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {periodo === 'custom' && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Início</label>
                  <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-[180px]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Fim</label>
                  <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-[180px]" />
                </div>
              </>
            )}
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} — {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={`shadow-card cursor-pointer transition-all hover:shadow-lg ${activeCard === 'chamados' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveCard(activeCard === 'chamados' ? null : 'chamados')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-sent-bg">
                <BarChart3 className="w-5 h-5 text-status-sent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{globalStats.totalChamados}</p>
                <p className="text-sm text-muted-foreground">Chamados Recebidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`shadow-card cursor-pointer transition-all hover:shadow-lg ${activeCard === 'abertos' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveCard(activeCard === 'abertos' ? null : 'abertos')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-analysis-bg">
                <FileText className="w-5 h-5 text-status-analysis" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{globalStats.totalAbertos}</p>
                <p className="text-sm text-muted-foreground">Projetos Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`shadow-card cursor-pointer transition-all hover:shadow-lg ${activeCard === 'concluidos' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveCard(activeCard === 'concluidos' ? null : 'concluidos')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-approved-bg">
                <CheckCircle2 className="w-5 h-5 text-status-approved" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{globalStats.totalConcluidos}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-status-pending-bg">
                <Clock className="w-5 h-5 text-status-pending" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {globalStats.tempoMedio !== null ? `${globalStats.tempoMedio}d` : '—'}
                </p>
                <p className="text-sm text-muted-foreground">Tempo Médio Conclusão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Drill-down */}
      {activeCard && (
        <Card className="shadow-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{cardTitle}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setActiveCard(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ProjectList projectList={getCardProjects()} />
          </CardContent>
        </Card>
      )}

      {/* Per Projetista Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Produtividade por Projetista
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum projetista encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <FilterColumnHeader
                      label="Projetista" field="nome" sortField={projetistaSortField} sortDir={projetistaSortDir}
                      onSort={() => handleProjetistaSort('nome')} uniqueValues={uniqueProjetistaNomes}
                      selectedValues={filterProjetistaNome} onSelectedChange={setFilterProjetistaNome}
                    />
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleProjetistaSort('chamadosRecebidos')}>
                    <div className="flex items-center justify-center">Chamados Recebidos<SortHeaderIcon active={projetistaSortField === 'chamadosRecebidos'} dir={projetistaSortDir} /></div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleProjetistaSort('projetosAbertos')}>
                    <div className="flex items-center justify-center">Projetos Abertos<SortHeaderIcon active={projetistaSortField === 'projetosAbertos'} dir={projetistaSortDir} /></div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleProjetistaSort('projetosConcluidos')}>
                    <div className="flex items-center justify-center">Concluídos<SortHeaderIcon active={projetistaSortField === 'projetosConcluidos'} dir={projetistaSortDir} /></div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleProjetistaSort('tempoMedioConclusao')}>
                    <div className="flex items-center justify-center">Tempo Médio (dias)<SortHeaderIcon active={projetistaSortField === 'tempoMedioConclusao'} dir={projetistaSortDir} /></div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleProjetistaSort('mediaPorDiaUtil')}>
                    <div className="flex items-center justify-center">Média/Dia Útil<SortHeaderIcon active={projetistaSortField === 'mediaPorDiaUtil'} dir={projetistaSortDir} /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStats.map((s) => (
                  <>
                    <TableRow
                      key={s.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedProjetista(expandedProjetista === s.id ? null : s.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {expandedProjetista === s.id ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          {s.nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{s.chamadosRecebidos}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{s.projetosAbertos}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-status-approved-bg text-status-approved">{s.projetosConcluidos}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {s.tempoMedioConclusao !== null ? (
                          <Badge className={`${s.tempoMedioConclusao <= 5 ? 'bg-status-approved-bg text-status-approved' : s.tempoMedioConclusao <= 10 ? 'bg-status-pending-bg text-status-pending' : 'bg-destructive/10 text-destructive'}`}>
                            {s.tempoMedioConclusao} dias
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {s.mediaPorDiaUtil !== null ? (
                          <Badge variant="outline" className="font-mono">{s.mediaPorDiaUtil.toFixed(2)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedProjetista === s.id && (
                      <TableRow key={`${s.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Projetos no período:</p>
                          <ProjectList projectList={filteredProjects} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Per Vendedor Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Produtividade por Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendedorStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum vendedor com atividade no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <FilterColumnHeader
                      label="Vendedor" field="nome" sortField={vendedorSortField} sortDir={vendedorSortDir}
                      onSort={() => handleVendedorSort('nome')} uniqueValues={uniqueVendedorNomes}
                      selectedValues={filterVendedorNome} onSelectedChange={setFilterVendedorNome}
                    />
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleVendedorSort('projetosAbertos')}>
                    <div className="flex items-center justify-center">Projetos Abertos<SortHeaderIcon active={vendedorSortField === 'projetosAbertos'} dir={vendedorSortDir} /></div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleVendedorSort('projetosAprovados')}>
                    <div className="flex items-center justify-center">Projetos Aprovados<SortHeaderIcon active={vendedorSortField === 'projetosAprovados'} dir={vendedorSortDir} /></div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer select-none" onClick={() => handleVendedorSort('vendasConcluidas')}>
                    <div className="flex items-center justify-center">Vendas Concluídas<SortHeaderIcon active={vendedorSortField === 'vendasConcluidas'} dir={vendedorSortDir} /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVendedorStats.map((v) => (
                  <>
                    <TableRow
                      key={v.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedVendedor(expandedVendedor === v.id ? null : v.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {expandedVendedor === v.id ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          {v.nome}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{v.projetosAbertos}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-status-approved-bg text-status-approved">{v.projetosAprovados}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{v.vendasConcluidas}</Badge>
                      </TableCell>
                    </TableRow>
                    {expandedVendedor === v.id && (
                      <TableRow key={`${v.id}-detail`}>
                        <TableCell colSpan={4} className="bg-muted/30 p-4">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Projetos do vendedor no período:</p>
                          <ProjectList projectList={getVendedorProjectsList(v.id)} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
