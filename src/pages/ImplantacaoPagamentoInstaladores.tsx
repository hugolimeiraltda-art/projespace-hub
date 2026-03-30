import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { DollarSign, Search, Eye, CheckCircle2, Clock, Building, List, ChevronDown, ChevronUp, Pencil, Save, X, History, Package, Boxes } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PontuacaoItem {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string;
  subgrupo: string | null;
  pontuacao: number;
  historico_alteracoes?: { user_name: string; alteracao: string; data: string }[];
  tipo: 'produto' | 'kit';
}

interface PagamentoProject {
  id: string;
  project_id: string;
  cliente_condominio_nome: string;
  cliente_cidade: string | null;
  cliente_estado: string | null;
  numero_projeto: number;
  pagamento_instalacao_pontuacao: number | null;
  pagamento_instalacao_infra: number | null;
  pagamento_instalacao_deslocamento: number | null;
  pagamento_instalacao_pedagio: number | null;
  pagamento_instalacao_diaria: number | null;
  pagamento_instalacao_conferido: boolean;
  pagamento_instalacao_conferido_at: string | null;
}

export default function ImplantacaoPagamentoInstaladores() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<PagamentoProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'conferido' | 'pendente'>('todos');
  const [showTabelaPontuacao, setShowTabelaPontuacao] = useState(false);
  const [produtosPontuacao, setProdutosPontuacao] = useState<PontuacaoItem[]>([]);
  const [kitsPontuacao, setKitsPontuacao] = useState<PontuacaoItem[]>([]);
  const [searchPontuacao, setSearchPontuacao] = useState('');
  const [loadingPontuacao, setLoadingPontuacao] = useState(false);
  const [tabelaTab, setTabelaTab] = useState<'produtos' | 'kits'>('produtos');
  const [editingPontuacao, setEditingPontuacao] = useState<Record<string, string>>({});
  const [savingPontuacao, setSavingPontuacao] = useState<string | null>(null);
  const [historicoDialog, setHistoricoDialog] = useState<PontuacaoItem | null>(null);

  const startEditPontuacao = (p: PontuacaoItem) => {
    setEditingPontuacao(prev => ({ ...prev, [p.id]: String(p.pontuacao) }));
  };

  const cancelEditPontuacao = (id: string) => {
    setEditingPontuacao(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const savePontuacao = async (p: PontuacaoItem) => {
    const newVal = parseFloat(editingPontuacao[p.id]);
    if (isNaN(newVal) || newVal === p.pontuacao) {
      cancelEditPontuacao(p.id);
      return;
    }
    setSavingPontuacao(p.id);
    try {
      const historico = [...(p.historico_alteracoes || [])];
      historico.unshift({
        user_name: user?.nome || 'Desconhecido',
        alteracao: `Pontuação: ${p.pontuacao} → ${newVal}`,
        data: new Date().toISOString(),
      });

      const tableName = p.tipo === 'kit' ? 'orcamento_kits' : 'orcamento_produtos';
      const updateData: any = {
        pontuacao: newVal,
        historico_alteracoes: historico.slice(0, 50) as any,
      };
      if (p.tipo === 'produto') {
        updateData.updated_by = user?.id;
        updateData.updated_by_name = user?.nome;
      }
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', p.id);

      if (error) throw error;

      const updateList = p.tipo === 'kit' ? setKitsPontuacao : setProdutosPontuacao;
      updateList(prev =>
        prev.map(item => item.id === p.id ? { ...item, pontuacao: newVal, historico_alteracoes: historico.slice(0, 50) } : item)
      );
      cancelEditPontuacao(p.id);
      toast({ title: 'Pontuação atualizada', description: `${p.nome}: ${p.pontuacao} → ${newVal}` });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSavingPontuacao(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get projects in execution
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado')
        .eq('sale_status', 'CONCLUIDO')
        .in('implantacao_status', ['EM_EXECUCAO', 'CONCLUIDO_IMPLANTACAO']);

      if (!projectsData || projectsData.length === 0) {
        setProjects([]);
        return;
      }

      const projectIds = projectsData.map(p => p.id);

      const { data: etapasData } = await supabase
        .from('implantacao_etapas')
        .select('project_id, pagamento_instalacao_pontuacao, pagamento_instalacao_infra, pagamento_instalacao_deslocamento, pagamento_instalacao_pedagio, pagamento_instalacao_diaria, pagamento_instalacao_conferido, pagamento_instalacao_conferido_at, id')
        .in('project_id', projectIds);

      const etapasMap: Record<string, any> = {};
      etapasData?.forEach(e => {
        etapasMap[e.project_id] = e;
      });

      const merged: PagamentoProject[] = projectsData.map(p => ({
        id: etapasMap[p.id]?.id || '',
        project_id: p.id,
        cliente_condominio_nome: p.cliente_condominio_nome,
        cliente_cidade: p.cliente_cidade,
        cliente_estado: p.cliente_estado,
        numero_projeto: p.numero_projeto,
        pagamento_instalacao_pontuacao: etapasMap[p.id]?.pagamento_instalacao_pontuacao ?? null,
        pagamento_instalacao_infra: etapasMap[p.id]?.pagamento_instalacao_infra ?? null,
        pagamento_instalacao_deslocamento: etapasMap[p.id]?.pagamento_instalacao_deslocamento ?? null,
        pagamento_instalacao_pedagio: etapasMap[p.id]?.pagamento_instalacao_pedagio ?? null,
        pagamento_instalacao_diaria: etapasMap[p.id]?.pagamento_instalacao_diaria ?? null,
        pagamento_instalacao_conferido: etapasMap[p.id]?.pagamento_instalacao_conferido ?? false,
        pagamento_instalacao_conferido_at: etapasMap[p.id]?.pagamento_instalacao_conferido_at ?? null,
      }));

      setProjects(merged);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.cliente_condominio_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(p.numero_projeto).includes(searchTerm);
    const matchStatus = filterStatus === 'todos' ||
      (filterStatus === 'conferido' && p.pagamento_instalacao_conferido) ||
      (filterStatus === 'pendente' && !p.pagamento_instalacao_conferido);
    return matchSearch && matchStatus;
  });

  const totalConferidos = projects.filter(p => p.pagamento_instalacao_conferido).length;
  const totalPendentes = projects.filter(p => !p.pagamento_instalacao_conferido).length;

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '—';
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <DollarSign className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Pagamento de Instaladores</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Acompanhe os valores de instalação por projeto: pontuação, infra, deslocamento, pedágio e diárias.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card
            className={cn("cursor-pointer transition-all hover:shadow-md", filterStatus === 'todos' && "ring-2 ring-primary")}
            onClick={() => setFilterStatus('todos')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{projects.length}</p>
                </div>
                <DollarSign className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn("cursor-pointer transition-all hover:shadow-md", filterStatus === 'conferido' && "ring-2 ring-green-500")}
            onClick={() => setFilterStatus('conferido')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conferidos</p>
                  <p className="text-2xl font-bold text-green-600">{totalConferidos}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn("cursor-pointer transition-all hover:shadow-md", filterStatus === 'pendente' && "ring-2 ring-amber-500")}
            onClick={() => setFilterStatus('pendente')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-600">{totalPendentes}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground">Ajuste os filtros de busca.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Condomínio</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Cidade</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Pontuação</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Infra</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Desloc.</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Pedágio</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Diária</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.project_id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground">{p.numero_projeto}</td>
                      <td className="p-3 font-medium">{p.cliente_condominio_nome}</td>
                      <td className="p-3 text-muted-foreground">
                        {p.cliente_cidade}{p.cliente_estado ? `, ${p.cliente_estado}` : ''}
                      </td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.pagamento_instalacao_pontuacao)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.pagamento_instalacao_infra)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.pagamento_instalacao_deslocamento)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.pagamento_instalacao_pedagio)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.pagamento_instalacao_diaria)}</td>
                      <td className="p-3 text-center">
                        {p.pagamento_instalacao_conferido ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300 border">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Conferido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-700 border-amber-300">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/startup-projetos/${p.project_id}/execucao`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Tabela de Instalação */}
        <div className="mt-8">
          <Button
            variant="outline"
            className="w-full flex items-center justify-between py-4 text-left"
            onClick={async () => {
              const next = !showTabelaPontuacao;
              setShowTabelaPontuacao(next);
              if (next && produtosPontuacao.length === 0 && kitsPontuacao.length === 0) {
                setLoadingPontuacao(true);
                const [prodRes, kitRes] = await Promise.all([
                  supabase.from('orcamento_produtos').select('id, codigo, nome, categoria, subgrupo, pontuacao, historico_alteracoes').eq('ativo', true).order('nome'),
                  supabase.from('orcamento_kits').select('id, codigo, nome, categoria, pontuacao, historico_alteracoes').eq('ativo', true).order('nome'),
                ]);
                setProdutosPontuacao((prodRes.data || []).map(p => ({ ...p, pontuacao: (p as any).pontuacao ?? 0, historico_alteracoes: (p as any).historico_alteracoes || [], tipo: 'produto' as const })));
                setKitsPontuacao((kitRes.data || []).map(k => ({ ...k, codigo: (k as any).codigo || null, subgrupo: null, pontuacao: (k as any).pontuacao ?? 0, historico_alteracoes: (k as any).historico_alteracoes || [], tipo: 'kit' as const })));
                setLoadingPontuacao(false);
              }
            }}
          >
            <div className="flex items-center gap-2">
              <List className="w-5 h-5 text-primary" />
              <span className="text-base font-semibold">Tabela de Instalação — Pontuação por Produto e Kit</span>
            </div>
            {showTabelaPontuacao ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>

          {showTabelaPontuacao && (
            <Card className="mt-2">
              <CardContent className="pt-4">
                <Tabs value={tabelaTab} onValueChange={(v) => setTabelaTab(v as any)}>
                  <div className="flex items-center justify-between mb-4">
                    <TabsList>
                      <TabsTrigger value="produtos" className="gap-1.5">
                        <Package className="w-4 h-4" />
                        Produtos ({produtosPontuacao.length})
                      </TabsTrigger>
                      <TabsTrigger value="kits" className="gap-1.5">
                        <Boxes className="w-4 h-4" />
                        Kits ({kitsPontuacao.length})
                      </TabsTrigger>
                    </TabsList>
                    <div className="relative max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nome ou código..."
                        value={searchPontuacao}
                        onChange={(e) => setSearchPontuacao(e.target.value)}
                        className="pl-10 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Valor do ponto: <span className="font-semibold text-foreground">R$ 19,00</span>
                  </div>
                  {loadingPontuacao ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                    </div>
                  ) : (
                    <>
                      <TabsContent value="produtos" className="mt-0">
                        {renderPontuacaoTable(produtosPontuacao, true)}
                      </TabsContent>
                      <TabsContent value="kits" className="mt-0">
                        {renderPontuacaoTable(kitsPontuacao, false)}
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Histórico Dialog */}
        <Dialog open={!!historicoDialog} onOpenChange={() => setHistoricoDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-sm">Histórico — {historicoDialog?.nome}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {historicoDialog?.historico_alteracoes?.map((h, i) => (
                <div key={i} className="text-xs border rounded p-2 bg-muted/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-foreground">{h.user_name}</span>
                    <span className="text-muted-foreground">{new Date(h.data).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-muted-foreground">{h.alteracao}</p>
                </div>
              ))}
              {(!historicoDialog?.historico_alteracoes || historicoDialog.historico_alteracoes.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico registrado.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
