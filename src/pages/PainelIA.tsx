import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, MessageSquare, Image, Video, FileText, Send, Database, Brain, DollarSign, TrendingUp, Loader2, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { AILearningActivity } from '@/components/AILearningActivity';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function PainelIA() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch AI stats
  const { data: stats } = useQuery({
    queryKey: ['ai-panel-stats'],
    queryFn: async () => {
      const [
        { count: totalSessoes },
        { count: totalMensagens },
        { count: msgsUser },
        { count: msgsAssistant },
        { count: totalMidias },
        { count: midiasImagem },
        { count: midiasVideo },
        { count: propostasGeradas },
        { count: produtosAtivos },
        { count: kitsAtivos },
        { count: clientesCarteira },
        { count: projetos },
        { count: regrasPreco },
      ] = await Promise.all([
        supabase.from('orcamento_sessoes').select('*', { count: 'exact', head: true }),
        supabase.from('orcamento_mensagens').select('*', { count: 'exact', head: true }),
        supabase.from('orcamento_mensagens').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('orcamento_mensagens').select('*', { count: 'exact', head: true }).eq('role', 'assistant'),
        supabase.from('orcamento_midias').select('*', { count: 'exact', head: true }),
        supabase.from('orcamento_midias').select('*', { count: 'exact', head: true }).eq('tipo', 'image'),
        supabase.from('orcamento_midias').select('*', { count: 'exact', head: true }).eq('tipo', 'video'),
        supabase.from('orcamento_sessoes').select('*', { count: 'exact', head: true }).not('proposta_gerada', 'is', null),
        supabase.from('orcamento_produtos').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('orcamento_kits').select('*', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('customer_portfolio').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('orcamento_regras_precificacao').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalSessoes: totalSessoes || 0,
        totalMensagens: totalMensagens || 0,
        msgsUser: msgsUser || 0,
        msgsAssistant: msgsAssistant || 0,
        totalMidias: totalMidias || 0,
        midiasImagem: midiasImagem || 0,
        midiasVideo: midiasVideo || 0,
        propostasGeradas: propostasGeradas || 0,
        produtosAtivos: produtosAtivos || 0,
        kitsAtivos: kitsAtivos || 0,
        clientesCarteira: clientesCarteira || 0,
        projetos: projetos || 0,
        regrasPreco: regrasPreco || 0,
      };
    },
  });

  // Fetch recent sessions for activity
  const { data: recentSessions } = useQuery({
    queryKey: ['ai-panel-recent'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orcamento_sessoes')
        .select('id, nome_cliente, status, created_at, vendedor_nome, proposta_gerada_at')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: AIMessage = { role: 'user', content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/painel-ia-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao comunicar com a IA');
      }

      // Stream response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {}
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao comunicar com a IA');
    } finally {
      setIsLoading(false);
    }
  };

  const dataSources = [
    { name: 'orcamento_produtos', desc: 'Catálogo de Produtos', count: stats?.produtosAtivos || 0, icon: FileText, status: 'active' as const },
    { name: 'orcamento_kits', desc: 'Kits de Equipamentos', count: stats?.kitsAtivos || 0, icon: FileText, status: 'active' as const },
    { name: 'customer_portfolio', desc: 'Carteira de Clientes', count: stats?.clientesCarteira || 0, icon: Database, status: 'active' as const },
    { name: 'projects + sale_forms', desc: 'Projetos e Formulários', count: stats?.projetos || 0, icon: Database, status: 'active' as const },
    { name: 'orcamento_regras_precificacao', desc: 'Regras de Precificação', count: stats?.regrasPreco || 0, icon: DollarSign, status: 'active' as const },
    { name: 'orcamento_sessoes', desc: 'Histórico de Sessões', count: stats?.totalSessoes || 0, icon: MessageSquare, status: 'active' as const },
    { name: 'orcamento_midias', desc: 'Fotos e Vídeos das Visitas', count: stats?.totalMidias || 0, icon: Image, status: 'active' as const },
    { name: 'Treinamento PDF', desc: 'Conhecimento de Produtos Emive', count: 9, icon: Brain, status: 'trained' as const },
  ];

  const estimatedCostPerInteraction = 0.003; // rough estimate per message

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de IA</h1>
            <p className="text-sm text-muted-foreground">Monitoramento de interações, custos e fontes de dados da inteligência artificial</p>
          </div>
        </div>

        {/* KPI Cards Row 1 - Interactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total de Sessões</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalSessoes || 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Interações no Chat</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalMensagens || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.msgsUser || 0} do vendedor · {stats?.msgsAssistant || 0} da IA
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Mídias Enviadas</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.totalMidias || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    📷 {stats?.midiasImagem || 0} fotos · 🎥 {stats?.midiasVideo || 0} vídeos
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Image className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Propostas Geradas</p>
                  <p className="text-2xl font-bold text-foreground">{stats?.propostasGeradas || 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-accent">
                  <Sparkles className="w-5 h-5 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards Row 2 - Costs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Custo Estimado Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${((stats?.totalMensagens || 0) * estimatedCostPerInteraction).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">~$0.003 por mensagem (GPT-5-mini)</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <DollarSign className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Custo por Texto</p>
                  <p className="text-2xl font-bold text-foreground">~$0.003</p>
                  <p className="text-xs text-muted-foreground mt-1">Modelo: openai/gpt-5-mini (streaming)</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Custo por Proposta</p>
                  <p className="text-2xl font-bold text-foreground">~$0.01</p>
                  <p className="text-xs text-muted-foreground mt-1">Modelo: google/gemini-2.5-flash</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Activity */}
        <AILearningActivity />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Sources & Learning Status */}
          <Card className="lg:row-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                Fontes de Dados & Status do Aprendizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dataSources.map((source) => {
                  const Icon = source.icon;
                  return (
                    <div key={source.name} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                      <div className="p-1.5 rounded bg-primary/10">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{source.desc}</p>
                        <p className="text-xs text-muted-foreground font-mono">{source.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{source.count}</span>
                        <Badge variant={source.status === 'trained' ? 'default' : 'secondary'} className="text-[10px]">
                          {source.status === 'trained' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Treinado</>
                          ) : (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Ativo</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Modelos em Uso</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded border border-border">
                    <div>
                      <p className="text-sm font-medium">openai/gpt-5-mini</p>
                      <p className="text-xs text-muted-foreground">Chat de orçamento (streaming)</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-700 border-green-200">Ativo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border border-border">
                    <div>
                      <p className="text-sm font-medium">google/gemini-2.5-flash</p>
                      <p className="text-xs text-muted-foreground">Geração de propostas e extração de equipamentos</p>
                    </div>
                    <Badge className="bg-green-500/10 text-green-700 border-green-200">Ativo</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Direct AI Chat */}
          <Card className="lg:row-span-2 flex flex-col" style={{ minHeight: '500px' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Perguntar à IA
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Faça perguntas sobre produtos, preços, kits, regras de precificação ou qualquer assunto da Emive.
              </p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 pt-0">
              <ScrollArea className="flex-1 pr-3 mb-3" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma pergunta ainda.</p>
                      <p className="text-xs mt-1">Ex: "Qual a diferença entre portaria digital e remota?"</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/30 border border-border text-foreground'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                      <div className="bg-muted/30 border border-border rounded-lg p-3">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte sobre produtos, preços, kits..."
                  className="resize-none min-h-[44px] max-h-[100px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" className="shrink-0">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        {recentSessions && recentSessions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <Bot className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{session.nome_cliente}</p>
                        <p className="text-xs text-muted-foreground">
                          Vendedor: {session.vendedor_nome || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={session.proposta_gerada_at ? 'default' : 'secondary'} className="text-[10px]">
                        {session.proposta_gerada_at ? 'Proposta Gerada' : session.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
