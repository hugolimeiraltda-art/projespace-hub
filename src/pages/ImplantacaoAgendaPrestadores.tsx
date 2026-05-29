import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar as CalendarIcon, HardHat, MapPin, Building, List, BarChart3 } from "lucide-react";
import { format, parseISO, startOfDay, addDays, isSameDay, differenceInCalendarDays, eachDayOfInterval, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Prestador {
  id: string;
  nome: string;
  empresa: string[] | null;
  praca: string[] | null;
}

interface AgendaItem {
  projectId: string;
  numero: number;
  cliente: string;
  cidade: string | null;
  estado: string | null;
  prestadorId: string;
  prestadorNome: string;
  prestadorEmpresa: string | null;
  data: string; // ISO date (yyyy-MM-dd)
  tipo: "Visita Startup (PCI)" | "Onboarding PPE" | "Instalação PPE";
}

export default function ImplantacaoAgendaPrestadores() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [items, setItems] = useState<AgendaItem[]>([]);

  // filters
  const today = format(new Date(), "yyyy-MM-dd");
  const in30 = format(addDays(new Date(), 60), "yyyy-MM-dd");
  const [dataIni, setDataIni] = useState(today);
  const [dataFim, setDataFim] = useState(in30);
  const [prestadorFiltro, setPrestadorFiltro] = useState<string>("todos");
  const [pracaFiltro, setPracaFiltro] = useState<string>("todas");
  const [viewMode, setViewMode] = useState<"lista" | "gantt">("gantt");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [prestRes, etapasRes] = await Promise.all([
        supabase.from("prestadores").select("id, nome, empresa, praca").eq("ativo", true).order("nome"),
        supabase
          .from("implantacao_etapas")
          .select(
            `id, project_id, ppe_equipe_prestador_id,
             agendamento_visita_startup_data,
             ppe_agendamento_base_data,
             ppe_execucao_base_data,
             projects:project_id ( id, numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado ),
             prestadores:ppe_equipe_prestador_id ( id, nome, empresa )`
          )
          .not("ppe_equipe_prestador_id", "is", null),
      ]);

      if (prestRes.error) throw prestRes.error;
      if (etapasRes.error) throw etapasRes.error;

      setPrestadores((prestRes.data || []) as Prestador[]);

      const list: AgendaItem[] = [];
      for (const row of (etapasRes.data || []) as any[]) {
        const p = row.projects;
        const pr = row.prestadores;
        if (!p || !pr) continue;
        const base = {
          projectId: p.id,
          numero: p.numero_projeto,
          cliente: p.cliente_condominio_nome,
          cidade: p.cliente_cidade,
          estado: p.cliente_estado,
          prestadorId: pr.id,
          prestadorNome: pr.nome,
          prestadorEmpresa: Array.isArray(pr.empresa) ? pr.empresa.join(", ") : null,
        };
        if (row.agendamento_visita_startup_data) {
          list.push({ ...base, data: row.agendamento_visita_startup_data, tipo: "Visita Startup (PCI)" });
        }
        if (row.ppe_agendamento_base_data) {
          list.push({ ...base, data: row.ppe_agendamento_base_data, tipo: "Onboarding PPE" });
        }
        if (row.ppe_execucao_base_data) {
          list.push({ ...base, data: row.ppe_execucao_base_data, tipo: "Instalação PPE" });
        }
      }
      setItems(list);
    } finally {
      setLoading(false);
    }
  }

  const pracasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    prestadores.forEach((p) => (p.praca || []).forEach((x) => set.add(x)));
    return Array.from(set).sort();
  }, [prestadores]);

  const filtrados = useMemo(() => {
    return items
      .filter((i) => i.data >= dataIni && i.data <= dataFim)
      .filter((i) => prestadorFiltro === "todos" || i.prestadorId === prestadorFiltro)
      .filter((i) => {
        if (pracaFiltro === "todas") return true;
        const pr = prestadores.find((p) => p.id === i.prestadorId);
        return pr?.praca?.includes(pracaFiltro);
      })
      .sort((a, b) => a.data.localeCompare(b.data) || a.prestadorNome.localeCompare(b.prestadorNome));
  }, [items, dataIni, dataFim, prestadorFiltro, pracaFiltro, prestadores]);

  const porDia = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const i of filtrados) {
      if (!map.has(i.data)) map.set(i.data, []);
      map.get(i.data)!.push(i);
    }
    return Array.from(map.entries());
  }, [filtrados]);

  const ocupacaoPorPrestador = useMemo(() => {
    const map = new Map<string, number>();
    filtrados.forEach((i) => map.set(i.prestadorId, (map.get(i.prestadorId) || 0) + 1));
    return Array.from(map.entries())
      .map(([id, count]) => ({
        id,
        nome: prestadores.find((p) => p.id === id)?.nome || "—",
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filtrados, prestadores]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary" /> Agenda de Prestadores
            </h1>
            <p className="text-sm text-muted-foreground">
              Veja onde cada prestador está empenhado nas obras de implantação.
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Data inicial</Label>
              <Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
            </div>
            <div>
              <Label>Data final</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div>
              <Label>Prestador</Label>
              <Select value={prestadorFiltro} onValueChange={setPrestadorFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {prestadores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Praça</Label>
              <Select value={pracaFiltro} onValueChange={setPracaFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {pracasDisponiveis.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Resumo de ocupação */}
        {ocupacaoPorPrestador.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardHat className="w-4 h-4" /> Ocupação no período ({filtrados.length} agendamentos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ocupacaoPorPrestador.map((o) => (
                  <Badge key={o.id} variant="secondary" className="text-sm py-1.5 px-3">
                    {o.nome} <span className="ml-2 font-bold text-primary">{o.count}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toggle de visualização */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "lista" | "gantt")}>
          <TabsList>
            <TabsTrigger value="lista"><List className="w-4 h-4 mr-1" /> Lista</TabsTrigger>
            <TabsTrigger value="gantt"><BarChart3 className="w-4 h-4 mr-1" /> Gantt</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Conteúdo */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : filtrados.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum agendamento encontrado no período / filtros selecionados.
            </CardContent>
          </Card>
        ) : viewMode === "gantt" ? (
          <GanttView
            items={filtrados}
            dataIni={dataIni}
            dataFim={dataFim}
            onSelect={(pid) => navigate(`/startup-projetos/${pid}/execucao`)}
          />
        ) : (
          porDia.map(([dia, lista]) => {
            const date = parseISO(dia);
            const isToday = isSameDay(date, startOfDay(new Date()));
            return (
              <Card key={dia} className={isToday ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    {isToday && <Badge>Hoje</Badge>}
                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                      {lista.length} agendamento{lista.length !== 1 ? "s" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lista.map((i, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(`/startup-projetos/${i.projectId}/execucao`)}
                      className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">#{i.numero}</Badge>
                            <Badge
                              variant={i.tipo.includes("PCI") ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {i.tipo}
                            </Badge>
                          </div>
                          <p className="font-medium mt-1 truncate">{i.cliente}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            {(i.cidade || i.estado) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {[i.cidade, i.estado].filter(Boolean).join(", ")}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <HardHat className="w-3 h-3" />
                              {i.prestadorNome}
                              {i.prestadorEmpresa && (
                                <span className="text-muted-foreground/70"> — {i.prestadorEmpresa}</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============ Gantt View ============
const TIPO_COLOR: Record<string, string> = {
  "Visita Startup (PCI)": "bg-primary",
  "Onboarding PPE": "bg-blue-500",
  "Instalação PPE": "bg-emerald-500",
};

function GanttView({
  items,
  dataIni,
  dataFim,
  onSelect,
}: {
  items: AgendaItem[];
  dataIni: string;
  dataFim: string;
  onSelect: (projectId: string) => void;
}) {
  const days = useMemo(
    () => eachDayOfInterval({ start: parseISO(dataIni), end: parseISO(dataFim) }),
    [dataIni, dataFim]
  );
  const COL = 36; // px por dia
  const LABEL_W = 280;

  // Agrupa por projeto+prestador -> uma linha (barra) por instalação
  const rows = useMemo(() => {
    const map = new Map<string, { key: string; project: AgendaItem; events: AgendaItem[] }>();
    for (const it of items) {
      const k = `${it.projectId}__${it.prestadorId}`;
      if (!map.has(k)) map.set(k, { key: k, project: it, events: [] });
      map.get(k)!.events.push(it);
    }
    return Array.from(map.values()).sort((a, b) => {
      const da = a.events.map((e) => e.data).sort()[0];
      const db = b.events.map((e) => e.data).sort()[0];
      return da.localeCompare(db);
    });
  }, [items]);

  const today = startOfDay(new Date());
  const todayIdx = days.findIndex((d) => isSameDay(d, today));
  const width = days.length * COL;

  return (
    <TooltipProvider delayDuration={150}>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <div style={{ minWidth: LABEL_W + width }}>
            {/* Cabeçalho com datas */}
            <div className="flex sticky top-0 z-10 bg-card border-b">
              <div
                className="shrink-0 p-2 text-xs font-semibold text-muted-foreground border-r"
                style={{ width: LABEL_W }}
              >
                Instalação / Prestador
              </div>
              <div className="relative flex" style={{ width }}>
                {days.map((d, idx) => {
                  const isHoje = todayIdx === idx;
                  const wknd = isWeekend(d);
                  const firstOfMonth = d.getDate() === 1 || idx === 0;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "shrink-0 text-center text-[10px] py-1 border-r",
                        wknd && "bg-muted/40",
                        isHoje && "bg-primary/10"
                      )}
                      style={{ width: COL }}
                    >
                      {firstOfMonth && (
                        <div className="text-[9px] font-semibold text-primary uppercase">
                          {format(d, "MMM", { locale: ptBR })}
                        </div>
                      )}
                      <div className={cn("font-medium", isHoje && "text-primary")}>
                        {format(d, "dd")}
                      </div>
                      <div className="text-muted-foreground">
                        {format(d, "EEEEE", { locale: ptBR })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Linhas */}
            {rows.map((row) => {
              const eventDates = row.events.map((e) => parseISO(e.data)).sort((a, b) => +a - +b);
              const startIdx = differenceInCalendarDays(eventDates[0], parseISO(dataIni));
              const endIdx = differenceInCalendarDays(eventDates[eventDates.length - 1], parseISO(dataIni));
              const barLeft = Math.max(0, startIdx) * COL;
              const barWidth = Math.max(COL, (endIdx - Math.max(0, startIdx) + 1) * COL);

              return (
                <div key={row.key} className="flex border-b hover:bg-accent/30 transition-colors">
                  <button
                    onClick={() => onSelect(row.project.projectId)}
                    className="shrink-0 p-2 text-left border-r hover:bg-accent/60"
                    style={{ width: LABEL_W }}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        #{row.project.numero}
                      </Badge>
                      <span className="text-sm font-medium truncate">{row.project.cliente}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                      <HardHat className="w-3 h-3" />
                      {row.project.prestadorNome}
                      {(row.project.cidade || row.project.estado) && (
                        <span className="ml-1">
                          • {[row.project.cidade, row.project.estado].filter(Boolean).join(", ")}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="relative" style={{ width, height: 56 }}>
                    {/* Grid de fundo */}
                    {days.map((d, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "absolute top-0 bottom-0 border-r",
                          isWeekend(d) && "bg-muted/30",
                          todayIdx === idx && "bg-primary/10"
                        )}
                        style={{ left: idx * COL, width: COL }}
                      />
                    ))}

                    {/* Barra do período */}
                    {endIdx >= 0 && startIdx < days.length && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-2 rounded bg-muted-foreground/20"
                        style={{ left: barLeft, width: barWidth }}
                      />
                    )}

                    {/* Marcadores dos eventos */}
                    {row.events.map((ev, i) => {
                      const idx = differenceInCalendarDays(parseISO(ev.data), parseISO(dataIni));
                      if (idx < 0 || idx >= days.length) return null;
                      return (
                        <Tooltip key={i}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onSelect(ev.projectId)}
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 rounded-md shadow-sm hover:scale-110 transition-transform",
                                TIPO_COLOR[ev.tipo] || "bg-primary"
                              )}
                              style={{
                                left: idx * COL + 4,
                                width: COL - 8,
                                height: 24,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs space-y-0.5">
                              <p className="font-semibold">#{ev.numero} — {ev.cliente}</p>
                              <p>{ev.tipo}</p>
                              <p className="text-muted-foreground">
                                {format(parseISO(ev.data), "EEEE, dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-muted-foreground">
                                {ev.prestadorNome}
                                {ev.prestadorEmpresa && ` — ${ev.prestadorEmpresa}`}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
