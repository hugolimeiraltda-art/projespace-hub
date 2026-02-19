import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendedorLayout } from '@/components/VendedorLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MessageSquare, Clock, MapPin, Loader2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sessao {
  id: string;
  token: string;
  nome_cliente: string;
  endereco_condominio: string | null;
  status: string;
  proposta_gerada: string | null;
  created_at: string;
}

interface VendedorInfo {
  id: string;
  nome: string;
}

export default function VendedorHome() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vendedor, setVendedor] = useState<VendedorInfo | null>(null);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newEndereco, setNewEndereco] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('vendedor_token', token);
      validateAndLoad();
    }
  }, [token]);

  const validateAndLoad = async () => {
    if (!token) return;
    setIsLoading(true);

    // Validate token using raw query to avoid type issues
    const { data: tokenData, error } = await supabase
      .from('vendedor_acesso_tokens' as any)
      .select('*')
      .eq('token', token)
      .eq('ativo', true)
      .single();

    if (error || !tokenData) {
      setIsValid(false);
      setIsLoading(false);
      return;
    }

    const td = tokenData as any;

    // Check expiration
    if (td.expira_em && new Date(td.expira_em) < new Date()) {
      setIsValid(false);
      setIsLoading(false);
      return;
    }

    setVendedor({ id: td.vendedor_id, nome: td.vendedor_nome });
    setIsValid(true);

    // Fetch sessions from last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const { data: sessoesData } = await supabase
      .from('orcamento_sessoes')
      .select('*')
      .eq('vendedor_id', td.vendedor_id)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    if (sessoesData) setSessoes(sessoesData as Sessao[]);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!newNome.trim() || !vendedor) {
      toast({ title: 'Informe o nome do condomínio', variant: 'destructive' });
      return;
    }
    setCreating(true);

    const { data, error } = await supabase.from('orcamento_sessoes').insert({
      nome_cliente: newNome.trim(),
      email_cliente: newEmail.trim() || null,
      telefone_cliente: newTelefone.trim() || null,
      endereco_condominio: newEndereco.trim() || null,
      created_by: vendedor.id,
      created_by_name: vendedor.nome,
      vendedor_id: vendedor.id,
      vendedor_nome: vendedor.nome,
    }).select('id').single();

    if (error) {
      toast({ title: 'Erro ao criar sessão', description: error.message, variant: 'destructive' });
      setCreating(false);
      return;
    }

    setShowNew(false);
    setNewNome(''); setNewEmail(''); setNewTelefone(''); setNewEndereco('');
    setCreating(false);
    navigate(`/vendedor/${token}/chat/${data.id}`);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'ativo': return { label: 'Em andamento', variant: 'default' as const };
      case 'proposta_gerada': return { label: 'Proposta Gerada', variant: 'secondary' as const };
      case 'escopo_validado': return { label: 'Escopo Validado', variant: 'outline' as const };
      default: return { label: s, variant: 'outline' as const };
    }
  };

  if (isValid === false) {
    return (
      <VendedorLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Link inválido ou expirado</h2>
              <p className="text-muted-foreground">
                Este link de acesso não é mais válido. Solicite um novo link ao seu gerente.
              </p>
            </CardContent>
          </Card>
        </div>
      </VendedorLayout>
    );
  }

  if (isLoading) {
    return (
      <VendedorLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VendedorLayout>
    );
  }

  return (
    <VendedorLayout
      vendedorNome={vendedor?.nome}
      onLogout={() => {
        localStorage.removeItem('vendedor_token');
        navigate('/login');
      }}
    >
      <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Minhas Visitas</h2>
            <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
          </div>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button size="lg"><Plus className="mr-2 h-5 w-5" />Nova Visita</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Visita Técnica</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Condomínio *</Label>
                  <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Ex: Residencial Aurora" />
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input value={newEndereco} onChange={e => setNewEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" />
                </div>
                <div>
                  <Label>Email do Cliente</Label>
                  <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="sindico@email.com" type="email" />
                </div>
                <div>
                  <Label>Telefone do Cliente</Label>
                  <Input value={newTelefone} onChange={e => setNewTelefone(e.target.value)} placeholder="(11) 99999-9999" />
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full" size="lg">
                  {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : 'Iniciar Visita'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {sessoes.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto" />
              <div>
                <h3 className="font-semibold text-foreground">Nenhuma visita recente</h3>
                <p className="text-sm text-muted-foreground">Clique em "Nova Visita" para iniciar uma visita técnica guiada por IA.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessoes.map(s => {
              const st = statusLabel(s.status);
              return (
                <Card
                  key={s.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/vendedor/${token}/chat/${s.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{s.nome_cliente}</h3>
                          <Badge variant={st.variant} className="shrink-0">{st.label}</Badge>
                        </div>
                        {s.endereco_condominio && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                            <MapPin className="h-3 w-3" />{s.endereco_condominio}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </VendedorLayout>
  );
}
