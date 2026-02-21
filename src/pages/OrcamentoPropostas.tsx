import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { FileText, MessageSquare, Star, CheckCircle2, XCircle, AlertCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
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

export default function OrcamentoPropostas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSessao, setSelectedSessao] = useState<Sessao | null>(null);
  const [viewPropostaOpen, setViewPropostaOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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
      toast({ title: 'Feedback registrado!', description: 'Suas informações serão usadas para melhorar as propostas futuras.' });
      queryClient.invalidateQueries({ queryKey: ['proposta-feedbacks'] });
      closeFeedbackDialog();
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível salvar o feedback.', variant: 'destructive' });
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

  const openProposta = (sessao: Sessao) => {
    setSelectedSessao(sessao);
    setViewPropostaOpen(true);
  };

  const getFeedbackForSessao = (sessaoId: string) => {
    return feedbacks?.filter(f => f.sessao_id === sessaoId) || [];
  };

  const getAdequacyBadge = (value: string) => {
    switch (value) {
      case 'sim': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="w-3 h-3 mr-1" />Adequada</Badge>;
      case 'parcialmente': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><AlertCircle className="w-3 h-3 mr-1" />Parcial</Badge>;
      case 'nao': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Inadequada</Badge>;
      default: return null;
    }
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)} className="p-0.5 transition-colors">
          <Star className={`w-6 h-6 ${star <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
        </button>
      ))}
    </div>
  );

  const isAdmin = user?.role === 'admin';

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
                <MessageSquare className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{feedbacks?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Feedbacks Recebidos</p>
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
              const sessFeedbacks = getFeedbackForSessao(sessao.id);
              const hasFeedback = sessFeedbacks.length > 0;

              return (
                <Card key={sessao.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{sessao.nome_cliente}</h3>
                          {hasFeedback && (
                            <Badge variant="outline" className="text-[10px]">
                              {sessFeedbacks.length} feedback{sessFeedbacks.length > 1 ? 's' : ''}
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

                        {/* Existing feedbacks */}
                        {hasFeedback && (
                          <div className="mt-3 space-y-2">
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
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => openProposta(sessao)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                        {isAdmin && (
                          <Button size="sm" onClick={() => openFeedback(sessao)}>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Feedback
                          </Button>
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

      {/* View Proposal Dialog */}
      <Dialog open={viewPropostaOpen} onOpenChange={setViewPropostaOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proposta - {selectedSessao?.nome_cliente}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
            {selectedSessao?.proposta_gerada || 'Proposta não disponível.'}
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={(open) => { if (!open) closeFeedbackDialog(); else setFeedbackOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Feedback da Proposta
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
              {submitFeedback.isPending ? 'Salvando...' : 'Enviar Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

