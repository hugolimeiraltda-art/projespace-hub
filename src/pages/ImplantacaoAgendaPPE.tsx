import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isWithinInterval, parseISO, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type ServiceType = '3.7' | '4.1';

interface AgendaEvent {
  projectId: string;
  contrato: string;
  cliente: string;
  cidade: string;
  estado: string;
  instaladorId: string | null;
  instaladorNome: string;
  tipo: ServiceType;
  tipoLabel: string;
  date: Date;
}

const SEM_EQUIPE_ID = '__sem_equipe__';
const SEM_EQUIPE_LABEL = 'Sem equipe atribuída';

export default function ImplantacaoAgendaPPE() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'semana' | 'mes'>('semana');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [filial, setFilial] = useState<string>('todas');
  const [tipoServico, setTipoServico] = useState<'todos' | ServiceType>('todos');
  const [instaladorFilter, setInstaladorFilter] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: etapasRaw, error: etapasError } = await supabase
        .from('implantacao_etapas')
        .select('project_id, ppe_execucao_base_data, agendamento_visita_startup_data, ppe_equipe_prestador_id, contrato_assinado_at, ligacao_boas_vindas_at, laudo_visita_startup_at, check_programacao_at, confirmacao_ativacao_financeira_at');
      if (etapasError) {
        console.error('Erro ao carregar etapas PPE:', etapasError);
        setEvents([]);
        setLoading(false);
        return;
      }
      const etapas = (etapasRaw || []).filter(e =>
        e.ppe_execucao_base_data || e.agendamento_visita_startup_data
      );

      const projectIds = (etapas || []).map(e => e.project_id).filter(Boolean);
      const prestadorIds = Array.from(new Set((etapas || []).map(e => e.ppe_equipe_prestador_id).filter(Boolean))) as string[];

      const [projRes, prestRes] = await Promise.all([
        projectIds.length
          ? supabase.from('projects')
              .select('id, cliente_condominio_nome, cliente_cidade, cliente_estado, tipo_implantacao, implantacao_status, sale_status')
              .in('id', projectIds as string[])
          : Promise.resolve({ data: [] as any[] }),
        prestadorIds.length
          ? supabase.from('prestadores').select('id, nome').in('id', prestadorIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const projMap = new Map((projRes.data || []).map((p: any) => [p.id, p]));
      const prestMap = new Map((prestRes.data || []).map((p: any) => [p.id, p.nome as string]));

      if ((projRes as any).error) console.error('Erro ao carregar projetos PPE:', (projRes as any).error);
      if ((prestRes as any).error) console.error('Erro ao carregar prestadores PPE:', (prestRes as any).error);

      // Find contract numbers from PPE/customer portfolio using project_id first, then name fallback.
      const [{ data: portfolio }, { data: ppeCustomers }] = await Promise.all([
        supabase.from('customer_portfolio').select('project_id, contrato, razao_social, tipo_carteira, filial'),
        supabase.from('ppe_customers').select('project_id, contrato, razao_social, filial'),
      ]);
      const contratoByProject = new Map<string, string>();
      const contratoByNome = new Map<string, string>();
      const filialByProject = new Map<string, string>();
      const filialByNome = new Map<string, string>();
      (portfolio || []).forEach((c: any) => {
        if (c.tipo_carteira !== 'PPE') return;
        if (c.contrato && !c.contrato.startsWith('TEMP-')) {
          if (c.project_id) contratoByProject.set(c.project_id, c.contrato);
          if (c.razao_social) contratoByNome.set(c.razao_social.trim().toLowerCase(), c.contrato);
        }
        if (c.filial) {
          if (c.project_id) filialByProject.set(c.project_id, c.filial);
          if (c.razao_social) filialByNome.set(c.razao_social.trim().toLowerCase(), c.filial);
        }
      });
      (ppeCustomers || []).forEach((c: any) => {
        if (c.contrato && !c.contrato.startsWith('TEMP-')) {
          if (c.project_id) contratoByProject.set(c.project_id, c.contrato);
          if (c.razao_social) contratoByNome.set(c.razao_social.trim().toLowerCase(), c.contrato);
        }
        if (c.filial) {
          if (c.project_id) filialByProject.set(c.project_id, c.filial);
          if (c.razao_social) filialByNome.set(c.razao_social.trim().toLowerCase(), c.filial);
        }
      });

      const evs: AgendaEvent[] = [];
      for (const et of etapas || []) {
        const proj: any = projMap.get(et.project_id);
        if (!proj) continue;
        if (proj.tipo_implantacao !== 'PPE') continue;
        if (proj.implantacao_status === 'CONCLUIDO_IMPLANTACAO') continue;
        // Hide PPE projects that are fully completed (all 5 steps)
        const _et: any = et;
        const ppeDone = !!(_et.contrato_assinado_at && _et.ligacao_boas_vindas_at && _et.laudo_visita_startup_at && _et.check_programacao_at && _et.confirmacao_ativacao_financeira_at);
        if (ppeDone) continue;
        const nomeKey = (proj.cliente_condominio_nome || '').trim().toLowerCase();
        const contrato = contratoByProject.get(proj.id)
          || contratoByNome.get(nomeKey)
          || `PPE-${proj.id.slice(0, 6)}`;
        const estado = filialByProject.get(proj.id)
          || filialByNome.get(nomeKey)
          || proj.cliente_estado
          || '';
        const instaladorNome = et.ppe_equipe_prestador_id
          ? (prestMap.get(et.ppe_equipe_prestador_id) || 'Prestador')
          : SEM_EQUIPE_LABEL;

        const base = {
          projectId: proj.id,
          contrato,
          cliente: proj.cliente_condominio_nome || 'Sem nome',
          cidade: proj.cliente_cidade || '',
          estado,
          instaladorId: et.ppe_equipe_prestador_id || null,
          instaladorNome,
        };
        if (et.ppe_execucao_base_data) {
          evs.push({ ...base, tipo: '3.7', tipoLabel: '3.7 Instalação da Base', date: parseISO(et.ppe_execucao_base_data) });
        }
        if (et.agendamento_visita_startup_data) {
          evs.push({ ...base, tipo: '4.1', tipoLabel: '4.1 Ativação do Totem', date: parseISO(et.agendamento_visita_startup_data) });
        }
      }
      setEvents(evs);
      setLoading(false);
    };
    load();
  }, []);

  const rangeStart = view === 'semana' ? startOfWeek(cursor, { weekStartsOn: 1 }) : startOfMonth(cursor);
  const rangeEnd = view === 'semana' ? endOfWeek(cursor, { weekStartsOn: 1 }) : endOfMonth(cursor);

  const filiais = useMemo(() => Array.from(new Set(events.map(e => e.estado).filter(Boolean))).sort(), [events]);
  const instaladores = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => map.set(e.instaladorId || SEM_EQUIPE_ID, e.instaladorNome));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);

  const filtered = useMemo(() => events.filter(e => {
    if (!isWithinInterval(e.date, { start: rangeStart, end: rangeEnd })) return false;
    if (filial !== 'todas' && e.estado !== filial) return false;
    if (tipoServico !== 'todos' && e.tipo !== tipoServico) return false;
    if (instaladorFilter !== 'todos') {
      const id = e.instaladorId || SEM_EQUIPE_ID;
      if (id !== instaladorFilter) return false;
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      if (!e.contrato.toLowerCase().includes(q) && !e.cliente.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [events, rangeStart, rangeEnd, filial, tipoServico, instaladorFilter, busca]);

  const kpis = useMemo(() => ({
    total: new Set(filtered.map(e => e.projectId)).size,
    bases: filtered.filter(e => e.tipo === '3.7').length,
    totens: filtered.filter(e => e.tipo === '4.1').length,
    equipes: new Set(filtered.map(e => e.instaladorId || SEM_EQUIPE_ID)).size,
  }), [filtered]);

  // Group by installer for week view swimlanes
  const instaladoresNoRange = useMemo(() => {
    const map = new Map<string, string>();
    filtered.forEach(e => map.set(e.instaladorId || SEM_EQUIPE_ID, e.instaladorNome));
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === SEM_EQUIPE_ID) return 1;
      if (b[0] === SEM_EQUIPE_ID) return -1;
      return a[1].localeCompare(b[1]);
    });
  }, [filtered]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    let d = rangeStart;
    while (d <= rangeEnd) { arr.push(d); d = addDays(d, 1); }
    return arr;
  }, [rangeStart, rangeEnd]);

  const eventColor = (tipo: ServiceType) => tipo === '3.7'
    ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/40 hover:bg-orange-500/25'
    : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40 hover:bg-blue-500/25';

  const handleExportCsv = () => {
    const rows = [
      ['Data', 'Tipo', 'Contrato', 'Cliente', 'Cidade', 'UF', 'Instalador'],
      ...filtered
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(e => [
          format(e.date, 'dd/MM/yyyy'),
          e.tipoLabel,
          e.contrato,
          e.cliente,
          e.cidade,
          e.estado,
          e.instaladorNome,
        ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-ppe-${format(rangeStart, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary" />
              Agenda PPE
            </h1>
            <p className="text-sm text-muted-foreground">
              Programação de instalação da base (3.7) e ativação do totem (4.1) por equipe.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Obras no período</div>
            <div className="text-2xl font-bold mt-1">{kpis.total}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">3.7 Base</div>
            <div className="text-2xl font-bold mt-1 text-orange-600">{kpis.bases}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">4.1 Totem</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{kpis.totens}</div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Equipes empenhadas</div>
            <div className="text-2xl font-bold mt-1">{kpis.equipes}</div>
          </CardContent></Card>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="semana">Semana</TabsTrigger>
                <TabsTrigger value="mes">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setCursor(view === 'semana' ? subDays(cursor, 7) : addMonths(cursor, -1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button>
              <Button variant="outline" size="icon" onClick={() => setCursor(view === 'semana' ? addDays(cursor, 7) : addMonths(cursor, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-sm font-medium ml-2">
              {view === 'semana'
                ? `${format(rangeStart, "dd 'de' MMM", { locale: ptBR })} — ${format(rangeEnd, "dd 'de' MMM yyyy", { locale: ptBR })}`
                : format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
            </div>

            <div className="ml-auto flex flex-wrap gap-2">
              <Input placeholder="Buscar contrato/cliente" className="w-56" value={busca} onChange={e => setBusca(e.target.value)} />
              <Select value={tipoServico} onValueChange={v => setTipoServico(v as any)}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos serviços</SelectItem>
                  <SelectItem value="3.7">3.7 Base</SelectItem>
                  <SelectItem value="4.1">4.1 Totem</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filial} onValueChange={setFilial}>
                <SelectTrigger className="w-32"><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas UF</SelectItem>
                  {filiais.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={instaladorFilter} onValueChange={setInstaladorFilter}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Instalador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos instaladores</SelectItem>
                  {instaladores.map(([id, nome]) => <SelectItem key={id} value={id}>{nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando agenda…</CardContent></Card>
        ) : view === 'semana' ? (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid" style={{ gridTemplateColumns: `180px repeat(${days.length}, 1fr)` }}>
                  <div className="p-2 border-b border-r text-xs font-semibold text-muted-foreground bg-muted/40">Instalador</div>
                  {days.map(d => (
                    <div key={d.toISOString()} className={cn(
                      "p-2 border-b text-xs font-semibold text-center bg-muted/40",
                      isSameDay(d, new Date()) && "bg-primary/10 text-primary"
                    )}>
                      <div>{format(d, 'EEE', { locale: ptBR })}</div>
                      <div className="text-sm">{format(d, 'dd/MM')}</div>
                    </div>
                  ))}

                  {instaladoresNoRange.length === 0 && (
                    <div className="col-span-full p-8 text-center text-muted-foreground text-sm">
                      Nenhum evento no período selecionado.
                    </div>
                  )}

                  {instaladoresNoRange.map(([id, nome]) => (
                    <div key={id} className="contents">
                      <div className="p-2 border-b border-r text-sm font-medium flex items-center gap-2 bg-muted/20">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate">{nome}</span>
                      </div>
                      {days.map(d => {
                        const dayEvents = filtered.filter(e =>
                          (e.instaladorId || SEM_EQUIPE_ID) === id && isSameDay(e.date, d)
                        );
                        return (
                          <div key={d.toISOString()} className={cn(
                            "border-b border-l min-h-[80px] p-1 space-y-1",
                            isSameDay(d, new Date()) && "bg-primary/5"
                          )}>
                            {dayEvents.map((ev, i) => (
                              <button
                                key={i}
                                onClick={() => navigate(`/startup-projetos/${ev.projectId}/execucao`)}
                                className={cn(
                                  "w-full text-left border rounded px-1.5 py-1 text-[11px] leading-tight transition-colors",
                                  eventColor(ev.tipo)
                                )}
                                title={`${ev.tipoLabel} • ${ev.cliente}`}
                              >
                                <div className="font-semibold">{ev.tipo} · {ev.contrato}</div>
                                <div className="truncate">{ev.cliente}</div>
                                {ev.cidade && <div className="truncate opacity-80">{ev.cidade}/{ev.estado}</div>}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <MonthView events={filtered} monthCursor={cursor} onOpen={id => navigate(`/startup-projetos/${id}/execucao`)} eventColor={eventColor} />
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded border bg-orange-500/40 border-orange-500/60" />
            3.7 Instalação da Base
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded border bg-blue-500/40 border-blue-500/60" />
            4.1 Ativação do Totem
          </div>
        </div>
      </div>
    </Layout>
  );
}

function MonthView({
  events, monthCursor, onOpen, eventColor,
}: {
  events: AgendaEvent[];
  monthCursor: Date;
  onOpen: (projectId: string) => void;
  eventColor: (t: ServiceType) => string;
}) {
  const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 });
  const days: Date[] = [];
  let d = start;
  while (d <= end) { days.push(d); d = addDays(d, 1); }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 text-xs font-semibold text-muted-foreground bg-muted/40">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(l => (
            <div key={l} className="p-2 text-center border-b">{l}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(day => {
            const dayEvents = events.filter(e => isSameDay(e.date, day));
            const inMonth = day.getMonth() === monthCursor.getMonth();
            return (
              <div key={day.toISOString()} className={cn(
                "min-h-[110px] border-b border-r p-1 text-xs",
                !inMonth && "bg-muted/20 text-muted-foreground",
                isSameDay(day, new Date()) && "bg-primary/5"
              )}>
                <div className="text-right font-medium mb-1">{format(day, 'dd')}</div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 4).map((ev, i) => (
                    <button
                      key={i}
                      onClick={() => onOpen(ev.projectId)}
                      className={cn(
                        "w-full text-left border rounded px-1 py-0.5 text-[10px] leading-tight",
                        eventColor(ev.tipo)
                      )}
                      title={`${ev.tipoLabel} • ${ev.cliente} • ${ev.instaladorNome}`}
                    >
                      <span className="font-semibold">{ev.tipo}</span> {ev.contrato} · {ev.instaladorNome.split(' ')[0]}
                    </button>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 4} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
