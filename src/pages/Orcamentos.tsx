import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, FileText, Trash2, Eye, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Sessao {
  id: string;
  token: string;
  nome_cliente: string;
  email_cliente: string | null;
  telefone_cliente: string | null;
  status: string;
  proposta_gerada: string | null;
  proposta_gerada_at: string | null;
  created_by_name: string | null;
  created_at: string;
  vendedor_id: string | null;
  vendedor_nome: string | null;
}

interface Vendedor {
  id: string;
  nome: string;
}

export default function Orcamentos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newVendedorId, setNewVendedorId] = useState('');
  const [newEndereco, setNewEndereco] = useState('');
  const [creating, setCreating] = useState(false);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<string | null>(null);
  const [reportHtml, setReportHtml] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  const fetchData = async () => {
    const canSeeAll = user?.role === 'admin' || user?.role === 'projetos' || user?.role === 'gerente_comercial';
    let query = supabase.from('orcamento_sessoes').select('*').neq('status', 'projeto_aberto').order('created_at', { ascending: false });
    if (!canSeeAll) {
      query = query.eq('vendedor_id', user!.id);
    }
    const [{ data: sessoesData }, { data: rolesData }] = await Promise.all([
      query,
      canSeeAll
        ? supabase.from('user_roles').select('user_id, role').in('role', ['vendedor', 'admin', 'gerente_comercial', 'projetos'])
        : Promise.resolve({ data: [] }),
    ]);
    if (sessoesData) setSessoes(sessoesData as Sessao[]);

    if (canSeeAll && rolesData && rolesData.length > 0) {
      const userIds = rolesData.map((r: any) => r.user_id);
      const { data: profilesData } = await supabase.from('profiles').select('id, nome').in('id', userIds);
      if (profilesData) setVendedores(profilesData as Vendedor[]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (isMobile) {
      navigate('/orcar', { replace: true });
    }
  }, [isMobile, navigate]);


  const handleCreate = async () => {
    if (!newNome.trim()) { toast({ title: 'Informe o nome do cliente', variant: 'destructive' }); return; }
    const vendedorId = isAdmin ? newVendedorId : user!.id;
    const vendedorNome = isAdmin ? vendedores.find(v => v.id === newVendedorId)?.nome || null : user!.nome;
    if (isAdmin && !newVendedorId) { toast({ title: 'Selecione o vendedor', variant: 'destructive' }); return; }
    setCreating(true);

    const { error } = await supabase.from('orcamento_sessoes').insert({
      nome_cliente: newNome.trim(),
      email_cliente: newEmail.trim() || null,
      telefone_cliente: newTelefone.trim() || null,
      endereco_condominio: newEndereco.trim() || null,
      created_by: user!.id,
      created_by_name: user!.nome,
      vendedor_id: vendedorId,
      vendedor_nome: vendedorNome,
    });

    if (error) {
      toast({ title: 'Erro ao criar sessão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sessão criada com sucesso!' });
      setShowNew(false);
      setNewNome(''); setNewEmail(''); setNewTelefone(''); setNewVendedorId(''); setNewEndereco('');
      fetchData();
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('orcamento_sessoes').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchData();
    toast({ title: 'Sessão excluída' });
  };

  const handleViewReport = async (sessaoId: string) => {
    setLoadingReport(true);
    setViewReport(sessaoId);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-visit-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ sessao_id: sessaoId }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReportHtml(data.html);
      }
    } catch {
      toast({ title: 'Erro ao carregar relatório', variant: 'destructive' });
    }
    setLoadingReport(false);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'ativo': return { label: 'Ativo', variant: 'default' as const };
      case 'proposta_gerada': return { label: 'Proposta Gerada', variant: 'secondary' as const };
      case 'escopo_validado': return { label: 'Escopo Validado', variant: 'outline' as const };
      case 'relatorio_enviado': return { label: 'Relatório Enviado', variant: 'outline' as const };
      default: return { label: s, variant: 'outline' as const };
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'projetos' || user?.role === 'gerente_comercial';
  const allowedRoles = ['admin', 'vendedor', 'gerente_comercial', 'supervisor_operacoes', 'projetos', 'implantacao'];
  if (!user || !allowedRoles.includes(user.role)) {
    return <Layout><div className="p-8 text-center text-muted-foreground">Acesso restrito.</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isAdmin ? 'Orçamentos por IA' : 'Meus Orçamentos'}</h1>
            <p className="text-muted-foreground">{isAdmin ? 'Gerencie orçamentos guiados por IA' : 'Sessões de orçamento atribuídas a você'}</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showNew} onOpenChange={setShowNew}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Nova Sessão</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Sessão de Orçamento</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Cliente / Condomínio *</Label>
                    <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome do condomínio" />
                  </div>
                  <div>
                    <Label>Endereço do Condomínio</Label>
                    <Input value={newEndereco} onChange={e => setNewEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade - UF" />
                  </div>
                  {isAdmin && (
                    <div>
                      <Label>Vendedor Responsável *</Label>
                      <Select value={newVendedorId} onValueChange={setNewVendedorId}>
                        <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                        <SelectContent>
                          {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Email do Cliente</Label>
                    <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
                  </div>
                  <div>
                    <Label>Telefone do Cliente</Label>
                    <Input value={newTelefone} onChange={e => setNewTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                  </div>
                  <Button onClick={handleCreate} disabled={creating} className="w-full">
                    {creating ? 'Criando...' : 'Criar Sessão'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : sessoes.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma sessão criada.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {sessoes.map(s => {
              const st = statusLabel(s.status);
              return (
                <Card key={s.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{s.nome_cliente}</CardTitle>
                        <CardDescription>
                          {format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {s.vendedor_nome && ` • Vendedor: ${s.vendedor_nome}`}
                        </CardDescription>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/orcamento-visita?sessao=${s.id}`)}>
                        <MessageSquare className="mr-1 h-3 w-3" />Abrir Chat
                      </Button>
                      {s.proposta_gerada && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/orcamento-visita?sessao=${s.id}&ver=1`)}>
                          <Eye className="mr-1 h-3 w-3" />Ver
                        </Button>
                      )}
                      {(s.status === 'escopo_validado' || s.status === 'relatorio_enviado') && (
                        <Button size="sm" variant="outline" onClick={() => handleViewReport(s.id)}>
                          <FileText className="mr-1 h-3 w-3" />Ver Relatório
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="mr-1 h-3 w-3" />Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>


      {/* Report viewer dialog */}
      <Dialog open={!!viewReport} onOpenChange={() => { setViewReport(null); setReportHtml(''); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Relatório da Visita</DialogTitle></DialogHeader>
          {loadingReport ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : reportHtml ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportHtml) }} />
          ) : (
            <p className="text-muted-foreground text-center py-8">Erro ao carregar relatório.</p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
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
