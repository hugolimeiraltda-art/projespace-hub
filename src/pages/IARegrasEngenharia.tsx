import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, AlertTriangle, Edit2, History, Plus, Save, X, Hash, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Regra {
  id: string;
  tipo_regra: string;
  nome: string;
  descricao: string | null;
  valor_limite: number | null;
  keywords: string[] | null;
  ativo: boolean;
  historico_alteracoes: any[];
  created_at: string;
  updated_at: string;
}

export default function IARegrasEngenharia() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingRegra, setEditingRegra] = useState<Regra | null>(null);
  const [historyRegra, setHistoryRegra] = useState<Regra | null>(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', tipo_regra: 'limite_numerico', valor_limite: '', keywords: '', ativo: true });
  const [isNew, setIsNew] = useState(false);

  const { data: regras, isLoading } = useQuery({
    queryKey: ['regras-engenharia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamento_regras_engenharia')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return (data || []) as Regra[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (regra: Partial<Regra> & { id?: string }) => {
      const historyEntry = {
        data: new Date().toISOString(),
        usuario: user?.nome || 'Admin',
        acao: isNew ? 'Regra criada' : 'Regra editada',
        valores_anteriores: isNew ? null : editingRegra,
      };

      const payload = {
        nome: regra.nome,
        descricao: regra.descricao,
        tipo_regra: regra.tipo_regra,
        valor_limite: regra.valor_limite,
        keywords: regra.keywords,
        ativo: regra.ativo,
        updated_at: new Date().toISOString(),
        historico_alteracoes: [
          historyEntry,
          ...((editingRegra?.historico_alteracoes || []) as any[]),
        ],
      };

      if (isNew) {
        const { error } = await supabase.from('orcamento_regras_engenharia').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('orcamento_regras_engenharia').update(payload).eq('id', regra.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-engenharia'] });
      toast.success(isNew ? 'Regra criada com sucesso' : 'Regra atualizada com sucesso');
      setEditingRegra(null);
      setIsNew(false);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  const openEdit = (regra: Regra) => {
    setIsNew(false);
    setEditingRegra(regra);
    setFormData({
      nome: regra.nome,
      descricao: regra.descricao || '',
      tipo_regra: regra.tipo_regra,
      valor_limite: regra.valor_limite?.toString() || '',
      keywords: (regra.keywords || []).join(', '),
      ativo: regra.ativo,
    });
  };

  const openNew = () => {
    setIsNew(true);
    setEditingRegra({ id: '', tipo_regra: 'limite_numerico', nome: '', descricao: '', valor_limite: null, keywords: null, ativo: true, historico_alteracoes: [], created_at: '', updated_at: '' });
    setFormData({ nome: '', descricao: '', tipo_regra: 'limite_numerico', valor_limite: '', keywords: '', ativo: true });
  };

  const handleSave = () => {
    if (!formData.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    saveMutation.mutate({
      id: editingRegra?.id,
      nome: formData.nome,
      descricao: formData.descricao || null,
      tipo_regra: formData.tipo_regra,
      valor_limite: formData.tipo_regra === 'limite_numerico' ? parseFloat(formData.valor_limite) || null : null,
      keywords: formData.tipo_regra === 'keyword' ? formData.keywords.split(',').map(k => k.trim()).filter(Boolean) : null,
      ativo: formData.ativo,
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/painel-ia')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-2 rounded-lg bg-primary/10">
            <AlertTriangle className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Regras de Encaminhamento à Engenharia</h1>
            <p className="text-sm text-muted-foreground">Gerencie as condições que disparam envio automático para o setor de Projetos</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Regra
          </Button>
        </div>

        <div className="grid gap-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {regras?.map(regra => (
            <Card key={regra.id} className={`transition-opacity ${!regra.ativo ? 'opacity-50' : ''}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${regra.tipo_regra === 'limite_numerico' ? 'bg-blue-500/10' : 'bg-amber-500/10'}`}>
                  {regra.tipo_regra === 'limite_numerico' ? (
                    <Hash className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Tag className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{regra.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{regra.descricao}</p>
                  {regra.tipo_regra === 'limite_numerico' && regra.valor_limite != null && (
                    <Badge variant="outline" className="mt-1 text-[10px]">Limite: {regra.valor_limite.toLocaleString('pt-BR')}</Badge>
                  )}
                  {regra.tipo_regra === 'keyword' && regra.keywords && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {regra.keywords.map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={regra.ativo ? 'secondary' : 'outline'} className="text-[10px]">
                    {regra.ativo ? 'Ativa' : 'Inativa'}
                  </Badge>
                  {(regra.historico_alteracoes as any[])?.length > 0 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryRegra(regra)}>
                      <History className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(regra)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingRegra} onOpenChange={() => { setEditingRegra(null); setIsNew(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isNew ? 'Nova Regra' : 'Editar Regra'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={formData.descricao} onChange={e => setFormData(p => ({ ...p, descricao: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Tipo</Label>
                <div className="flex gap-2 mt-1">
                  <Button variant={formData.tipo_regra === 'limite_numerico' ? 'default' : 'outline'} size="sm" onClick={() => setFormData(p => ({ ...p, tipo_regra: 'limite_numerico' }))}>
                    <Hash className="w-3 h-3 mr-1" /> Limite Numérico
                  </Button>
                  <Button variant={formData.tipo_regra === 'keyword' ? 'default' : 'outline'} size="sm" onClick={() => setFormData(p => ({ ...p, tipo_regra: 'keyword' }))}>
                    <Tag className="w-3 h-3 mr-1" /> Palavra-chave
                  </Button>
                </div>
              </div>
              {formData.tipo_regra === 'limite_numerico' && (
                <div>
                  <Label>Valor Limite</Label>
                  <Input type="number" value={formData.valor_limite} onChange={e => setFormData(p => ({ ...p, valor_limite: e.target.value }))} />
                </div>
              )}
              {formData.tipo_regra === 'keyword' && (
                <div>
                  <Label>Palavras-chave (separadas por vírgula)</Label>
                  <Input value={formData.keywords} onChange={e => setFormData(p => ({ ...p, keywords: e.target.value }))} placeholder="lpr, leitura de placa" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={formData.ativo} onCheckedChange={v => setFormData(p => ({ ...p, ativo: v }))} />
                <Label>Regra ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingRegra(null); setIsNew(false); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={!!historyRegra} onOpenChange={() => setHistoryRegra(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-4 h-4" /> Histórico — {historyRegra?.nome}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {((historyRegra?.historico_alteracoes || []) as any[]).map((entry: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-foreground">{entry.acao}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {entry.data ? format(new Date(entry.data), "dd/MM/yy HH:mm", { locale: ptBR }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">por {entry.usuario}</p>
                  </div>
                ))}
                {((historyRegra?.historico_alteracoes || []) as any[]).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico registrado</p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
