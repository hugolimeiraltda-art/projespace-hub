import { useState, useEffect, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { FileDown, BarChart3, Users, Building, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Chamado {
  id: string;
  razao_social: string;
  contrato: string;
  tipo: string;
  status: string;
  tecnico_executor: string | null;
  tecnico_responsavel: string | null;
  data_agendada: string;
  data_conclusao: string | null;
  praca: string | null;
  customer_id: string | null;
  descricao: string | null;
  is_auditoria: boolean | null;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f97316',
  '#06b6d4',
  '#8b5cf6',
];

export default function ManutencaoRelatorios() {
  const { toast } = useToast();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mesesPeriodo, setMesesPeriodo] = useState(6);
  const [filterPraca, setFilterPraca] = useState('all');

  const dataInicio = useMemo(() => startOfMonth(subMonths(new Date(), mesesPeriodo - 1)), [mesesPeriodo]);
  const dataFim = useMemo(() => endOfMonth(new Date()), []);

  useEffect(() => {
    fetchChamados();
  }, [mesesPeriodo]);

  const fetchChamados = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('manutencao_chamados')
        .select('id, razao_social, contrato, tipo, status, tecnico_executor, tecnico_responsavel, data_agendada, data_conclusao, praca, customer_id, descricao, is_auditoria')
        .gte('data_agendada', dataInicio.toISOString().split('T')[0])
        .lte('data_agendada', dataFim.toISOString().split('T')[0])
        .eq('tipo', 'PREVENTIVO');

      if (error) throw error;
      setChamados(data || []);
    } catch (error) {
      console.error('Error fetching chamados:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChamados = useMemo(() => {
    return chamados.filter(c => filterPraca === 'all' || c.praca === filterPraca);
  }, [chamados, filterPraca]);

  const pracas = useMemo(() => [...new Set(chamados.map(c => c.praca).filter(Boolean))].sort(), [chamados]);

  // KPIs
  const totalVisitas = filteredChamados.length;
  const concluidas = filteredChamados.filter(c => c.status === 'CONCLUIDO').length;
  const pendentes = filteredChamados.filter(c => c.status !== 'CONCLUIDO').length;
  const taxaConclusao = totalVisitas > 0 ? Math.round((concluidas / totalVisitas) * 100) : 0;

  // Visitas por mês
  const visitasPorMes = useMemo(() => {
    const meses: Record<string, { mes: string; total: number; concluidas: number; pendentes: number }> = {};
    for (let i = 0; i < mesesPeriodo; i++) {
      const d = subMonths(new Date(), mesesPeriodo - 1 - i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM/yy', { locale: ptBR });
      meses[key] = { mes: label, total: 0, concluidas: 0, pendentes: 0 };
    }
    filteredChamados.forEach(c => {
      const key = c.data_agendada.substring(0, 7);
      if (meses[key]) {
        meses[key].total++;
        if (c.status === 'CONCLUIDO') meses[key].concluidas++;
        else meses[key].pendentes++;
      }
    });
    return Object.values(meses);
  }, [filteredChamados, mesesPeriodo]);

  // Ranking técnicos
  const rankingTecnicos = useMemo(() => {
    const map: Record<string, { nome: string; total: number; concluidas: number }> = {};
    filteredChamados.forEach(c => {
      const tecnico = c.tecnico_executor || c.tecnico_responsavel || 'Não atribuído';
      if (!map[tecnico]) map[tecnico] = { nome: tecnico, total: 0, concluidas: 0 };
      map[tecnico].total++;
      if (c.status === 'CONCLUIDO') map[tecnico].concluidas++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredChamados]);

  // Ranking clientes
  const rankingClientes = useMemo(() => {
    const map: Record<string, { nome: string; contrato: string; total: number; concluidas: number; praca: string }> = {};
    filteredChamados.forEach(c => {
      const key = c.contrato || c.razao_social;
      if (!map[key]) map[key] = { nome: c.razao_social, contrato: c.contrato, total: 0, concluidas: 0, praca: c.praca || '-' };
      map[key].total++;
      if (c.status === 'CONCLUIDO') map[key].concluidas++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredChamados]);

  // Visitas por praça
  const visitasPorPraca = useMemo(() => {
    const map: Record<string, { praca: string; total: number; concluidas: number }> = {};
    filteredChamados.forEach(c => {
      const praca = c.praca || 'Sem praça';
      if (!map[praca]) map[praca] = { praca, total: 0, concluidas: 0 };
      map[praca].total++;
      if (c.status === 'CONCLUIDO') map[praca].concluidas++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredChamados]);

  // Média de visitas por mês
  const mediaVisitasMes = mesesPeriodo > 0 ? Math.round(totalVisitas / mesesPeriodo * 10) / 10 : 0;

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Cliente', 'Contrato', 'Praça', 'Técnico', 'Data Agendada', 'Data Conclusão', 'Status'];
    const rows = filteredChamados.map(c => [
      c.razao_social,
      c.contrato,
      c.praca || '',
      c.tecnico_executor || c.tecnico_responsavel || '',
      c.data_agendada,
      c.data_conclusao || '',
      c.status,
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-manutencao-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatórios de Manutenção</h1>
            <p className="text-muted-foreground">Análise estratégica de visitas preventivas</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Período:</Label>
              <Select value={String(mesesPeriodo)} onValueChange={(v) => setMesesPeriodo(Number(v))}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="18">18 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Praça:</Label>
              <Select value={filterPraca} onValueChange={setFilterPraca}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {pracas.map(p => (
                    <SelectItem key={p} value={p!}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <FileDown className="w-4 h-4 mr-1" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-foreground">{totalVisitas}</p>
              <p className="text-xs text-muted-foreground">Total Visitas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-foreground">{concluidas}</p>
              <p className="text-xs text-muted-foreground">Concluídas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
              <p className="text-2xl font-bold text-foreground">{pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-foreground">{taxaConclusao}%</p>
              <p className="text-xs text-muted-foreground">Taxa Conclusão</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-foreground">{mediaVisitasMes}</p>
              <p className="text-xs text-muted-foreground">Média/Mês</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="visao-geral" className="space-y-4">
          <TabsList>
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="tecnicos">Técnicos</TabsTrigger>
            <TabsTrigger value="clientes">Clientes</TabsTrigger>
            <TabsTrigger value="pracas">Por Praça</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="visao-geral" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Visitas Preventivas por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={visitasPorMes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="concluidas" name="Concluídas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pendentes" name="Pendentes" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolução Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={visitasPorMes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="concluidas" name="Concluídas" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Praça</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={visitasPorPraca}
                        dataKey="total"
                        nameKey="praca"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ praca, total }) => `${praca}: ${total}`}
                      >
                        {visitasPorPraca.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {visitasPorPraca.map((p, i) => (
                      <div key={p.praca} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-medium">{p.praca}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {p.total} visitas ({p.concluidas} concluídas)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Técnicos */}
          <TabsContent value="tecnicos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ranking de Técnicos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(300, rankingTecnicos.length * 40)}>
                    <BarChart data={rankingTecnicos.slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="nome" type="category" width={150} fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="concluidas" name="Concluídas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="total" name="Total" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalhamento por Técnico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Técnico</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Concluídas</TableHead>
                          <TableHead className="text-center">% Conclusão</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingTecnicos.map((t, i) => (
                          <TableRow key={t.nome}>
                            <TableCell className="font-medium">{i + 1}</TableCell>
                            <TableCell>{t.nome}</TableCell>
                            <TableCell className="text-center">{t.total}</TableCell>
                            <TableCell className="text-center">{t.concluidas}</TableCell>
                            <TableCell className="text-center">
                              {t.total > 0 ? Math.round((t.concluidas / t.total) * 100) : 0}%
                            </TableCell>
                          </TableRow>
                        ))}
                        {rankingTecnicos.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Nenhum dado no período selecionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Clientes */}
          <TabsContent value="clientes" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top 15 Clientes com Mais Visitas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(300, Math.min(15, rankingClientes.length) * 40)}>
                    <BarChart data={rankingClientes.slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="nome" type="category" width={180} fontSize={10} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="concluidas" name="Concluídas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="total" name="Total" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalhamento por Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Contrato</TableHead>
                          <TableHead>Praça</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Concluídas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rankingClientes.map((c, i) => (
                          <TableRow key={c.contrato}>
                            <TableCell className="font-medium">{i + 1}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{c.nome}</TableCell>
                            <TableCell>{c.contrato}</TableCell>
                            <TableCell>{c.praca}</TableCell>
                            <TableCell className="text-center">{c.total}</TableCell>
                            <TableCell className="text-center">{c.concluidas}</TableCell>
                          </TableRow>
                        ))}
                        {rankingClientes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhum dado no período selecionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Por Praça */}
          <TabsContent value="pracas" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {visitasPorPraca.map((p, i) => (
                <Card key={p.praca}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <h3 className="font-semibold text-foreground">{p.praca}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/50 rounded p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{p.total}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2 text-center">
                        <p className="text-lg font-bold text-foreground">{p.concluidas}</p>
                        <p className="text-xs text-muted-foreground">Concluídas</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2 text-center col-span-2">
                        <p className="text-lg font-bold text-foreground">
                          {p.total > 0 ? Math.round((p.concluidas / p.total) * 100) : 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">Taxa Conclusão</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {visitasPorPraca.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum dado no período selecionado
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Comparativo mensal por praça */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparativo Mensal por Praça</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const monthlyByPraca: Record<string, Record<string, number>> = {};
                  const allMonths: string[] = [];
                  for (let i = 0; i < mesesPeriodo; i++) {
                    const d = subMonths(new Date(), mesesPeriodo - 1 - i);
                    allMonths.push(format(d, 'MMM/yy', { locale: ptBR }));
                  }
                  
                  filteredChamados.forEach(c => {
                    const praca = c.praca || 'Sem praça';
                    const monthIdx = (() => {
                      for (let i = 0; i < mesesPeriodo; i++) {
                        const d = subMonths(new Date(), mesesPeriodo - 1 - i);
                        if (format(d, 'yyyy-MM') === c.data_agendada.substring(0, 7)) return i;
                      }
                      return -1;
                    })();
                    if (monthIdx === -1) return;
                    const monthLabel = allMonths[monthIdx];
                    if (!monthlyByPraca[monthLabel]) monthlyByPraca[monthLabel] = {};
                    monthlyByPraca[monthLabel][praca] = (monthlyByPraca[monthLabel][praca] || 0) + 1;
                  });

                  const allPracas = [...new Set(filteredChamados.map(c => c.praca || 'Sem praça'))];
                  const chartData = allMonths.map(m => {
                    const row: Record<string, any> = { mes: m };
                    allPracas.forEach(p => { row[p] = monthlyByPraca[m]?.[p] || 0; });
                    return row;
                  });

                  return (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        {allPracas.map((p, i) => (
                          <Bar key={p} dataKey={p} name={p} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} stackId="stack" />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
