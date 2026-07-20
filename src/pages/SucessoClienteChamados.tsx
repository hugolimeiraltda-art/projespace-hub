import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, ArrowLeft, Loader2, ExternalLink, Plus, User, Phone, Mail, Calendar, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FilialMultiSelect } from '@/components/FilialMultiSelect';

interface CustomerPortfolioRef {
  id?: string;
  razao_social: string;
  contrato: string;
  filial?: string | null;
  mensalidade?: number | null;
  data_ativacao?: string | null;
  data_termino?: string | null;
}

interface Comentario {
  id?: string;
  texto: string;
  autor: string;
  data: string;
}

interface Chamado {
  id: string;
  customer_id: string;
  assunto: string;
  descricao?: string | null;
  prioridade: string;
  status: string;
  created_at: string;
  created_by_name?: string | null;
  comentarios?: Comentario[] | null;
  customer_portfolio?: CustomerPortfolioRef;
}

interface Administrador {
  id: string;
  tipo: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
}

interface Pendencia {
  id: string;
  numero_os: string;
  tipo: string;
  setor: string;
  descricao?: string | null;
  status: string;
  data_abertura: string;
}

export default function SucessoClienteChamados() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialFilter, setFilialFilter] = useState<string[]>([]);

  // Detail dialog state
  const [selected, setSelected] = useState<Chamado | null>(null);
  const [admins, setAdmins] = useState<Administrador[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [novoComentario, setNovoComentario] = useState('');
  const [savingComentario, setSavingComentario] = useState(false);
  const [statusEdit, setStatusEdit] = useState<string>('aberto');
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => { fetchChamados(); }, []);

  const fetchChamados = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_chamados')
        .select('*, customer_portfolio(id, razao_social, contrato, filial, mensalidade, data_ativacao, data_termino)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setChamados((data as any) || []);
    } catch (error) {
      console.error('Error fetching chamados:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar chamados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (chamado: Chamado) => {
    setSelected(chamado);
    setStatusEdit(chamado.status);
    setNovoComentario('');
    setLoadingDetail(true);
    setAdmins([]);
    setPendencias([]);
    try {
      const [adminRes, pendRes] = await Promise.all([
        supabase.from('customer_administradores').select('id, tipo, nome, email, telefone').eq('customer_id', chamado.customer_id),
        supabase.from('manutencao_pendencias').select('id, numero_os, tipo, setor, descricao, status, data_abertura').eq('customer_id', chamado.customer_id).neq('status', 'CONCLUIDO').order('data_abertura', { ascending: false }),
      ]);
      if (!adminRes.error) setAdmins((adminRes.data as any) || []);
      if (!pendRes.error) setPendencias((pendRes.data as any) || []);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddComentario = async () => {
    if (!selected || !novoComentario.trim()) return;
    setSavingComentario(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const autor = userData.user?.user_metadata?.nome || userData.user?.email || 'Sistema';
      const novo: Comentario = {
        id: crypto.randomUUID(),
        texto: novoComentario.trim(),
        autor,
        data: new Date().toISOString(),
      };
      const atualizados = [...(selected.comentarios || []), novo];
      const { error } = await supabase
        .from('customer_chamados')
        .update({ comentarios: atualizados as any })
        .eq('id', selected.id);
      if (error) throw error;
      setSelected({ ...selected, comentarios: atualizados });
      setChamados(prev => prev.map(c => c.id === selected.id ? { ...c, comentarios: atualizados } : c));
      setNovoComentario('');
      toast({ title: 'Comentário adicionado' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Não foi possível salvar o comentário', variant: 'destructive' });
    } finally {
      setSavingComentario(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!selected || statusEdit === selected.status) return;
    setSavingStatus(true);
    try {
      const { error } = await supabase
        .from('customer_chamados')
        .update({ status: statusEdit })
        .eq('id', selected.id);
      if (error) throw error;
      setSelected({ ...selected, status: statusEdit });
      setChamados(prev => prev.map(c => c.id === selected.id ? { ...c, status: statusEdit } : c));
      toast({ title: 'Status atualizado' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Não foi possível atualizar o status', variant: 'destructive' });
    } finally {
      setSavingStatus(false);
    }
  };

  const allFiliais = useMemo(() =>
    [...new Set(chamados.map(c => c.customer_portfolio?.filial).filter((f): f is string => !!f))].sort(),
    [chamados]);

  const filteredChamados = useMemo(() =>
    chamados.filter(c => filialFilter.length === 0 || (c.customer_portfolio?.filial && filialFilter.includes(c.customer_portfolio.filial))),
    [chamados, filialFilter]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try { return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '-'; }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try { return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return '-'; }
  };

  const formatMoney = (v?: number | null) =>
    v == null ? '-' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const getPrioridadeBadge = (prioridade: string) => {
    const colors: Record<string, string> = { baixa: 'bg-gray-500', media: 'bg-yellow-500', alta: 'bg-orange-500', urgente: 'bg-red-500' };
    return <Badge className={colors[prioridade] || 'bg-gray-500'}>{prioridade}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = { aberto: 'bg-red-500', em_andamento: 'bg-yellow-500', resolvido: 'bg-green-500' };
    const labels: Record<string, string> = { aberto: 'Aberto', em_andamento: 'Em Andamento', resolvido: 'Resolvido' };
    return <Badge className={colors[status] || 'bg-gray-500'}>{labels[status] || status}</Badge>;
  };

  const terminoEfetivo = (c?: CustomerPortfolioRef) => {
    if (!c) return null;
    if (c.data_termino) return c.data_termino;
    if (c.data_ativacao) return addMonths(new Date(c.data_ativacao), 36).toISOString();
    return null;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/sucesso-cliente')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-orange-500" />
                Chamados / Reclamações
              </h1>
              <p className="text-muted-foreground">Visualize e gerencie todos os chamados de clientes</p>
            </div>
          </div>
          <Button onClick={() => navigate('/sucesso-cliente')}>
            <Plus className="w-4 h-4 mr-1" /> Novo Chamado
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <FilialMultiSelect filiais={allFiliais} selectedFiliais={filialFilter} onSelectionChange={setFilialFilter} />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{filteredChamados.filter(c => c.status === 'aberto').length}</p>
            <p className="text-sm text-muted-foreground">Abertos</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{filteredChamados.filter(c => c.status === 'em_andamento').length}</p>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{filteredChamados.filter(c => c.status === 'resolvido').length}</p>
            <p className="text-sm text-muted-foreground">Resolvidos</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{filteredChamados.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent></Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="abertos">
            <TabsList>
              <TabsTrigger value="abertos">Abertos ({filteredChamados.filter(c => c.status === 'aberto').length})</TabsTrigger>
              <TabsTrigger value="andamento">Em Andamento ({filteredChamados.filter(c => c.status === 'em_andamento').length})</TabsTrigger>
              <TabsTrigger value="resolvidos">Resolvidos ({filteredChamados.filter(c => c.status === 'resolvido').length})</TabsTrigger>
              <TabsTrigger value="todos">Todos ({filteredChamados.length})</TabsTrigger>
            </TabsList>

            {['abertos', 'andamento', 'resolvidos', 'todos'].map(tab => {
              const rows = filteredChamados.filter(c =>
                tab === 'todos' ||
                (tab === 'abertos' && c.status === 'aberto') ||
                (tab === 'andamento' && c.status === 'em_andamento') ||
                (tab === 'resolvidos' && c.status === 'resolvido'));
              return (
                <TabsContent key={tab} value={tab}>
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Assunto</TableHead>
                          <TableHead>Prioridade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((chamado) => (
                          <TableRow key={chamado.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(chamado)}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{chamado.customer_portfolio?.razao_social}</p>
                                <p className="text-sm text-muted-foreground">{chamado.customer_portfolio?.contrato}</p>
                              </div>
                            </TableCell>
                            <TableCell>{chamado.assunto}</TableCell>
                            <TableCell>{getPrioridadeBadge(chamado.prioridade)}</TableCell>
                            <TableCell>{getStatusBadge(chamado.status)}</TableCell>
                            <TableCell>{formatDate(chamado.created_at)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/sucesso-cliente/cliente/${chamado.customer_id}`); }}>
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhum chamado encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              {selected?.assunto}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* Cliente */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{selected.customer_portfolio?.razao_social}</p>
                    <p className="text-sm text-muted-foreground">{selected.customer_portfolio?.contrato} · Filial {selected.customer_portfolio?.filial || '-'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/sucesso-cliente/cliente/${selected.customer_id}`)}>
                    <ExternalLink className="w-4 h-4 mr-1" /> Abrir cliente
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 text-sm">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Início:</span><span className="font-medium">{formatDate(selected.customer_portfolio?.data_ativacao)}</span></div>
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Término:</span><span className="font-medium">{formatDate(terminoEfetivo(selected.customer_portfolio))}</span></div>
                  <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Mensalidade:</span><span className="font-medium">{formatMoney(selected.customer_portfolio?.mensalidade)}</span></div>
                </div>
              </div>

              {/* Descrição inicial */}
              {selected.descricao && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase text-muted-foreground mb-2">Descrição inicial</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.descricao}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Aberto por {selected.created_by_name || '—'} em {formatDateTime(selected.created_at)}
                  </p>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select value={statusEdit} onValueChange={setStatusEdit}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleSaveStatus} disabled={savingStatus || statusEdit === selected.status}>
                  {savingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
                </Button>
                <div className="ml-auto">{getPrioridadeBadge(selected.prioridade)}</div>
              </div>

              {/* Administração / contatos */}
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Administração do Condomínio</p>
                {loadingDetail ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : admins.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {admins.map(a => (
                      <div key={a.id} className="flex flex-wrap items-center gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                        <Badge variant="outline">{a.tipo}</Badge>
                        <span className="font-medium">{a.nome}</span>
                        {a.telefone && <span className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{a.telefone}</span>}
                        {a.email && <span className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{a.email}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pendências */}
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Pendências em aberto ({pendencias.length})</p>
                {loadingDetail ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                ) : pendencias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma pendência em aberto.</p>
                ) : (
                  <div className="space-y-2">
                    {pendencias.map(p => (
                      <div key={p.id} className="text-sm border-b last:border-0 pb-2 last:pb-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{p.numero_os}</Badge>
                          <Badge variant="outline">{p.tipo}</Badge>
                          <span className="text-muted-foreground">· {p.setor}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{formatDate(p.data_abertura)}</span>
                        </div>
                        {p.descricao && <p className="text-muted-foreground mt-1">{p.descricao}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comentários / negociação */}
              <div className="rounded-lg border p-4 space-y-3">
                <p className="text-xs uppercase text-muted-foreground">Comentários da negociação</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(selected.comentarios || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
                  ) : (
                    (selected.comentarios || []).map((c, i) => (
                      <div key={c.id || i} className="bg-muted/40 rounded p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{c.autor}</span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(c.data)}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{c.texto}</p>
                      </div>
                    ))
                  )}
                </div>
                <Textarea placeholder="Adicionar comentário sobre a negociação..." value={novoComentario} onChange={e => setNovoComentario(e.target.value)} rows={3} />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddComentario} disabled={savingComentario || !novoComentario.trim()}>
                    {savingComentario ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Adicionar comentário</>}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
