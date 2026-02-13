import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Package, Boxes } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CATEGORIAS = [
  { value: 'central', label: 'Central' },
  { value: 'acesso_pedestre', label: 'Acesso de Pedestre' },
  { value: 'acesso_veiculos', label: 'Acesso de Veículos' },
  { value: 'cftv', label: 'CFTV' },
  { value: 'perimetro', label: 'Perímetro / Alarme' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'interfonia', label: 'Interfonia' },
];

const UNIDADES = [
  { value: 'un', label: 'Unidade' },
  { value: 'kit', label: 'Kit' },
  { value: 'metro', label: 'Metro' },
  { value: 'metro_linear', label: 'Metro Linear' },
];

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  preco_unitario: number;
  unidade: string;
  ativo: boolean;
}

interface Kit {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  preco_kit: number;
  ativo: boolean;
  itens?: { id: string; produto_id: string; quantidade: number; produto?: Produto }[];
}

export default function OrcamentoProdutos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  // Product form
  const [showProdutoForm, setShowProdutoForm] = useState(false);
  const [editProduto, setEditProduto] = useState<Produto | null>(null);
  const [pForm, setPForm] = useState({ nome: '', descricao: '', categoria: 'central', preco_unitario: '', unidade: 'un' });

  // Kit form
  const [showKitForm, setShowKitForm] = useState(false);
  const [editKit, setEditKit] = useState<Kit | null>(null);
  const [kForm, setKForm] = useState({ nome: '', descricao: '', categoria: 'central', preco_kit: '' });
  const [kitItens, setKitItens] = useState<{ produto_id: string; quantidade: number }[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'produto' | 'kit'; id: string } | null>(null);

  const fetchAll = async () => {
    const [{ data: prods }, { data: kitsData }] = await Promise.all([
      supabase.from('orcamento_produtos').select('*').order('categoria').order('nome'),
      supabase.from('orcamento_kits').select('*').order('categoria').order('nome'),
    ]);
    setProdutos((prods as Produto[]) || []);

    // Fetch kit items
    if (kitsData && kitsData.length > 0) {
      const { data: itens } = await supabase
        .from('orcamento_kit_itens')
        .select('*')
        .in('kit_id', kitsData.map(k => k.id));

      const kitsWithItens = (kitsData as Kit[]).map(k => ({
        ...k,
        itens: (itens || []).filter(i => i.kit_id === k.id).map(i => ({
          ...i,
          produto: (prods as Produto[])?.find(p => p.id === i.produto_id),
        })),
      }));
      setKits(kitsWithItens);
    } else {
      setKits([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ---- Produto CRUD ----
  const openProdutoEdit = (p: Produto) => {
    setEditProduto(p);
    setPForm({ nome: p.nome, descricao: p.descricao || '', categoria: p.categoria, preco_unitario: String(p.preco_unitario), unidade: p.unidade });
    setShowProdutoForm(true);
  };

  const saveProduto = async () => {
    if (!pForm.nome.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return; }
    const payload = { nome: pForm.nome.trim(), descricao: pForm.descricao.trim() || null, categoria: pForm.categoria, preco_unitario: parseFloat(pForm.preco_unitario) || 0, unidade: pForm.unidade };

    if (editProduto) {
      await supabase.from('orcamento_produtos').update(payload).eq('id', editProduto.id);
    } else {
      await supabase.from('orcamento_produtos').insert(payload);
    }
    setShowProdutoForm(false);
    setEditProduto(null);
    setPForm({ nome: '', descricao: '', categoria: 'central', preco_unitario: '', unidade: 'un' });
    fetchAll();
    toast({ title: editProduto ? 'Produto atualizado' : 'Produto criado' });
  };

  // ---- Kit CRUD ----
  const openKitEdit = (k: Kit) => {
    setEditKit(k);
    setKForm({ nome: k.nome, descricao: k.descricao || '', categoria: k.categoria, preco_kit: String(k.preco_kit) });
    setKitItens(k.itens?.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade })) || []);
    setShowKitForm(true);
  };

  const saveKit = async () => {
    if (!kForm.nome.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return; }
    const payload = { nome: kForm.nome.trim(), descricao: kForm.descricao.trim() || null, categoria: kForm.categoria, preco_kit: parseFloat(kForm.preco_kit) || 0 };

    let kitId = editKit?.id;
    if (editKit) {
      await supabase.from('orcamento_kits').update(payload).eq('id', editKit.id);
      await supabase.from('orcamento_kit_itens').delete().eq('kit_id', editKit.id);
    } else {
      const { data } = await supabase.from('orcamento_kits').insert(payload).select('id').single();
      kitId = data?.id;
    }

    if (kitId && kitItens.length > 0) {
      await supabase.from('orcamento_kit_itens').insert(
        kitItens.filter(i => i.produto_id).map(i => ({ kit_id: kitId!, produto_id: i.produto_id, quantidade: i.quantidade }))
      );
    }

    setShowKitForm(false);
    setEditKit(null);
    setKForm({ nome: '', descricao: '', categoria: 'central', preco_kit: '' });
    setKitItens([]);
    fetchAll();
    toast({ title: editKit ? 'Kit atualizado' : 'Kit criado' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'produto') {
      await supabase.from('orcamento_produtos').delete().eq('id', deleteTarget.id);
    } else {
      await supabase.from('orcamento_kits').delete().eq('id', deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
    toast({ title: 'Excluído com sucesso' });
  };

  const toggleAtivo = async (type: 'produto' | 'kit', id: string, ativo: boolean) => {
    if (type === 'produto') {
      await supabase.from('orcamento_produtos').update({ ativo }).eq('id', id);
    } else {
      await supabase.from('orcamento_kits').update({ ativo }).eq('id', id);
    }
    fetchAll();
  };

  const catLabel = (cat: string) => CATEGORIAS.find(c => c.value === cat)?.label || cat;
  const unLabel = (un: string) => UNIDADES.find(u => u.value === un)?.label || un;

  if (user?.role !== 'admin') {
    return <Layout><div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produtos e Kits</h1>
          <p className="text-muted-foreground">Gerencie produtos e kits para orçamentos</p>
        </div>

        <Tabs defaultValue="produtos">
          <TabsList>
            <TabsTrigger value="produtos"><Package className="mr-2 h-4 w-4" />Produtos</TabsTrigger>
            <TabsTrigger value="kits"><Boxes className="mr-2 h-4 w-4" />Kits</TabsTrigger>
          </TabsList>

          {/* PRODUTOS TAB */}
          <TabsContent value="produtos" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditProduto(null); setPForm({ nome: '', descricao: '', categoria: 'central', preco_unitario: '', unidade: 'un' }); setShowProdutoForm(true); }}>
                <Plus className="mr-2 h-4 w-4" />Novo Produto
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : produtos.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum produto cadastrado.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {CATEGORIAS.map(cat => {
                  const catProds = produtos.filter(p => p.categoria === cat.value);
                  if (catProds.length === 0) return null;
                  return (
                    <div key={cat.value}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase">{cat.label}</h3>
                      <div className="grid gap-2">
                        {catProds.map(p => (
                          <Card key={p.id} className={!p.ativo ? 'opacity-50' : ''}>
                            <CardContent className="py-3 px-4 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{p.nome}</span>
                                  <Badge variant="outline" className="text-xs">{unLabel(p.unidade)}</Badge>
                                  {!p.ativo && <Badge variant="secondary">Inativo</Badge>}
                                </div>
                                {p.descricao && <p className="text-xs text-muted-foreground mt-1">{p.descricao}</p>}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-foreground">R$ {p.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                <Switch checked={p.ativo} onCheckedChange={v => toggleAtivo('produto', p.id, v)} />
                                <Button size="icon" variant="ghost" onClick={() => openProdutoEdit(p)}><Pencil className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'produto', id: p.id })}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* KITS TAB */}
          <TabsContent value="kits" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setEditKit(null); setKForm({ nome: '', descricao: '', categoria: 'central', preco_kit: '' }); setKitItens([]); setShowKitForm(true); }}>
                <Plus className="mr-2 h-4 w-4" />Novo Kit
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : kits.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum kit cadastrado.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {kits.map(k => (
                  <Card key={k.id} className={!k.ativo ? 'opacity-50' : ''}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{k.nome}</span>
                            <Badge variant="outline" className="text-xs">{catLabel(k.categoria)}</Badge>
                            {!k.ativo && <Badge variant="secondary">Inativo</Badge>}
                          </div>
                          {k.descricao && <p className="text-xs text-muted-foreground mt-1">{k.descricao}</p>}
                          {k.itens && k.itens.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {k.itens.map(i => (
                                <span key={i.id} className="mr-3">{i.quantidade}x {i.produto?.nome || 'Produto removido'}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-foreground">R$ {k.preco_kit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <Switch checked={k.ativo} onCheckedChange={v => toggleAtivo('kit', k.id, v)} />
                          <Button size="icon" variant="ghost" onClick={() => openKitEdit(k)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget({ type: 'kit', id: k.id })}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Produto Dialog */}
      <Dialog open={showProdutoForm} onOpenChange={v => { if (!v) { setShowProdutoForm(false); setEditProduto(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={pForm.nome} onChange={e => setPForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={pForm.descricao} onChange={e => setPForm(p => ({ ...p, descricao: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={pForm.categoria} onValueChange={v => setPForm(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidade</Label>
                <Select value={pForm.unidade} onValueChange={v => setPForm(p => ({ ...p, unidade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNIDADES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={pForm.preco_unitario} onChange={e => setPForm(p => ({ ...p, preco_unitario: e.target.value }))} /></div>
            <Button onClick={saveProduto} className="w-full">{editProduto ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kit Dialog */}
      <Dialog open={showKitForm} onOpenChange={v => { if (!v) { setShowKitForm(false); setEditKit(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editKit ? 'Editar Kit' : 'Novo Kit'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={kForm.nome} onChange={e => setKForm(k => ({ ...k, nome: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={kForm.descricao} onChange={e => setKForm(k => ({ ...k, descricao: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={kForm.categoria} onValueChange={v => setKForm(k => ({ ...k, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Preço do Kit (R$)</Label><Input type="number" step="0.01" value={kForm.preco_kit} onChange={e => setKForm(k => ({ ...k, preco_kit: e.target.value }))} /></div>
            </div>

            <div>
              <Label>Produtos do Kit</Label>
              <div className="space-y-2 mt-2">
                {kitItens.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select value={item.produto_id} onValueChange={v => setKitItens(prev => prev.map((it, i) => i === idx ? { ...it, produto_id: v } : it))}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                      <SelectContent>{produtos.filter(p => p.ativo).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" min="1" className="w-20" value={item.quantidade} onChange={e => setKitItens(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: parseInt(e.target.value) || 1 } : it))} />
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setKitItens(prev => prev.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setKitItens(prev => [...prev, { produto_id: '', quantidade: 1 }])}>
                  <Plus className="mr-1 h-3 w-3" />Adicionar Produto
                </Button>
              </div>
            </div>

            <Button onClick={saveKit} className="w-full">{editKit ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleteTarget?.type === 'produto' ? 'produto' : 'kit'}?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
