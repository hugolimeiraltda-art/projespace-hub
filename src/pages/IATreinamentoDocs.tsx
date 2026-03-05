import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Brain, Edit2, History, Plus, Save, FileText, Building, ShieldCheck, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Doc {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  ativo: boolean;
  ordem: number;
  historico_alteracoes: any[];
  created_at: string;
  updated_at: string;
}

const CATEGORIAS = [
  { value: 'modalidades', label: 'Modalidades de Portaria', icon: Building },
  { value: 'equipamentos', label: 'Equipamentos', icon: ShieldCheck },
  { value: 'comercial', label: 'Comercial', icon: MessageSquare },
  { value: 'geral', label: 'Geral', icon: FileText },
];

export default function IATreinamentoDocs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);
  const [historyDoc, setHistoryDoc] = useState<Doc | null>(null);
  const [formData, setFormData] = useState({ titulo: '', conteudo: '', categoria: 'geral', ativo: true, ordem: 0 });
  const [isNew, setIsNew] = useState(false);

  const { data: docs, isLoading } = useQuery({
    queryKey: ['treinamento-docs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamento_treinamento_docs')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return (data || []) as Doc[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (doc: Partial<Doc> & { id?: string }) => {
      const historyEntry = {
        data: new Date().toISOString(),
        usuario: user?.nome || 'Admin',
        acao: isNew ? 'Documento criado' : 'Documento editado',
        conteudo_anterior: isNew ? null : editingDoc?.conteudo,
      };

      const payload = {
        titulo: doc.titulo,
        conteudo: doc.conteudo,
        categoria: doc.categoria,
        ativo: doc.ativo,
        ordem: doc.ordem,
        updated_at: new Date().toISOString(),
        historico_alteracoes: [
          historyEntry,
          ...((editingDoc?.historico_alteracoes || []) as any[]),
        ],
      };

      if (isNew) {
        const { error } = await supabase.from('orcamento_treinamento_docs').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('orcamento_treinamento_docs').update(payload).eq('id', doc.id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treinamento-docs'] });
      toast.success(isNew ? 'Documento criado' : 'Documento atualizado');
      setEditingDoc(null);
      setIsNew(false);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  const openEdit = (doc: Doc) => {
    setIsNew(false);
    setEditingDoc(doc);
    setFormData({ titulo: doc.titulo, conteudo: doc.conteudo, categoria: doc.categoria, ativo: doc.ativo, ordem: doc.ordem });
  };

  const openNew = () => {
    setIsNew(true);
    setEditingDoc({ id: '', titulo: '', conteudo: '', categoria: 'geral', ativo: true, ordem: (docs?.length || 0) + 1, historico_alteracoes: [], created_at: '', updated_at: '' });
    setFormData({ titulo: '', conteudo: '', categoria: 'geral', ativo: true, ordem: (docs?.length || 0) + 1 });
  };

  const handleSave = () => {
    if (!formData.titulo.trim()) { toast.error('Título é obrigatório'); return; }
    saveMutation.mutate({
      id: editingDoc?.id,
      titulo: formData.titulo,
      conteudo: formData.conteudo,
      categoria: formData.categoria,
      ativo: formData.ativo,
      ordem: formData.ordem,
    });
  };

  const getCategoriaInfo = (cat: string) => CATEGORIAS.find(c => c.value === cat) || CATEGORIAS[3];

  // Group by category
  const grouped = (docs || []).reduce((acc, doc) => {
    if (!acc[doc.categoria]) acc[doc.categoria] = [];
    acc[doc.categoria].push(doc);
    return acc;
  }, {} as Record<string, Doc[]>);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/painel-ia')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Conhecimento de Produtos Emive</h1>
            <p className="text-sm text-muted-foreground">Documentos de treinamento técnico e comercial da IA</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Documento
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {Object.entries(grouped).map(([categoria, catDocs]) => {
          const catInfo = getCategoriaInfo(categoria);
          const CatIcon = catInfo.icon;
          return (
            <div key={categoria} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <CatIcon className="w-4 h-4" /> {catInfo.label}
              </h3>
              <div className="grid gap-2">
                {catDocs.map(doc => (
                  <Card key={doc.id} className={`transition-opacity ${!doc.ativo ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{doc.titulo}</p>
                            <Badge variant={doc.ativo ? 'secondary' : 'outline'} className="text-[10px]">
                              {doc.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.conteudo}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(doc.historico_alteracoes as any[])?.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryDoc(doc)}>
                              <History className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(doc)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}

        {/* Edit Dialog */}
        <Dialog open={!!editingDoc} onOpenChange={() => { setEditingDoc(null); setIsNew(false); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isNew ? 'Novo Documento' : 'Editar Documento'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={formData.titulo} onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={formData.categoria} onValueChange={v => setFormData(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conteúdo (usado como base de conhecimento da IA)</Label>
                <Textarea value={formData.conteudo} onChange={e => setFormData(p => ({ ...p, conteudo: e.target.value }))} rows={8} className="font-mono text-xs" />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={formData.ativo} onCheckedChange={v => setFormData(p => ({ ...p, ativo: v }))} />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={formData.ordem} onChange={e => setFormData(p => ({ ...p, ordem: parseInt(e.target.value) || 0 }))} className="w-20" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingDoc(null); setIsNew(false); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={!!historyDoc} onOpenChange={() => setHistoryDoc(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-4 h-4" /> Histórico — {historyDoc?.titulo}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {((historyDoc?.historico_alteracoes || []) as any[]).map((entry: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-foreground">{entry.acao}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {entry.data ? format(new Date(entry.data), "dd/MM/yy HH:mm", { locale: ptBR }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">por {entry.usuario}</p>
                    {entry.conteudo_anterior && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer">Ver conteúdo anterior</summary>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap bg-muted/30 p-2 rounded">{entry.conteudo_anterior}</p>
                      </details>
                    )}
                  </div>
                ))}
                {((historyDoc?.historico_alteracoes || []) as any[]).length === 0 && (
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
