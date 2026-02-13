import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Copy, ExternalLink, FileText, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
}

export default function Orcamentos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewProposta, setViewProposta] = useState<Sessao | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSessoes = async () => {
    const { data, error } = await supabase
      .from('orcamento_sessoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setSessoes(data as Sessao[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchSessoes(); }, []);

  const handleCreate = async () => {
    if (!newNome.trim()) {
      toast({ title: 'Informe o nome do cliente', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('orcamento_sessoes').insert({
      nome_cliente: newNome.trim(),
      email_cliente: newEmail.trim() || null,
      telefone_cliente: newTelefone.trim() || null,
      created_by: user!.id,
      created_by_name: user!.nome,
    });

    if (error) {
      toast({ title: 'Erro ao criar sessão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sessão criada com sucesso!' });
      setShowNew(false);
      setNewNome('');
      setNewEmail('');
      setNewTelefone('');
      fetchSessoes();
    }
    setCreating(false);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/orcamento/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('orcamento_sessoes').delete().eq('id', deleteId);
    setDeleteId(null);
    fetchSessoes();
    toast({ title: 'Sessão excluída' });
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'ativo': return { label: 'Ativo', variant: 'default' as const };
      case 'proposta_gerada': return { label: 'Proposta Gerada', variant: 'secondary' as const };
      default: return { label: s, variant: 'outline' as const };
    }
  };

  if (user?.role !== 'admin') {
    return <Layout><div className="p-8 text-center text-muted-foreground">Acesso restrito a administradores.</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Orçamentos por IA</h1>
            <p className="text-muted-foreground">Gere propostas comerciais através de conversa com IA</p>
          </div>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nova Sessão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Sessão de Orçamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome do condomínio ou cliente" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={newTelefone} onChange={e => setNewTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? 'Criando...' : 'Criar Sessão'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : sessoes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma sessão de orçamento criada ainda. Clique em "Nova Sessão" para começar.
            </CardContent>
          </Card>
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
                          Criado em {format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {s.created_by_name && ` por ${s.created_by_name}`}
                        </CardDescription>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyLink(s.token)}>
                        <Copy className="mr-1 h-3 w-3" />Copiar Link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(`/orcamento/${s.token}`, '_blank')}>
                        <ExternalLink className="mr-1 h-3 w-3" />Abrir Chat
                      </Button>
                      {s.proposta_gerada && (
                        <Button size="sm" variant="outline" onClick={() => setViewProposta(s)}>
                          <Eye className="mr-1 h-3 w-3" />Ver Proposta
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

      {/* View Proposal Dialog */}
      <Dialog open={!!viewProposta} onOpenChange={() => setViewProposta(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposta - {viewProposta?.nome_cliente}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{viewProposta?.proposta_gerada || ''}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Todas as mensagens serão perdidas.</AlertDialogDescription>
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
