import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquareWarning, Star, ClipboardCheck, ThumbsUp, Edit2, Trash2, Plus, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomerHistorySectionProps {
  customerId: string;
}

interface Chamado {
  id: string;
  assunto: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

interface NPS {
  id: string;
  nota: number;
  comentario: string | null;
  ponto_forte: string | null;
  ponto_fraco: string | null;
  created_at: string;
}

interface Satisfacao {
  id: string;
  tempo_implantacao: string | null;
  ambiente_organizado: string | null;
  pendencias: string | null;
  comunicacao: string | null;
  facilidade_app: string | null;
  funcionalidades_sindico: string | null;
  treinamento_adequado: string | null;
  expectativa_atendida: string | null;
  nota_nps: number | null;
  created_at: string;
}

interface Depoimento {
  id: string;
  texto: string;
  autor: string;
  cargo: string | null;
  tipo: string;
  created_at: string;
}

export function CustomerHistorySection({ customerId }: CustomerHistorySectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [npsRecords, setNpsRecords] = useState<NPS[]>([]);
  const [satisfacaoRecords, setSatisfacaoRecords] = useState<Satisfacao[]>([]);
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([]);

  // Edit dialogs
  const [editChamadoDialog, setEditChamadoDialog] = useState<Chamado | null>(null);
  const [editNpsDialog, setEditNpsDialog] = useState<NPS | null>(null);
  const [editSatisfacaoDialog, setEditSatisfacaoDialog] = useState<Satisfacao | null>(null);
  const [editDepoimentoDialog, setEditDepoimentoDialog] = useState<Depoimento | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [customerId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [chamadosRes, npsRes, satisfacaoRes, depoimentosRes] = await Promise.all([
        supabase.from('customer_chamados').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('customer_nps').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('customer_satisfacao').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('customer_depoimentos').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
      ]);

      setChamados(chamadosRes.data || []);
      setNpsRecords(npsRes.data || []);
      setSatisfacaoRecords(satisfacaoRes.data || []);
      setDepoimentos(depoimentosRes.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const handleDeleteChamado = async (id: string) => {
    if (!confirm('Deseja excluir este chamado?')) return;
    const { error } = await supabase.from('customer_chamados').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    } else {
      toast({ title: 'Excluído', description: 'Chamado excluído com sucesso.' });
      fetchAllData();
    }
  };

  const handleDeleteNps = async (id: string) => {
    if (!confirm('Deseja excluir este registro de NPS?')) return;
    const { error } = await supabase.from('customer_nps').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    } else {
      toast({ title: 'Excluído', description: 'NPS excluído com sucesso.' });
      fetchAllData();
    }
  };

  const handleDeleteSatisfacao = async (id: string) => {
    if (!confirm('Deseja excluir esta pesquisa de satisfação?')) return;
    const { error } = await supabase.from('customer_satisfacao').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    } else {
      toast({ title: 'Excluído', description: 'Pesquisa excluída com sucesso.' });
      fetchAllData();
    }
  };

