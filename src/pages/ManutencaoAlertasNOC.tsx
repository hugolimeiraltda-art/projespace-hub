import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Search, Eye, RefreshCw, Shield } from "lucide-react";
import { format } from "date-fns";

interface AlertaNOC {
  id: string;
  contrato: string;
  razao_social: string;
  customer_id: string | null;
  tipo_alerta: string;
  categoria: string | null;
  descricao: string | null;
  severidade: string;
  quantidade_ocorrencias: number;
  periodo_referencia: string | null;
  origem: string | null;
  dados_extras: any;
  resolvido: boolean;
  resolvido_at: string | null;
  resolvido_por: string | null;
  created_at: string;
}

const severidadeConfig: Record<string, { label: string; variant: "destructive" | "default" | "secondary" | "outline" }> = {
  critica: { label: "Crítica", variant: "destructive" },
  alta: { label: "Alta", variant: "destructive" },
  media: { label: "Média", variant: "default" },
  baixa: { label: "Baixa", variant: "secondary" },
};

export default function ManutencaoAlertasNOC() {
  const { user } = useAuth();
  const [alertas, setAlertas] = useState<AlertaNOC[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroSeveridade, setFiltroSeveridade] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("abertos");
  const [selectedAlerta, setSelectedAlerta] = useState<AlertaNOC | null>(null);
  const [resolverDialogOpen, setResolverDialogOpen] = useState(false);
  const [resolverObs, setResolverObs] = useState("");

  const fetchAlertas = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("noc_alertas_reincidencia" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (filtroStatus === "abertos") {
        query = query.eq("resolvido", false);
      } else if (filtroStatus === "resolvidos") {
        query = query.eq("resolvido", true);
      }

      if (filtroSeveridade !== "todos") {
        query = query.eq("severidade", filtroSeveridade);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlertas((data as any[]) || []);
    } catch (err: any) {
      toast.error("Erro ao carregar alertas: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
  }, [filtroSeveridade, filtroStatus]);

  const handleResolver = async () => {
    if (!selectedAlerta) return;
    try {
      const { error } = await supabase
        .from("noc_alertas_reincidencia" as any)
        .update({
          resolvido: true,
          resolvido_at: new Date().toISOString(),
          resolvido_por: (user as any)?.user_metadata?.nome || "Usuário",
        } as any)
        .eq("id", selectedAlerta.id);

      if (error) throw error;
      toast.success("Alerta marcado como resolvido");
      setResolverDialogOpen(false);
      setSelectedAlerta(null);
      setResolverObs("");
      fetchAlertas();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const filtered = alertas.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.razao_social.toLowerCase().includes(s) ||
      a.contrato.toLowerCase().includes(s) ||
      (a.descricao || "").toLowerCase().includes(s)
    );
  });

  const totalAbertos = alertas.filter((a) => !a.resolvido).length;
  const totalCriticos = alertas.filter((a) => !a.resolvido && (a.severidade === "critica" || a.severidade === "alta")).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-destructive" />
              Alertas NOC - Clientes Ofensores
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Alertas de reincidência recebidos do Eixo NOC
            </p>
          </div>
          <Button onClick={fetchAlertas} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Alertas Abertos</p>
                <p className="text-2xl font-bold">{totalAbertos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Críticos / Alta</p>
                <p className="text-2xl font-bold">{totalCriticos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Recebidos</p>
                <p className="text-2xl font-bold">{alertas.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, contrato ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filtroSeveridade} onValueChange={setFiltroSeveridade}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="abertos">Abertos</SelectItem>
                  <SelectItem value="resolvidos">Resolvidos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead className="text-center">Ocorrências</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                   <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                   <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhum alerta encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((alerta) => {
                    const sev = severidadeConfig[alerta.severidade] || severidadeConfig.media;
                    return (
                      <TableRow key={alerta.id} className={alerta.resolvido ? "opacity-60" : ""}>
                        <TableCell className="text-sm">
                          {format(new Date(alerta.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{alerta.contrato}</TableCell>
                        <TableCell className="font-medium">{alerta.razao_social}</TableCell>
                        <TableCell className="text-sm">{alerta.categoria || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={sev.variant}>{sev.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {alerta.quantidade_ocorrencias}
                        </TableCell>
                        <TableCell className="text-sm">{alerta.periodo_referencia || "-"}</TableCell>
                        <TableCell>
                          {alerta.resolvido ? (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              Resolvido
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Aberto</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedAlerta(alerta)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!alerta.resolvido && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAlerta(alerta);
                                  setResolverDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAlerta && !resolverDialogOpen} onOpenChange={() => setSelectedAlerta(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Alerta</DialogTitle>
          </DialogHeader>
          {selectedAlerta && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Contrato</p>
                  <p className="font-mono font-medium">{selectedAlerta.contrato}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedAlerta.razao_social}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Severidade</p>
                  <Badge variant={severidadeConfig[selectedAlerta.severidade]?.variant || "default"}>
                    {severidadeConfig[selectedAlerta.severidade]?.label || selectedAlerta.severidade}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Ocorrências</p>
                  <p className="font-bold text-lg">{selectedAlerta.quantidade_ocorrencias}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Categoria</p>
                  <p>{selectedAlerta.categoria || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Período</p>
                  <p>{selectedAlerta.periodo_referencia || "-"}</p>
                </div>
              </div>
              {selectedAlerta.descricao && (
                <div>
                  <p className="text-muted-foreground">Descrição</p>
                  <p className="bg-muted p-2 rounded">{selectedAlerta.descricao}</p>
                </div>
              )}
              {selectedAlerta.resolvido && (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground">Resolvido por</p>
                  <p>{selectedAlerta.resolvido_por} em {selectedAlerta.resolvido_at ? format(new Date(selectedAlerta.resolvido_at), "dd/MM/yyyy HH:mm") : "-"}</p>
                </div>
              )}
              {selectedAlerta.dados_extras && Object.keys(selectedAlerta.dados_extras).length > 0 && (
                <div>
                  <p className="text-muted-foreground">Dados Extras</p>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(selectedAlerta.dados_extras, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolver Dialog */}
      <Dialog open={resolverDialogOpen} onOpenChange={setResolverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Alerta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Marcar o alerta de <strong>{selectedAlerta?.razao_social}</strong> como resolvido?
          </p>
          <Textarea
            placeholder="Observações (opcional)..."
            value={resolverObs}
            onChange={(e) => setResolverObs(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolverDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleResolver}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
