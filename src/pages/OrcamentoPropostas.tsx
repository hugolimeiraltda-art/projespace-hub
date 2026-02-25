import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { FileText, MessageSquare, Star, CheckCircle2, XCircle, AlertCircle, Eye, FolderPlus, Clock, ClipboardCheck, Download, Table2, MapPin, Loader2, LayoutGrid } from 'lucide-react';
import { EAPDialog } from '@/components/orcamento/EAPDialog';
import { format, addDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Sessao {
  id: string;
  nome_cliente: string;
  vendedor_nome: string | null;
  proposta_gerada: string | null;
  proposta_gerada_at: string | null;
  created_at: string;
  status: string;
  endereco_condominio: string | null;
}

interface Feedback {
  id: string;
  sessao_id: string;
  created_by_name: string;
  nota_precisao: number | null;
  acertos: string | null;
  erros: string | null;
  sugestoes: string | null;
  proposta_adequada: string;
  created_at: string;
}

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(star => (
      <button key={star} type="button" onClick={() => onChange(star)} className="p-0.5 transition-colors">
        <Star className={`w-6 h-6 ${star <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
      </button>
    ))}
  </div>
);

const getAdequacyBadge = (value: string) => {
  switch (value) {
    case 'sim': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Adequada</Badge>;
    case 'parcialmente': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertCircle className="w-3 h-3 mr-1" />Parcial</Badge>;
    case 'nao': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Inadequada</Badge>;
    default: return null;
  }
};

export default function OrcamentoPropostas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addProject } = useProjects();

  const [selectedSessao, setSelectedSessao] = useState<Sessao | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [projetoOpen, setProjetoOpen] = useState(false);
  const [eapSessao, setEapSessao] = useState<Sessao | null>(null);
  const [projetoSessao, setProjetoSessao] = useState<Sessao | null>(null);
  const [projetoCriando, setProjetoCriando] = useState(false);

  // Project creation form state
  const [projCidade, setProjCidade] = useState('');
  const [projEstado, setProjEstado] = useState('');
  const [projNome, setProjNome] = useState('');
  const [projEndereco, setProjEndereco] = useState('');

  const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  // Feedback form state
  const [propostaAdequada, setPropostaAdequada] = useState('');
  const [acertos, setAcertos] = useState('');
  const [erros, setErros] = useState('');
  const [sugestoes, setSugestoes] = useState('');
  const [notaPrecisao, setNotaPrecisao] = useState(0);

  const { data: sessoes, isLoading } = useQuery({
    queryKey: ['orcamento-propostas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamento_sessoes')
        .select('id, nome_cliente, vendedor_nome, proposta_gerada, proposta_gerada_at, created_at, status, endereco_condominio')
        .not('proposta_gerada', 'is', null)
        .order('proposta_gerada_at', { ascending: false });
      if (error) throw error;
      return data as Sessao[];
    },
  });

  const { data: feedbacks } = useQuery({
    queryKey: ['proposta-feedbacks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamento_proposta_feedbacks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Feedback[];
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!selectedSessao || !user) throw new Error('Missing data');
      const { error } = await supabase.from('orcamento_proposta_feedbacks').insert({
        sessao_id: selectedSessao.id,
        created_by: user.id,
        created_by_name: user.nome,
        proposta_adequada: propostaAdequada,
        acertos: acertos || null,
        erros: erros || null,
        sugestoes: sugestoes || null,
        nota_precisao: notaPrecisao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Avaliação registrada!', description: 'Suas informações serão usadas para melhorar as propostas futuras.' });
      queryClient.invalidateQueries({ queryKey: ['proposta-feedbacks'] });
      closeFeedbackDialog();
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível salvar a avaliação.', variant: 'destructive' });
    },
  });

  const closeFeedbackDialog = () => {
    setFeedbackOpen(false);
    setPropostaAdequada('');
    setAcertos('');
    setErros('');
    setSugestoes('');
    setNotaPrecisao(0);
  };

  const openFeedback = (sessao: Sessao) => {
    setSelectedSessao(sessao);
    setFeedbackOpen(true);
  };

  const handleVerProposta = (sessao: Sessao) => {
    navigate(`/orcamento-visita?sessao=${sessao.id}&ver=1`);
  };

  const openProjetoDialog = (sessao: Sessao) => {
    setProjetoSessao(sessao);
    setProjNome(sessao.nome_cliente);
    setProjEndereco(sessao.endereco_condominio || '');
    setProjCidade('');
    setProjEstado('');
    setProjetoOpen(true);
  };

  const handleCriarProjeto = async () => {
    if (!user || !projetoSessao) return;
    if (!projNome.trim() || !projCidade.trim() || !projEstado) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setProjetoCriando(true);
    try {
      const propostaResumo = projetoSessao.proposta_gerada || '';
      const observacoes = `[PROJETO_IA:${projetoSessao.id}]\n\nProjeto originado da proposta IA.\nProposta gerada em: ${projetoSessao.proposta_gerada_at ? format(new Date(projetoSessao.proposta_gerada_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}\nVendedor: ${projetoSessao.vendedor_nome || ''}\n\n${propostaResumo}`;

      const projectId = await addProject(
        {
          created_by_user_id: user.id,
          vendedor_nome: projetoSessao.vendedor_nome || user.nome,
          vendedor_email: user.email,
          cliente_condominio_nome: projNome,
          cliente_cidade: projCidade,
          cliente_estado: projEstado,
          endereco_condominio: projEndereco,
          status: 'ENVIADO',
          observacoes_gerais: observacoes,
          email_padrao_gerado: propostaResumo,
        },
        {
          solicitacao_origem: 'EMAIL' as any,
          modalidade_portaria: 'VIRTUAL' as any,
          portaria_virtual_atendimento_app: 'NAO' as any,
          numero_blocos: 1,
          interfonia: false,
          observacao_nao_assumir_cameras: false,
          marcacao_croqui_confirmada: false,
          marcacao_croqui_itens: [],
          cftv_elevador_possui: 'NAO_INFORMADO' as any,
        }
      );

      if (projectId) {
        // Notify projetistas
        try {
          await supabase.functions.invoke('notify-project-submitted', {
            body: {
              project_id: projectId,
              project_name: projNome,
              vendedor_name: projetoSessao.vendedor_nome || user.nome,
              vendedorEmail: user.email,
              cidade: projCidade,
              estado: projEstado,
              is_resubmission: false,
            },
          });
        } catch (err) {
          console.error('Error notifying team:', err);
        }

        toast({ title: 'Projeto criado e enviado!', description: 'O projetista foi notificado e já pode iniciar o trabalho.' });
        setProjetoOpen(false);
        navigate(`/projetos/${projectId}`);
      } else {
        throw new Error('Falha ao criar projeto');
      }
    } catch (error) {
      console.error('Error creating project from proposal:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar o projeto.', variant: 'destructive' });
    }
    setProjetoCriando(false);
  };

  const getFeedbackForSessao = (sessaoId: string) => {
    return feedbacks?.filter(f => f.sessao_id === sessaoId) || [];
  };

  const getAvaliacaoStatus = (sessao: Sessao) => {
    const sessFeedbacks = getFeedbackForSessao(sessao.id);
    if (sessFeedbacks.length > 0) {
      return { avaliada: true, feedbacks: sessFeedbacks };
    }
    // SLA: 1 day from proposal generation
    const baseDate = sessao.proposta_gerada_at ? new Date(sessao.proposta_gerada_at) : new Date(sessao.created_at);
    const slaDeadline = addDays(baseDate, 1);
    const slaExpirado = isPast(slaDeadline);
    return { avaliada: false, slaExpirado, slaDeadline };
  };

  const canSeeAll = user?.role === 'admin' || user?.role === 'projetos' || user?.role === 'gerente_comercial';

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas Geradas pela IA</h1>
          <p className="text-muted-foreground mt-1">
            Visualize todas as propostas comerciais geradas e forneça feedback para melhorar o aprendizado da IA.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{sessoes?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Propostas Geradas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{feedbacks?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Avaliações Realizadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {feedbacks?.filter(f => f.proposta_adequada === 'sim').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Adequadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {feedbacks?.filter(f => f.proposta_adequada === 'nao').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Inadequadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Proposals list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando propostas...</div>
        ) : !sessoes?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma proposta foi gerada pela IA ainda.</p>
              <p className="text-sm mt-1">Quando vendedores concluírem sessões de orçamento, as propostas aparecerão aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessoes.map(sessao => {
              const avaliacaoStatus = getAvaliacaoStatus(sessao);
              const hasFeedback = avaliacaoStatus.avaliada;
              const sessFeedbacks = hasFeedback ? (avaliacaoStatus as any).feedbacks as Feedback[] : [];

              return (
                <Card key={sessao.id} className="hover:shadow-md transition-shadow">
                   <CardContent className="py-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{sessao.nome_cliente}</h3>
                          {/* Avaliação status badge */}
                          {hasFeedback ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Avaliada
                            </Badge>
                          ) : (avaliacaoStatus as any).slaExpirado ? (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px]">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              SLA Vencido
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-[10px]">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendente até {format((avaliacaoStatus as any).slaDeadline, "dd/MM HH:mm", { locale: ptBR })}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {sessao.vendedor_nome && <span>Vendedor: {sessao.vendedor_nome}</span>}
                          {sessao.endereco_condominio && <span>• {sessao.endereco_condominio}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Proposta gerada em {sessao.proposta_gerada_at
                            ? format(new Date(sessao.proposta_gerada_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : format(new Date(sessao.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>

                      {/* Existing feedbacks */}
                      {hasFeedback && (
                        <div className="space-y-2">
                          {sessFeedbacks.map(fb => (
                            <div key={fb.id} className="p-2 bg-muted/50 rounded-lg border text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getAdequacyBadge(fb.proposta_adequada)}
                                {fb.nota_precisao && (
                                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star key={s} className={`w-3 h-3 ${s <= fb.nota_precisao! ? 'fill-primary text-primary' : 'text-muted-foreground/20'}`} />
                                    ))}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  por {fb.created_by_name} em {format(new Date(fb.created_at), 'dd/MM/yy', { locale: ptBR })}
                                </span>
                              </div>
                              {fb.acertos && <p className="mt-1 text-xs"><span className="text-green-600 font-medium">Acertos:</span> {fb.acertos}</p>}
                              {fb.erros && <p className="mt-0.5 text-xs"><span className="text-red-600 font-medium">Erros:</span> {fb.erros}</p>}
                              {fb.sugestoes && <p className="mt-0.5 text-xs"><span className="text-blue-600 font-medium">Sugestões:</span> {fb.sugestoes}</p>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Buttons - horizontal */}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleVerProposta(sessao)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Proposta
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEapSessao(sessao)}>
                          <LayoutGrid className="w-4 h-4 mr-1" />
                          Ver EAP
                        </Button>
                        {canSeeAll && (
                          <>
                            <Button
                              size="sm"
                              variant={hasFeedback ? 'outline' : 'default'}
                              onClick={() => openFeedback(sessao)}
                            >
                              <ClipboardCheck className="w-4 h-4 mr-1" />
                              {hasFeedback ? 'Nova Avaliação' : 'Avaliação'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary text-primary hover:bg-primary/10"
                              onClick={() => openProjetoDialog(sessao)}
                            >
                              <FolderPlus className="w-4 h-4 mr-1" />
                              Abrir Projeto
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={(open) => { if (!open) closeFeedbackDialog(); else setFeedbackOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Avaliação de Proposta
            </DialogTitle>
            <DialogDescription>
              Avalie a proposta gerada pela IA para "{selectedSessao?.nome_cliente}".
              Esses dados serão usados como base de aprendizado para melhorar futuras propostas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-medium">A proposta estava adequada? *</Label>
              <RadioGroup value={propostaAdequada} onValueChange={setPropostaAdequada} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sim" id="prop-sim" />
                  <Label htmlFor="prop-sim">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="parcialmente" id="prop-parcial" />
                  <Label htmlFor="prop-parcial">Parcialmente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nao" id="prop-nao" />
                  <Label htmlFor="prop-nao">Não</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">O que a IA acertou?</Label>
              <Textarea
                value={acertos}
                onChange={e => setAcertos(e.target.value)}
                placeholder="Equipamentos corretos, quantidades certas, precificação adequada..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium">O que a IA errou?</Label>
              <Textarea
                value={erros}
                onChange={e => setErros(e.target.value)}
                placeholder="Produtos errados, quantidades incorretas, itens faltantes..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Sugestões de melhoria</Label>
              <Textarea
                value={sugestoes}
                onChange={e => setSugestoes(e.target.value)}
                placeholder="O que poderia ser diferente nas próximas propostas..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Nota de precisão (1-5)</Label>
              <StarRating value={notaPrecisao} onChange={setNotaPrecisao} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeFeedbackDialog}>Cancelar</Button>
            <Button
              onClick={() => submitFeedback.mutate()}
              disabled={!propostaAdequada || submitFeedback.isPending}
            >
              {submitFeedback.isPending ? 'Salvando...' : 'Enviar Avaliação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Creation Dialog */}
      <Dialog open={projetoOpen} onOpenChange={(open) => { if (!open) setProjetoOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Criar Projeto a partir da Proposta IA
            </DialogTitle>
            <DialogDescription>
              O projeto será enviado diretamente para o projetista com todos os dados da proposta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Identificação */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do Condomínio *</Label>
                  <Input value={projNome} onChange={e => setProjNome(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Endereço</Label>
                  <Input value={projEndereco} onChange={e => setProjEndereco(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cidade *</Label>
                  <Input value={projCidade} onChange={e => setProjCidade(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estado *</Label>
                  <Select value={projEstado} onValueChange={setProjEstado}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Projeto da IA */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Projeto da IA</h3>
              <p className="text-xs text-muted-foreground">
                Os seguintes dados serão anexados ao projeto para o projetista:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <FileText className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">Proposta Completa</p>
                  <p className="text-[10px] text-muted-foreground">Texto detalhado</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <Download className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">PDF da Proposta</p>
                  <p className="text-[10px] text-muted-foreground">Download disponível</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <Table2 className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">Planilha Excel</p>
                  <p className="text-[10px] text-muted-foreground">Equipamentos detalhados</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <MapPin className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs font-medium">EAP por Ambiente</p>
                  <p className="text-[10px] text-muted-foreground">Estrutura analítica</p>
                </div>
              </div>

              {projetoSessao?.proposta_gerada && (
                <div className="p-3 bg-muted/30 rounded-lg border max-h-40 overflow-y-auto">
                  <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-6">
                    {projetoSessao.proposta_gerada.substring(0, 500)}...
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Vendedor: {projetoSessao?.vendedor_nome || '—'}</span>
                {projetoSessao?.proposta_gerada_at && (
                  <>
                    <span>•</span>
                    <span>Proposta: {format(new Date(projetoSessao.proposta_gerada_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProjetoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriarProjeto} disabled={projetoCriando}>
              {projetoCriando ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Criando...</> : 'Criar Projeto e Enviar ao Projetista'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {eapSessao && (
        <EAPDialog
          open={!!eapSessao}
          onOpenChange={(open) => { if (!open) setEapSessao(null); }}
          sessaoId={eapSessao.id}
          nomeCliente={eapSessao.nome_cliente}
        />
      )}
    </Layout>
  );
}
