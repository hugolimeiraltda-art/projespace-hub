import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send, FileText, Loader2, Bot, User, Paperclip, Mic, MicOff, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import emiveLogo from '@/assets/emive-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import PropostaView, { type PropostaData } from '@/components/orcamento/PropostaView';

type Msg = { role: 'user' | 'assistant'; content: string; midias?: MidiaRef[] };
type MidiaRef = { url: string; tipo: string; nome: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orcamento-chat`;

export default function OrcamentoChat() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposta, setProposta] = useState<PropostaData | null>(null);
  const [gerandoProposta, setGerandoProposta] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Resolve session from URL params or query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sessao');
    if (sid) {
      setSessaoId(sid);
      // Load existing messages first
      (async () => {
        const { data: existingMsgs } = await supabase
          .from('orcamento_mensagens')
          .select('role, content')
          .eq('sessao_id', sid)
          .order('created_at', { ascending: true });

        if (existingMsgs && existingMsgs.length > 0) {
          setMessages(existingMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
          setSessionValid(true);
        } else {
          sendMessage('Olá, estou no local para realizar o orçamento.', true, sid);
        }
      })();
    } else if (token) {
      // Token-based: load history too
      (async () => {
        const { data: sessaoData } = await supabase
          .from('orcamento_sessoes')
          .select('id')
          .eq('token', token)
          .eq('status', 'ativo')
          .single();

        if (sessaoData) {
          const { data: existingMsgs } = await supabase
            .from('orcamento_mensagens')
            .select('role, content')
            .eq('sessao_id', sessaoData.id)
            .order('created_at', { ascending: true });

          if (existingMsgs && existingMsgs.length > 0) {
            setMessages(existingMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
            setSessionValid(true);
            return;
          }
        }
        sendMessage('Olá', true, undefined, token);
      })();
    }
  }, [token]);

  const sendMessage = async (text: string, isInitial = false, sid?: string, tkn?: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = isInitial ? [] : [...messages, userMsg];

    if (!isInitial) setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const body: any = {
        messages: isInitial
          ? [{ role: 'user', content: text }]
          : newMessages.map(m => ({ role: m.role, content: m.content })),
      };
      if (sid || sessaoId) body.sessao_id = sid || sessaoId;
      if (tkn || token) body.token = tkn || token;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (resp.status === 404) { setSessionValid(false); setIsLoading(false); return; }
      if (resp.status === 429 || resp.status === 402) {
        const err = await resp.json();
        toast({ title: 'Erro', description: err.error, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      if (!resp.ok || !resp.body) throw new Error('Failed to start stream');
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

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
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
    const uploadedMidias: MidiaRef[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${sessaoId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from('orcamento-midias').upload(path, file);
      if (error) {
        toast({ title: `Erro ao enviar ${file.name}`, variant: 'destructive' });
        continue;
      }

      const tipo = file.type.startsWith('image') ? 'foto' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'outro';

      await supabase.from('orcamento_midias').insert({
        sessao_id: sessaoId,
        tipo,
        arquivo_url: path,
        nome_arquivo: file.name,
        tamanho: file.size,
      });

      uploadedMidias.push({ url: path, tipo, nome: file.name });
    }

    if (uploadedMidias.length > 0) {
      const mediaDesc = uploadedMidias.map(m => `[${m.tipo}: ${m.nome}]`).join(', ');
      sendMessage(`Enviei ${uploadedMidias.length} arquivo(s): ${mediaDesc}`);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Navegador não suporta gravação de áudio', variant: 'destructive' });
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error !== 'aborted') {
        toast({ title: 'Erro no reconhecimento de voz', variant: 'destructive' });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
  };

  const gerarProposta = async () => {
    setGerandoProposta(true);
    try {
      const body: any = { messages, action: 'gerar_proposta' };
      if (sessaoId) body.sessao_id = sessaoId;
      if (token) body.token = token;

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.json();
        toast({ title: 'Erro', description: err.error, variant: 'destructive' });
        setGerandoProposta(false);
        return;
      }

      const data = await resp.json();
      setProposta(data as PropostaData);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao gerar proposta', variant: 'destructive' });
    }
    setGerandoProposta(false);
  };

  if (sessionValid === false) {
    const content = (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Sessão inválida ou expirada</h2>
            <p className="text-muted-foreground">Esta sessão de orçamento não é mais válida.</p>
          </CardContent>
        </Card>
      </div>
    );
    return user ? <Layout>{content}</Layout> : content;
  }

  if (proposta) {
    const propostaContent = (
      <PropostaView data={proposta} onVoltar={() => setProposta(null)} />
    );
    return user ? <Layout>{propostaContent}</Layout> : propostaContent;
  }

  const chatContent = (
    <div className={`${user ? '' : 'min-h-screen'} bg-background flex flex-col h-full`}>
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={emiveLogo} alt="Emive" className="h-8" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Orçamento IA</h1>
            <p className="text-xs text-muted-foreground">IA guiando a coleta de dados para proposta</p>
          </div>
        </div>
        {messages.length >= 6 && (
          <Button onClick={gerarProposta} disabled={gerandoProposta}>
            {gerandoProposta ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><FileText className="mr-2 h-4 w-4" />Gerar Proposta</>}
          </Button>
        )}
      </header>

      {/* Messages */}
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
                <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_br]:content-[''] [&_br]:block [&_br]:my-1">
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

      {/* Input */}
      <div className="border-t bg-card p-4 shrink-0">
      <form
          className="max-w-3xl mx-auto flex gap-2"
          action="#"
          onSubmit={e => { e.preventDefault(); e.stopPropagation(); sendMessage(input); return false; }}
        >
          {/* File upload */}
          {sessaoId && (
            <>
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
                title="Enviar foto, vídeo ou áudio"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
            </>
          )}
          <Button type="button" variant={isRecording ? "destructive" : "outline"} size="icon" onClick={toggleRecording} disabled={isLoading}>
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isRecording ? "Ouvindo..." : "Digite sua mensagem..."}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );

  return user ? <Layout><div className="h-[calc(100vh-0px)] flex flex-col">{chatContent}</div></Layout> : chatContent;
}
