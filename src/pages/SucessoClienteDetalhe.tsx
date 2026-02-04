import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, MessageSquareWarning, Star, ThumbsUp, ClipboardCheck, Loader2 } from 'lucide-react';
import { CustomerInfoSection } from '@/components/sucesso-cliente/CustomerInfoSection';
import { CustomerHistorySection } from '@/components/sucesso-cliente/CustomerHistorySection';
import { RenovacaoSection } from '@/components/sucesso-cliente/RenovacaoSection';

interface Customer {
  id: string;
  contrato: string;
  razao_social: string;
  alarme_codigo: string | null;
  filial: string | null;
  unidades: number | null;
  tipo: string | null;
  data_ativacao: string | null;
  data_termino: string | null;
  endereco: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  sistema: string | null;
  noc: string | null;
  app: string | null;
  praca: string | null;
  mensalidade: number | null;
  taxa_ativacao: number | null;
  leitores: string | null;
  quantidade_leitores: number | null;
  transbordo: boolean | null;
  gateway: boolean | null;
  portoes: number | null;
  portas: number | null;
  dvr_nvr: number | null;
  cameras: number | null;
  zonas_perimetro: number | null;
  cancelas: number | null;
  totem_simples: number | null;
  totem_duplo: number | null;
  catracas: number | null;
  faciais_hik: number | null;
  faciais_avicam: number | null;
  faciais_outros: number | null;
}