  const handleDeleteDepoimento = async (id: string) => {
    if (!confirm('Deseja excluir este depoimento?')) return;
    const { error } = await supabase.from('customer_depoimentos').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' });
    } else {
      toast({ title: 'Excluído', description: 'Depoimento excluído com sucesso.' });
      fetchAllData();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico do Cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chamados">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chamados" className="flex items-center gap-1">
              <MessageSquareWarning className="w-4 h-4" /> Reclamações ({chamados.length})
            </TabsTrigger>
            <TabsTrigger value="nps" className="flex items-center gap-1">
              <Star className="w-4 h-4" /> NPS ({npsRecords.length})
            </TabsTrigger>
            <TabsTrigger value="satisfacao" className="flex items-center gap-1">
              <ClipboardCheck className="w-4 h-4" /> Satisfação ({satisfacaoRecords.length})
            </TabsTrigger>
            <TabsTrigger value="depoimentos" className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" /> Depoimentos ({depoimentos.length})
            </TabsTrigger>
          </TabsList>

          {/* Chamados Tab */}
          <TabsContent value="chamados">
            {chamados.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma reclamação registrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chamados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-sm">{formatDate(c.created_at)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{c.assunto}</p>
                        {c.descricao && <p className="text-sm text-muted-foreground truncate max-w-xs">{c.descricao}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.prioridade === 'urgente' ? 'destructive' : c.prioridade === 'alta' ? 'default' : 'secondary'}>
                          {c.prioridade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'resolvido' ? 'default' : 'outline'}>{c.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditChamadoDialog(c)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteChamado(c.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* NPS Tab */}
          <TabsContent value="nps">
            {npsRecords.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum NPS registrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Ponto Forte</TableHead>
                    <TableHead>Ponto Fraco</TableHead>
                    <TableHead>Comentário</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {npsRecords.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="text-sm">{formatDate(n.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={n.nota >= 9 ? 'bg-green-500' : n.nota >= 7 ? 'bg-yellow-500' : 'bg-red-500'}>
                          {n.nota}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-32 truncate">{n.ponto_forte || '-'}</TableCell>
                      <TableCell className="max-w-32 truncate">{n.ponto_fraco || '-'}</TableCell>
                      <TableCell className="max-w-40 truncate">{n.comentario || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditNpsDialog(n)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteNps(n.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Satisfação Tab */}
          <TabsContent value="satisfacao">
            {satisfacaoRecords.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma pesquisa de satisfação registrada</p>
            ) : (
              <div className="space-y-4">
                {satisfacaoRecords.map((s) => (
                  <Card key={s.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-sm text-muted-foreground">{formatDate(s.created_at)}</p>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditSatisfacaoDialog(s)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSatisfacao(s.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Tempo Implantação:</span> {s.tempo_implantacao || '-'}</div>
                      <div><span className="text-muted-foreground">Ambiente Organizado:</span> {s.ambiente_organizado || '-'}</div>
                      <div><span className="text-muted-foreground">Treinamento:</span> {s.treinamento_adequado || '-'}</div>
                      <div><span className="text-muted-foreground">Expectativa:</span> {s.expectativa_atendida || '-'}</div>
                      <div><span className="text-muted-foreground">Facilidade App:</span> {s.facilidade_app || '-'}</div>
                      <div><span className="text-muted-foreground">NPS:</span> {s.nota_nps || '-'}</div>
                      <div className="col-span-2"><span className="text-muted-foreground">Pendências:</span> {s.pendencias || '-'}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Depoimentos Tab */}
          <TabsContent value="depoimentos">
            {depoimentos.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum depoimento registrado</p>
            ) : (
              <div className="space-y-4">
                {depoimentos.map((d) => (
                  <Card key={d.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{d.autor}</p>
                        <p className="text-sm text-muted-foreground">{d.cargo || 'Sem cargo'} • {formatDate(d.created_at)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Badge>{d.tipo}</Badge>
                        <Button variant="ghost" size="icon" onClick={() => setEditDepoimentoDialog(d)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDepoimento(d.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm">{d.texto}</p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Chamado Dialog */}
      <EditChamadoDialog chamado={editChamadoDialog} onClose={() => setEditChamadoDialog(null)} onSave={fetchAllData} />
      
      {/* Edit NPS Dialog */}
      <EditNpsDialog nps={editNpsDialog} onClose={() => setEditNpsDialog(null)} onSave={fetchAllData} />
      
      {/* Edit Satisfacao Dialog */}
      <EditSatisfacaoDialog satisfacao={editSatisfacaoDialog} onClose={() => setEditSatisfacaoDialog(null)} onSave={fetchAllData} />
      
      {/* Edit Depoimento Dialog */}
      <EditDepoimentoDialog depoimento={editDepoimentoDialog} onClose={() => setEditDepoimentoDialog(null)} onSave={fetchAllData} />
    </Card>
  );
}

// Edit Chamado Dialog Component
function EditChamadoDialog({ chamado, onClose, onSave }: { chamado: Chamado | null; onClose: () => void; onSave: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ assunto: '', descricao: '', prioridade: 'media', status: 'aberto' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (chamado) {
      setForm({
        assunto: chamado.assunto,
        descricao: chamado.descricao || '',
        prioridade: chamado.prioridade,
        status: chamado.status,
      });
    }
  }, [chamado]);

  const handleSave = async () => {
    if (!chamado) return;
    setSaving(true);
    const { error } = await supabase.from('customer_chamados').update({
      assunto: form.assunto,
      descricao: form.descricao || null,
      prioridade: form.prioridade,
      status: form.status,
      resolved_at: form.status === 'resolvido' ? new Date().toISOString() : null,
    }).eq('id', chamado.id);
    
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } else {
      toast({ title: 'Salvo', description: 'Chamado atualizado com sucesso.' });
      onClose();
      onSave();
    }
  };

  return (
    <Dialog open={!!chamado} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Reclamação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Assunto</Label>
            <Input value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit NPS Dialog Component
function EditNpsDialog({ nps, onClose, onSave }: { nps: NPS | null; onClose: () => void; onSave: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ nota: 0, comentario: '', ponto_forte: '', ponto_fraco: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (nps) {
      setForm({
        nota: nps.nota,
        comentario: nps.comentario || '',
        ponto_forte: nps.ponto_forte || '',
        ponto_fraco: nps.ponto_fraco || '',
      });
    }
  }, [nps]);

  const handleSave = async () => {
    if (!nps) return;
    setSaving(true);
    const { error } = await supabase.from('customer_nps').update({
      nota: form.nota,
      comentario: form.comentario || null,
      ponto_forte: form.ponto_forte || null,
      ponto_fraco: form.ponto_fraco || null,
    }).eq('id', nps.id);
    
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } else {
      toast({ title: 'Salvo', description: 'NPS atualizado com sucesso.' });
      onClose();
      onSave();
    }
  };

  return (
    <Dialog open={!!nps} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar NPS</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Nota (0-10)</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <Button key={n} variant={form.nota === n ? 'default' : 'outline'} size="sm" className="w-10 h-10" onClick={() => setForm({ ...form, nota: n })}>
                  {n}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Ponto Forte</Label>
            <Input value={form.ponto_forte} onChange={(e) => setForm({ ...form, ponto_forte: e.target.value })} />
          </div>
          <div>
            <Label>Ponto Fraco</Label>
            <Input value={form.ponto_fraco} onChange={(e) => setForm({ ...form, ponto_fraco: e.target.value })} />
          </div>
          <div>
            <Label>Comentário</Label>
            <Textarea value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Satisfacao Dialog Component
function EditSatisfacaoDialog({ satisfacao, onClose, onSave }: { satisfacao: Satisfacao | null; onClose: () => void; onSave: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    tempo_implantacao: '',
    ambiente_organizado: '',
    pendencias: '',
    comunicacao: '',
    facilidade_app: '',
    funcionalidades_sindico: '',
    treinamento_adequado: '',
    expectativa_atendida: '',
    nota_nps: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (satisfacao) {
      setForm({
        tempo_implantacao: satisfacao.tempo_implantacao || '',
        ambiente_organizado: satisfacao.ambiente_organizado || '',
        pendencias: satisfacao.pendencias || '',
        comunicacao: satisfacao.comunicacao || '',
        facilidade_app: satisfacao.facilidade_app || '',
        funcionalidades_sindico: satisfacao.funcionalidades_sindico || '',
        treinamento_adequado: satisfacao.treinamento_adequado || '',
        expectativa_atendida: satisfacao.expectativa_atendida || '',
        nota_nps: satisfacao.nota_nps?.toString() || '',
      });
    }
  }, [satisfacao]);

  const handleSave = async () => {
    if (!satisfacao) return;
    setSaving(true);
    const { error } = await supabase.from('customer_satisfacao').update({
      tempo_implantacao: form.tempo_implantacao || null,
      ambiente_organizado: form.ambiente_organizado || null,
      pendencias: form.pendencias || null,
      comunicacao: form.comunicacao || null,
      facilidade_app: form.facilidade_app || null,
      funcionalidades_sindico: form.funcionalidades_sindico || null,
      treinamento_adequado: form.treinamento_adequado || null,
      expectativa_atendida: form.expectativa_atendida || null,
      nota_nps: form.nota_nps ? parseInt(form.nota_nps) : null,
    }).eq('id', satisfacao.id);
    
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } else {
      toast({ title: 'Salvo', description: 'Pesquisa atualizada com sucesso.' });
      onClose();
      onSave();
    }
  };

  return (
    <Dialog open={!!satisfacao} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pesquisa de Satisfação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tempo Implantação</Label>
              <Select value={form.tempo_implantacao} onValueChange={(v) => setForm({ ...form, tempo_implantacao: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ambiente Organizado</Label>
              <Select value={form.ambiente_organizado} onValueChange={(v) => setForm({ ...form, ambiente_organizado: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Treinamento Adequado</Label>
              <Select value={form.treinamento_adequado} onValueChange={(v) => setForm({ ...form, treinamento_adequado: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expectativa Atendida</Label>
              <Select value={form.expectativa_atendida} onValueChange={(v) => setForm({ ...form, expectativa_atendida: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Facilidade App</Label>
              <Select value={form.facilidade_app} onValueChange={(v) => setForm({ ...form, facilidade_app: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="muito_satisfeito">Muito Satisfeito</SelectItem>
                  <SelectItem value="satisfeito">Satisfeito</SelectItem>
                  <SelectItem value="indiferente">Indiferente</SelectItem>
                  <SelectItem value="insatisfeito">Insatisfeito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nota NPS</Label>
              <Select value={form.nota_nps} onValueChange={(v) => setForm({ ...form, nota_nps: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Pendências</Label>
            <Textarea value={form.pendencias} onChange={(e) => setForm({ ...form, pendencias: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Comunicação</Label>
            <Textarea value={form.comunicacao} onChange={(e) => setForm({ ...form, comunicacao: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Funcionalidades Síndico</Label>
            <Textarea value={form.funcionalidades_sindico} onChange={(e) => setForm({ ...form, funcionalidades_sindico: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Depoimento Dialog Component
function EditDepoimentoDialog({ depoimento, onClose, onSave }: { depoimento: Depoimento | null; onClose: () => void; onSave: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ texto: '', autor: '', cargo: '', tipo: 'elogio' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (depoimento) {
      setForm({
        texto: depoimento.texto,
        autor: depoimento.autor,
        cargo: depoimento.cargo || '',
        tipo: depoimento.tipo,
      });
    }
  }, [depoimento]);

  const handleSave = async () => {
    if (!depoimento) return;
    setSaving(true);
    const { error } = await supabase.from('customer_depoimentos').update({
      texto: form.texto,
      autor: form.autor,
      cargo: form.cargo || null,
      tipo: form.tipo,
    }).eq('id', depoimento.id);
    
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' });
    } else {
      toast({ title: 'Salvo', description: 'Depoimento atualizado com sucesso.' });
      onClose();
      onSave();
    }
  };

  return (
    <Dialog open={!!depoimento} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Depoimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Autor</Label>
              <Input value={form.autor} onChange={(e) => setForm({ ...form, autor: e.target.value })} />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="elogio">Elogio</SelectItem>
                <SelectItem value="sugestao">Sugestão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Texto</Label>
            <Textarea value={form.texto} onChange={(e) => setForm({ ...form, texto: e.target.value })} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
