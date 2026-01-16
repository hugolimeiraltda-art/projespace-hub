import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft,
  MessageSquareWarning,
  Star,
  ThumbsUp,
  RefreshCw,
  ClipboardCheck,
  Loader2,
  Building2,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import { format, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  filial: string | null;
  unidades: number | null;
  data_ativacao: string | null;
  data_termino: string | null;
  endereco: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  tipo: string | null;
  sistema: string | null;
}

export default function SucessoClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [reclamacaoDialogOpen, setReclamacaoDialogOpen] = useState(false);
  const [npsDialogOpen, setNpsDialogOpen] = useState(false);
  const [satisfacaoDialogOpen, setSatisfacaoDialogOpen] = useState(false);
  const [depoimentoDialogOpen, setDepoimentoDialogOpen] = useState(false);
  const [renovacaoDialogOpen, setRenovacaoDialogOpen] = useState(false);
  
  // Form states
  const [reclamacaoForm, setReclamacaoForm] = useState({ assunto: '', descricao: '', prioridade: 'media' });
  const [npsForm, setNpsForm] = useState({ nota: '', comentario: '' });
  const [satisfacaoForm, setSatisfacaoForm] = useState({ nota: '', aspectos: '', sugestoes: '' });
  const [depoimentoForm, setDepoimentoForm] = useState({ texto: '', autor: '', cargo: '' });
  const [renovacaoForm, setRenovacaoForm] = useState({ observacoes: '', novaData: '' });

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  // Open dialog based on URL action parameter
  useEffect(() => {
    const action = searchParams.get('action');
    if (action && customer) {
      switch (action) {
        case 'reclamacao':
          setReclamacaoDialogOpen(true);
          break;
        case 'nps':
          setNpsDialogOpen(true);
          break;
        case 'depoimento':
          setDepoimentoDialogOpen(true);
          break;
        case 'satisfacao':
          setSatisfacaoDialogOpen(true);
          break;
      }
    }
  }, [searchParams, customer]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_portfolio')
        .select('id, contrato, razao_social, filial, unidades, data_ativacao, data_termino, endereco, contato_nome, contato_telefone, tipo, sistema')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast({
        title: 'Erro ao carregar cliente',
        description: 'Não foi possível carregar os dados do cliente.',
        variant: 'destructive',
      });
      navigate('/sucesso-cliente');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const calculateTermino = () => {
    if (!customer) return '-';
    if (customer.data_termino) {
      return formatDate(customer.data_termino);
    }
    if (!customer.data_ativacao) return '-';
    try {
      const dataInicio = parseISO(customer.data_ativacao);
      const dataTermino = addMonths(dataInicio, 36);
      return format(dataTermino, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const handleSubmitReclamacao = () => {
    toast({
      title: 'Reclamação registrada',
      description: 'A reclamação foi registrada com sucesso.',
    });
    setReclamacaoDialogOpen(false);
    setReclamacaoForm({ assunto: '', descricao: '', prioridade: 'media' });
  };

  const handleSubmitNps = () => {
    toast({
      title: 'Pesquisa NPS registrada',
      description: 'A pesquisa de NPS foi registrada com sucesso.',
    });
    setNpsDialogOpen(false);
    setNpsForm({ nota: '', comentario: '' });
  };

  const handleSubmitSatisfacao = () => {
    toast({
      title: 'Pesquisa de Satisfação registrada',
      description: 'A pesquisa de satisfação foi registrada com sucesso.',
    });
    setSatisfacaoDialogOpen(false);
    setSatisfacaoForm({ nota: '', aspectos: '', sugestoes: '' });
  };

  const handleSubmitDepoimento = () => {
    toast({
      title: 'Depoimento registrado',
      description: 'O depoimento foi registrado com sucesso.',
    });
    setDepoimentoDialogOpen(false);
    setDepoimentoForm({ texto: '', autor: '', cargo: '' });
  };

  const handleSubmitRenovacao = () => {
    toast({
      title: 'Processo de Renovação iniciado',
      description: 'O processo de renovação foi iniciado com sucesso.',
    });
    setRenovacaoDialogOpen(false);
    setRenovacaoForm({ observacoes: '', novaData: '' });
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Cliente não encontrado.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sucesso-cliente')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{customer.razao_social}</h1>
            <p className="text-muted-foreground">Sucesso do Cliente - Contrato {customer.contrato}</p>
          </div>
        </div>

        {/* Customer Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Filial</p>
                  <p className="font-medium">{customer.filial || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Unidades</p>
                  <p className="font-medium">{customer.unidades || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Término do Contrato</p>
                  <p className="font-medium">{calculateTermino()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Contato</p>
                  <p className="font-medium">{customer.contato_nome || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">{customer.tipo || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sistema</p>
                <p className="font-medium">{customer.sistema || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <h2 className="text-lg font-semibold mb-4">Ações de Sucesso do Cliente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Reclamação */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-red-500"
            onClick={() => setReclamacaoDialogOpen(true)}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-red-500" />
                Abrir Reclamação
              </CardTitle>
              <CardDescription>
                Registre uma reclamação ou problema reportado pelo cliente
              </CardDescription>
            </CardHeader>
          </Card>

          {/* NPS */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-purple-500"
            onClick={() => setNpsDialogOpen(true)}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-500" />
                Pesquisa de NPS
              </CardTitle>
              <CardDescription>
                Registre a nota NPS e feedback do cliente
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Satisfação */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-blue-500"
            onClick={() => setSatisfacaoDialogOpen(true)}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                Pesquisa de Satisfação
              </CardTitle>
              <CardDescription>
                Registre uma pesquisa completa de satisfação
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Depoimento */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-green-500"
            onClick={() => setDepoimentoDialogOpen(true)}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-500" />
                Registrar Depoimento
              </CardTitle>
              <CardDescription>
                Registre elogios e depoimentos do síndico ou moradores
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Renovação */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-amber-500"
            onClick={() => setRenovacaoDialogOpen(true)}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                Processo de Renovação
              </CardTitle>
              <CardDescription>
                Inicie o processo de renovação do contrato
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Reclamação Dialog */}
        <Dialog open={reclamacaoDialogOpen} onOpenChange={setReclamacaoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-red-500" />
                Abrir Reclamação
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="assunto">Assunto</Label>
                <Input
                  id="assunto"
                  value={reclamacaoForm.assunto}
                  onChange={(e) => setReclamacaoForm({ ...reclamacaoForm, assunto: e.target.value })}
                  placeholder="Resumo da reclamação"
                />
              </div>
              <div>
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select 
                  value={reclamacaoForm.prioridade} 
                  onValueChange={(v) => setReclamacaoForm({ ...reclamacaoForm, prioridade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={reclamacaoForm.descricao}
                  onChange={(e) => setReclamacaoForm({ ...reclamacaoForm, descricao: e.target.value })}
                  placeholder="Descreva a reclamação em detalhes"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReclamacaoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitReclamacao}>Registrar Reclamação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NPS Dialog */}
        <Dialog open={npsDialogOpen} onOpenChange={setNpsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-500" />
                Pesquisa de NPS
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nota NPS (0-10)</Label>
                <p className="text-sm text-muted-foreground mb-2">De 0 a 10, qual a probabilidade de recomendar nossos serviços?</p>
                <div className="flex gap-2 flex-wrap">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <Button
                      key={n}
                      variant={npsForm.nota === String(n) ? 'default' : 'outline'}
                      size="sm"
                      className="w-10 h-10"
                      onClick={() => setNpsForm({ ...npsForm, nota: String(n) })}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="comentarioNps">Comentário</Label>
                <Textarea
                  id="comentarioNps"
                  value={npsForm.comentario}
                  onChange={(e) => setNpsForm({ ...npsForm, comentario: e.target.value })}
                  placeholder="Comentário adicional do cliente"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNpsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitNps}>Registrar NPS</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Satisfação Dialog */}
        <Dialog open={satisfacaoDialogOpen} onOpenChange={setSatisfacaoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                Pesquisa de Satisfação
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nota Geral (1-5)</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      variant={satisfacaoForm.nota === String(n) ? 'default' : 'outline'}
                      size="sm"
                      className="w-12 h-12"
                      onClick={() => setSatisfacaoForm({ ...satisfacaoForm, nota: String(n) })}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="aspectos">Aspectos Avaliados</Label>
                <Textarea
                  id="aspectos"
                  value={satisfacaoForm.aspectos}
                  onChange={(e) => setSatisfacaoForm({ ...satisfacaoForm, aspectos: e.target.value })}
                  placeholder="Quais aspectos foram avaliados?"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="sugestoes">Sugestões de Melhoria</Label>
                <Textarea
                  id="sugestoes"
                  value={satisfacaoForm.sugestoes}
                  onChange={(e) => setSatisfacaoForm({ ...satisfacaoForm, sugestoes: e.target.value })}
                  placeholder="Sugestões do cliente"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSatisfacaoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitSatisfacao}>Registrar Pesquisa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Depoimento Dialog */}
        <Dialog open={depoimentoDialogOpen} onOpenChange={setDepoimentoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-500" />
                Registrar Depoimento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="autor">Nome do Autor</Label>
                <Input
                  id="autor"
                  value={depoimentoForm.autor}
                  onChange={(e) => setDepoimentoForm({ ...depoimentoForm, autor: e.target.value })}
                  placeholder="Nome do síndico ou morador"
                />
              </div>
              <div>
                <Label htmlFor="cargo">Cargo/Função</Label>
                <Input
                  id="cargo"
                  value={depoimentoForm.cargo}
                  onChange={(e) => setDepoimentoForm({ ...depoimentoForm, cargo: e.target.value })}
                  placeholder="Ex: Síndico, Morador, Conselheiro"
                />
              </div>
              <div>
                <Label htmlFor="textoDepoimento">Depoimento</Label>
                <Textarea
                  id="textoDepoimento"
                  value={depoimentoForm.texto}
                  onChange={(e) => setDepoimentoForm({ ...depoimentoForm, texto: e.target.value })}
                  placeholder="Texto do depoimento ou elogio"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepoimentoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitDepoimento}>Registrar Depoimento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Renovação Dialog */}
        <Dialog open={renovacaoDialogOpen} onOpenChange={setRenovacaoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                Processo de Renovação
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Contrato atual termina em:</p>
                <p className="font-semibold">{calculateTermino()}</p>
              </div>
              <div>
                <Label htmlFor="novaData">Nova Data de Término</Label>
                <Input
                  id="novaData"
                  type="date"
                  value={renovacaoForm.novaData}
                  onChange={(e) => setRenovacaoForm({ ...renovacaoForm, novaData: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="obsRenovacao">Observações</Label>
                <Textarea
                  id="obsRenovacao"
                  value={renovacaoForm.observacoes}
                  onChange={(e) => setRenovacaoForm({ ...renovacaoForm, observacoes: e.target.value })}
                  placeholder="Observações sobre a renovação"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenovacaoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitRenovacao}>Iniciar Renovação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
