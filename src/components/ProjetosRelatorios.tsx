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
import { BarChart3, Clock, FileText, CheckCircle2, Users, CalendarDays, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react';
import { format, subDays, differenceInDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

      return { id: projetista.id, nome: projetista.nome, chamadosRecebidos, projetosAbertos, projetosConcluidos, tempoMedioConclusao, conclusaoList };
    });
  }, [projetistas, chamadosRecebidosProjects, filteredProjects, concluidosProjects]);

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
                  <TableHead>Projetista</TableHead>
                  <TableHead className="text-center">Chamados Recebidos</TableHead>
                  <TableHead className="text-center">Projetos Abertos</TableHead>
                  <TableHead className="text-center">Concluídos</TableHead>
                  <TableHead className="text-center">Tempo Médio (dias)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
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
                    </TableRow>
                    {expandedProjetista === s.id && (
                      <TableRow key={`${s.id}-detail`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
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
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Projetos Abertos</TableHead>
                  <TableHead className="text-center">Projetos Aprovados</TableHead>
                  <TableHead className="text-center">Vendas Concluídas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedorStats.map((v) => (
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