export default function SucessoClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dialog states for new records
  const [reclamacaoDialogOpen, setReclamacaoDialogOpen] = useState(false);
  const [npsDialogOpen, setNpsDialogOpen] = useState(false);
  const [satisfacaoDialogOpen, setSatisfacaoDialogOpen] = useState(false);
  const [depoimentoDialogOpen, setDepoimentoDialogOpen] = useState(false);
  
  // Form states
  const [reclamacaoForm, setReclamacaoForm] = useState({ assunto: '', descricao: '', prioridade: 'media' });
  const [npsForm, setNpsForm] = useState({ nota: '', comentario: '', ponto_forte: '', ponto_fraco: '' });
  const [satisfacaoForm, setSatisfacaoForm] = useState({
    tempoImplantacao: '', ambienteOrganizado: '', pendencias: '', comunicacao: '',
    facilidadeApp: '', funcionalidadesSindico: '', treinamentoAdequado: '', expectativaAtendida: '', notaNps: ''
  });
  const [depoimentoForm, setDepoimentoForm] = useState({ texto: '', autor: '', cargo: '', tipo: 'elogio' });

  // Key for forcing history refresh
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    if (id) fetchCustomer();
  }, [id]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action && customer) {
      switch (action) {
        case 'reclamacao': setReclamacaoDialogOpen(true); break;
        case 'nps': setNpsDialogOpen(true); break;
        case 'depoimento': setDepoimentoDialogOpen(true); break;
        case 'satisfacao': setSatisfacaoDialogOpen(true); break;
      }
    }
  }, [searchParams, customer]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_portfolio')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast({ title: 'Erro ao carregar cliente', description: 'Cliente não encontrado.', variant: 'destructive' });
      navigate('/sucesso-cliente');
    } finally {
      setLoading(false);
    }
  };

  const refreshHistory = () => setHistoryKey((k) => k + 1);

  const handleSubmitReclamacao = async () => {
    try {
      const { error } = await supabase.from('customer_chamados').insert({
        customer_id: id, assunto: reclamacaoForm.assunto,
        descricao: reclamacaoForm.descricao || null, prioridade: reclamacaoForm.prioridade,
      });
      if (error) throw error;
      toast({ title: 'Reclamação registrada' });
      setReclamacaoDialogOpen(false);
      setReclamacaoForm({ assunto: '', descricao: '', prioridade: 'media' });
      refreshHistory();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar.', variant: 'destructive' });
    }
  };

  const handleSubmitNps = async () => {
    try {
      const { error } = await supabase.from('customer_nps').insert({
        customer_id: id, nota: parseInt(npsForm.nota),
        comentario: npsForm.comentario || null,
        ponto_forte: npsForm.ponto_forte || null,
        ponto_fraco: npsForm.ponto_fraco || null,
      });
      if (error) throw error;
      toast({ title: 'NPS registrado' });
      setNpsDialogOpen(false);
      setNpsForm({ nota: '', comentario: '', ponto_forte: '', ponto_fraco: '' });
      refreshHistory();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar.', variant: 'destructive' });
    }
  };

  const handleSubmitSatisfacao = async () => {
    try {
      const { error } = await supabase.from('customer_satisfacao').insert({
        customer_id: id,
        tempo_implantacao: satisfacaoForm.tempoImplantacao || null,
        ambiente_organizado: satisfacaoForm.ambienteOrganizado || null,
        pendencias: satisfacaoForm.pendencias || null,
        comunicacao: satisfacaoForm.comunicacao || null,
        facilidade_app: satisfacaoForm.facilidadeApp || null,
        funcionalidades_sindico: satisfacaoForm.funcionalidadesSindico || null,
        treinamento_adequado: satisfacaoForm.treinamentoAdequado || null,
        expectativa_atendida: satisfacaoForm.expectativaAtendida || null,
        nota_nps: satisfacaoForm.notaNps ? parseInt(satisfacaoForm.notaNps) : null,
      });
      if (error) throw error;
      toast({ title: 'Pesquisa registrada' });
      setSatisfacaoDialogOpen(false);
      setSatisfacaoForm({ tempoImplantacao: '', ambienteOrganizado: '', pendencias: '', comunicacao: '', facilidadeApp: '', funcionalidadesSindico: '', treinamentoAdequado: '', expectativaAtendida: '', notaNps: '' });
      refreshHistory();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar.', variant: 'destructive' });
    }
  };

  const handleSubmitDepoimento = async () => {
    try {
      const { error } = await supabase.from('customer_depoimentos').insert({
        customer_id: id, texto: depoimentoForm.texto,
        autor: depoimentoForm.autor, cargo: depoimentoForm.cargo || null, tipo: depoimentoForm.tipo,
      });
      if (error) throw error;
      toast({ title: 'Depoimento registrado' });
      setDepoimentoDialogOpen(false);
      setDepoimentoForm({ texto: '', autor: '', cargo: '', tipo: 'elogio' });
      refreshHistory();
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  if (!customer) {
    return (
      <Layout>
        <div className="p-6 text-center"><p className="text-muted-foreground">Cliente não encontrado.</p></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/sucesso-cliente')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{customer.razao_social}</h1>
            <p className="text-muted-foreground">Sucesso do Cliente - Contrato {customer.contrato}</p>
          </div>
        </div>

        {/* Customer Full Info */}
        <CustomerInfoSection customer={customer} onUpdate={fetchCustomer} />

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-red-500" onClick={() => setReclamacaoDialogOpen(true)}>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquareWarning className="w-4 h-4 text-red-500" /> Nova Reclamação
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-purple-500" onClick={() => setNpsDialogOpen(true)}>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-500" /> Pesquisa NPS
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-blue-500" onClick={() => setSatisfacaoDialogOpen(true)}>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-blue-500" /> Pesquisa Satisfação
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-l-green-500" onClick={() => setDepoimentoDialogOpen(true)}>
              <CardHeader className="py-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-green-500" /> Novo Depoimento
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* History Section */}
        <CustomerHistorySection key={historyKey} customerId={customer.id} />

        {/* Renovação Section */}
        <RenovacaoSection
          customerId={customer.id}
          dataAtivacao={customer.data_ativacao}
          dataTermino={customer.data_termino}
          onUpdate={fetchCustomer}
        />

        {/* New Reclamação Dialog */}
        <Dialog open={reclamacaoDialogOpen} onOpenChange={setReclamacaoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-red-500" /> Nova Reclamação
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Assunto</Label>
                <Input value={reclamacaoForm.assunto} onChange={(e) => setReclamacaoForm({ ...reclamacaoForm, assunto: e.target.value })} placeholder="Resumo da reclamação" />
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={reclamacaoForm.prioridade} onValueChange={(v) => setReclamacaoForm({ ...reclamacaoForm, prioridade: v })}>
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
                <Label>Descrição</Label>
                <Textarea value={reclamacaoForm.descricao} onChange={(e) => setReclamacaoForm({ ...reclamacaoForm, descricao: e.target.value })} rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReclamacaoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitReclamacao}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New NPS Dialog */}
        <Dialog open={npsDialogOpen} onOpenChange={setNpsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-500" /> Pesquisa de NPS
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nota NPS (0-10)</Label>
                <div className="flex gap-2 flex-wrap mt-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <Button key={n} variant={npsForm.nota === String(n) ? 'default' : 'outline'} size="sm" className="w-10 h-10" onClick={() => setNpsForm({ ...npsForm, nota: String(n) })}>
                      {n}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Ponto Forte</Label>
                <Input value={npsForm.ponto_forte} onChange={(e) => setNpsForm({ ...npsForm, ponto_forte: e.target.value })} placeholder="O que o cliente mais gostou" />
              </div>
              <div>
                <Label>Ponto Fraco</Label>
                <Input value={npsForm.ponto_fraco} onChange={(e) => setNpsForm({ ...npsForm, ponto_fraco: e.target.value })} placeholder="O que pode melhorar" />
              </div>
              <div>
                <Label>Comentário</Label>
                <Textarea value={npsForm.comentario} onChange={(e) => setNpsForm({ ...npsForm, comentario: e.target.value })} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNpsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitNps}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Satisfação Dialog */}
        <Dialog open={satisfacaoDialogOpen} onOpenChange={setSatisfacaoDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" /> Pesquisa de Satisfação
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tempo de implantação atendeu expectativa?</Label>
                  <Select value={satisfacaoForm.tempoImplantacao} onValueChange={(v) => setSatisfacaoForm({ ...satisfacaoForm, tempoImplantacao: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ambiente organizado após instalação?</Label>
                  <Select value={satisfacaoForm.ambienteOrganizado} onValueChange={(v) => setSatisfacaoForm({ ...satisfacaoForm, ambienteOrganizado: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Treinamento foi adequado?</Label>
                  <Select value={satisfacaoForm.treinamentoAdequado} onValueChange={(v) => setSatisfacaoForm({ ...satisfacaoForm, treinamentoAdequado: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expectativa atendida?</Label>
                  <Select value={satisfacaoForm.expectativaAtendida} onValueChange={(v) => setSatisfacaoForm({ ...satisfacaoForm, expectativaAtendida: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Facilidade do App morador</Label>
                  <Select value={satisfacaoForm.facilidadeApp} onValueChange={(v) => setSatisfacaoForm({ ...satisfacaoForm, facilidadeApp: v })}>
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
                  <Label>Nota NPS (1-10)</Label>
                  <Select value={satisfacaoForm.notaNps} onValueChange={(v) => setSatisfacaoForm({ ...satisfacaoForm, notaNps: v })}>
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
                <Label>Pendências existentes</Label>
                <Textarea value={satisfacaoForm.pendencias} onChange={(e) => setSatisfacaoForm({ ...satisfacaoForm, pendencias: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Comunicação - pontos a melhorar</Label>
                <Textarea value={satisfacaoForm.comunicacao} onChange={(e) => setSatisfacaoForm({ ...satisfacaoForm, comunicacao: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>Funcionalidades do síndico - úteis/faltantes</Label>
                <Textarea value={satisfacaoForm.funcionalidadesSindico} onChange={(e) => setSatisfacaoForm({ ...satisfacaoForm, funcionalidadesSindico: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSatisfacaoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitSatisfacao}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Depoimento Dialog */}
        <Dialog open={depoimentoDialogOpen} onOpenChange={setDepoimentoDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-green-500" /> Novo Depoimento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Autor</Label>
                  <Input value={depoimentoForm.autor} onChange={(e) => setDepoimentoForm({ ...depoimentoForm, autor: e.target.value })} placeholder="Nome" />
                </div>
                <div>
                  <Label>Cargo/Função</Label>
                  <Input value={depoimentoForm.cargo} onChange={(e) => setDepoimentoForm({ ...depoimentoForm, cargo: e.target.value })} placeholder="Ex: Síndico" />
                </div>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={depoimentoForm.tipo} onValueChange={(v) => setDepoimentoForm({ ...depoimentoForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elogio">Elogio</SelectItem>
                    <SelectItem value="sugestao">Sugestão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Depoimento</Label>
                <Textarea value={depoimentoForm.texto} onChange={(e) => setDepoimentoForm({ ...depoimentoForm, texto: e.target.value })} rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepoimentoDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmitDepoimento}>Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
