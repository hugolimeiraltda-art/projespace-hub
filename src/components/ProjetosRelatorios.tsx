import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BarChart3, Clock, FileText, CheckCircle2, Users, CalendarDays } from 'lucide-react';
import { format, subDays, subMonths, differenceInDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectRow {
  id: string;
  created_at: string;
  engineering_status: string | null;
  engineering_received_at: string | null;
  engineering_completed_at: string | null;
  created_by_user_id: string;
  status: string;
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
  tempoMedioConclusao: number | null; // days
  conclusaoList: number[];
}

export function ProjetosRelatorios() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projetistas, setProjetistas] = useState<ProfileRow[]>([]);
  const [vendedores, setVendedores] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('30');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projetistas and vendedores
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
          .select('id, created_at, engineering_status, engineering_received_at, engineering_completed_at, created_by_user_id, status')
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

  const stats = useMemo((): ProjetistaStats[] => {
    return projetistas.map(projetista => {
      // Chamados recebidos = projetos que entraram no fluxo de engenharia no período
      const chamadosRecebidos = projects.filter(p => {
        if (!p.engineering_received_at) return false;
        const received = new Date(p.engineering_received_at);
        return received >= dateRange.start && received <= dateRange.end;
      }).length;

      // Projetos abertos no período (created_at within range)
      const projetosAbertos = filteredProjects.length;

      // Projetos concluídos no período
      const concluidos = projects.filter(p => {
        if (!p.engineering_completed_at) return false;
        const completed = new Date(p.engineering_completed_at);
        return completed >= dateRange.start && completed <= dateRange.end;
      });
      const projetosConcluidos = concluidos.length;

      // Tempo médio de conclusão
      const conclusaoList = concluidos
        .filter(p => p.engineering_received_at && p.engineering_completed_at)
        .map(p => differenceInDays(
          parseISO(p.engineering_completed_at!),
          parseISO(p.engineering_received_at!)
        ));

      const tempoMedioConclusao = conclusaoList.length > 0
        ? Math.round(conclusaoList.reduce((a, b) => a + b, 0) / conclusaoList.length)
        : null;

      return {
        id: projetista.id,
        nome: projetista.nome,
        chamadosRecebidos,
        projetosAbertos,
        projetosConcluidos,
        tempoMedioConclusao,
        conclusaoList,
      };
    });
  }, [projetistas, projects, filteredProjects, dateRange]);

  // Global stats
  const globalStats = useMemo(() => {
    const totalChamados = projects.filter(p => {
      if (!p.engineering_received_at) return false;
      const received = new Date(p.engineering_received_at);
      return received >= dateRange.start && received <= dateRange.end;
    }).length;

    const totalAbertos = filteredProjects.length;

    const concluidos = projects.filter(p => {
      if (!p.engineering_completed_at) return false;
      const completed = new Date(p.engineering_completed_at);
      return completed >= dateRange.start && completed <= dateRange.end;
    });

    const allTimes = concluidos
      .filter(p => p.engineering_received_at && p.engineering_completed_at)
      .map(p => differenceInDays(parseISO(p.engineering_completed_at!), parseISO(p.engineering_received_at!)));

    const tempoMedio = allTimes.length > 0
      ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
      : null;

    return {
      totalChamados,
      totalAbertos,
      totalConcluidos: concluidos.length,
      tempoMedio,
    };
  }, [projects, filteredProjects, dateRange]);

  // Vendedor stats
  const vendedorStats = useMemo(() => {
    return vendedores.map(vendedor => {
      const vendedorProjects = filteredProjects.filter(p => p.created_by_user_id === vendedor.id);
      const projetosAbertos = vendedorProjects.length;

      const projetosConcluidos = projects.filter(p => {
        if (p.created_by_user_id !== vendedor.id) return false;
        if (p.status !== 'APROVADO_PROJETO') return false;
        return true;
      }).filter(p => {
        const created = new Date(p.created_at);
        return created >= dateRange.start && created <= dateRange.end;
      }).length;

      const vendasConcluidas = projects.filter(p => {
        if (p.created_by_user_id !== vendedor.id) return false;
        if (!p.engineering_completed_at) return false;
        const completed = new Date(p.engineering_completed_at);
        return completed >= dateRange.start && completed <= dateRange.end;
      }).length;

      return {
        id: vendedor.id,
        nome: vendedor.nome,
        projetosAbertos,
        projetosAprovados: projetosConcluidos,
        vendasConcluidas,
      };
    }).filter(v => v.projetosAbertos > 0 || v.projetosAprovados > 0 || v.vendasConcluidas > 0);
  }, [vendedores, projects, filteredProjects, dateRange]);

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
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-[180px]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Fim</label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-[180px]"
                  />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
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

        <Card className="shadow-card">
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

        <Card className="shadow-card">
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
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nome}</TableCell>
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
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.nome}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
