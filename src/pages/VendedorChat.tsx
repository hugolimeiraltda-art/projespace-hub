import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendedorLayout } from '@/components/VendedorLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send, FileText, Loader2, Bot, User, Paperclip, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orcamento-chat`;

export default function VendedorChat() {
  const { token, sessaoId } = useParams<{ token: string; sessaoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [vendedorNome, setVendedorNome] = useState('');
  const [uploading, setUploading] = useState(false);
  const [proposta, setProposta] = useState<string | null>(null);
  const [gerandoProposta, setGerandoProposta] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!token || !sessaoId) return;

    (async () => {
      // Validate access token
      const { data: tokenData } = await supabase
        .from('vendedor_acesso_tokens' as any)
        .select('vendedor_id, vendedor_nome')
        .eq('token', token)
        .eq('ativo', true)
        .single();

      if (!tokenData) {
        setSessionValid(false);
        setInitialLoading(false);
        return;
      }

      const td = tokenData as any;
      setVendedorNome(td.vendedor_nome);

      // Verify session belongs to this vendedor
      const { data: sessaoData } = await supabase
        .from('orcamento_sessoes')
        .select('id, vendedor_id, status, proposta_gerada')
        .eq('id', sessaoId)
        .eq('vendedor_id', td.vendedor_id)
        .single();

      if (!sessaoData) {
        setSessionValid(false);
        setInitialLoading(false);
        return;
      }

      if (sessaoData.proposta_gerada) {
        setProposta(sessaoData.proposta_gerada);
      }

      // Load existing messages
      const { data: existingMsgs } = await supabase
        .from('orcamento_mensagens')
        .select('role, content')
        .eq('sessao_id', sessaoId)
        .order('created_at', { ascending: true });

      if (existingMsgs && existingMsgs.length > 0) {
        setMessages(existingMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
        setSessionValid(true);
        setInitialLoading(false);
      } else {
        setInitialLoading(false);
        sendMessage('Olá, estou no local para a visita técnica.', true);
      }
    })();
  }, [token, sessaoId]);

  const sendMessage = async (text: string, isInitial = false) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = isInitial ? [] : [...messages, userMsg];
    if (!isInitial) setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          sessao_id: sessaoId,
          messages: isInitial
            ? [{ role: 'user', content: text }]
            : newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (resp.status === 404) { setSessionValid(false); setIsLoading(false); return; }
      if (resp.status === 429 || resp.status === 402) {
        const err = await resp.json();
        toast({ title: 'Erro', description: err.error, variant: 'destructive' });
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error('Failed');
      setSessionValid(true);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantSoFar = '';

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' });
    }
    setIsLoading(false);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !sessaoId) return;
    setUploading(true);
    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${sessaoId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('orcamento-midias').upload(path, file);
      if (error) { toast({ title: `Erro: ${file.name}`, variant: 'destructive' }); continue; }

      const tipo = file.type.startsWith('image') ? 'foto' : file.type.startsWith('video') ? 'video' : 'outro';
      await supabase.from('orcamento_midias').insert({
        sessao_id: sessaoId,
        tipo,
        arquivo_url: path,
        nome_arquivo: file.name,
        tamanho: file.size,
      });
      uploaded.push(`[${tipo}: ${file.name}]`);
    }

    if (uploaded.length > 0) sendMessage(`Enviei ${uploaded.length} arquivo(s): ${uploaded.join(', ')}`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const gerarProposta = async () => {
    setGerandoProposta(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ sessao_id: sessaoId, messages, action: 'gerar_proposta' }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        toast({ title: 'Erro', description: err.error, variant: 'destructive' });
        setGerandoProposta(false);
        return;
      }
      const data = await resp.json();
      setProposta(data.proposta);
    } catch {
      toast({ title: 'Erro ao gerar proposta', variant: 'destructive' });
    }
    setGerandoProposta(false);
  };

  if (initialLoading) {
    return (
      <VendedorLayout vendedorNome={vendedorNome}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VendedorLayout>
    );
  }

  if (sessionValid === false) {
    return (
      <VendedorLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center space-y-4">
              <h2 className="text-xl font-semibold">Sessão inválida</h2>
              <p className="text-muted-foreground">Esta sessão não foi encontrada ou você não tem acesso.</p>
              <Button onClick={() => navigate(`/vendedor/${token}`)}>Voltar</Button>
            </CardContent>
          </Card>
        </div>
      </VendedorLayout>
    );
  }

  if (proposta) {
    return (
      <VendedorLayout vendedorNome={vendedorNome}>
        <div className="flex-1 flex flex-col">
          <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setProposta(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" />Voltar ao Chat
            </Button>
            <h2 className="font-semibold">Proposta Comercial</h2>
            <div />
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
            <Card>
              <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{proposta}</ReactMarkdown>
              </CardContent>
            </Card>
          </div>
        </div>
      </VendedorLayout>
    );
  }

  return (
    <VendedorLayout vendedorNome={vendedorNome}>
      <div className="flex-1 flex flex-col">
        <div className="border-b bg-card px-4 py-3 flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/vendedor/${token}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" />Voltar
          </Button>
          {messages.length >= 6 && (
            <Button size="sm" onClick={gerarProposta} disabled={gerandoProposta}>
              {gerandoProposta ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><FileText className="mr-2 h-4 w-4" />Gerar Proposta</>}
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:m-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-card p-4 shrink-0">
          <form
            className="max-w-3xl mx-auto flex gap-2"
            onSubmit={e => { e.preventDefault(); sendMessage(input); }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </VendedorLayout>
  );
}
