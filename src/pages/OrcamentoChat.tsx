import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Send, FileText, Loader2, Bot, User, Paperclip, Mic, MicOff, ArrowLeft, FolderPlus, Download, Table2, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import emiveLogo from '@/assets/emive-logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import PropostaView, { type PropostaData } from '@/components/orcamento/PropostaView';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Msg = { role: 'user' | 'assistant'; content: string; midias?: MidiaRef[] };
type MidiaRef = { url: string; tipo: string; nome: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orcamento-chat`;

export default function OrcamentoChat() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addProject } = useProjects();
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
  const [propostaJaGerada, setPropostaJaGerada] = useState(false);
  const [projetoOpen, setProjetoOpen] = useState(false);
  const [projetoCriando, setProjetoCriando] = useState(false);
  const [projNome, setProjNome] = useState('');
  const [projEndereco, setProjEndereco] = useState('');
  const [projCidade, setProjCidade] = useState('');
  const [projEstado, setProjEstado] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoShowPropostaRef = useRef(false);

  const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Auto-focus input when loading finishes
  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading]);

  // Auto-show proposal when navigated with ver=1
  useEffect(() => {
    if (autoShowPropostaRef.current && messages.length > 0 && !proposta && !gerandoProposta) {
      autoShowPropostaRef.current = false;
      carregarPropostaExistente();
    }
  }, [messages, propostaJaGerada]);

  // Resolve session from URL params or query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('sessao');
    const autoVer = params.get('ver') === '1';
    if (sid) {
      setSessaoId(sid);
      // Load existing messages first
      (async () => {
        // Check if proposal already generated
        const { data: sessaoData } = await supabase
          .from('orcamento_sessoes')
          .select('status, proposta_gerada')
          .eq('id', sid)
          .single();
        if (sessaoData?.proposta_gerada) {
          setPropostaJaGerada(true);
          // Auto-show proposal if ver=1
          if (autoVer) {
            autoShowPropostaRef.current = true;
          }
        }

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

  const carregarPropostaExistente = async () => {
    if (!sessaoId) return;
    setGerandoProposta(true);
    try {
      const { data: sessao } = await supabase
        .from('orcamento_sessoes')
        .select('id, nome_cliente, vendedor_nome, proposta_gerada, endereco_condominio, email_cliente, telefone_cliente')
        .eq('id', sessaoId)
        .single();

      if (!sessao?.proposta_gerada) {
        // Fallback: generate if no saved proposal
        await gerarProposta();
        return;
      }

      let parsed: any = null;
      try { parsed = JSON.parse(sessao.proposta_gerada); } catch {
        parsed = { proposta: sessao.proposta_gerada, itens: null, itensExpandidos: [] };
      }

      const { data: midias } = await supabase
        .from('orcamento_midias')
        .select('arquivo_url, nome_arquivo, descricao, tipo')
        .eq('sessao_id', sessaoId)
        .order('created_at', { ascending: true });

      const midiasWithUrls = await Promise.all(
        (midias || []).map(async (m) => {
          const { data: signedData } = await supabase.storage
            .from('orcamento-midias')
            .createSignedUrl(m.arquivo_url, 3600);
          return { ...m, arquivo_url: signedData?.signedUrl || m.arquivo_url };
        })
      );

      const fotosData = midiasWithUrls.filter(m => m.tipo === 'foto');

      // Resolve ambient photos
      const fotoSignedMap: Record<string, string> = {};
      for (const m of midiasWithUrls) {
        if (m.tipo === 'foto') fotoSignedMap[m.nome_arquivo] = m.arquivo_url;
      }
      if (parsed.itens?.ambientes) {
        for (const amb of parsed.itens.ambientes) {
          if (amb.fotos && Array.isArray(amb.fotos)) {
            amb.fotos = amb.fotos.map((f: string) => !f.startsWith('http') ? fotoSignedMap[f] || null : f).filter(Boolean);
          }
        }
      }

      const propostaData: PropostaData = {
        proposta: parsed.proposta || '',
        itens: parsed.itens || null,
        itensExpandidos: parsed.itensExpandidos || [],
        fotos: fotosData.map(m => ({ url: m.arquivo_url, nome: m.nome_arquivo })),
        sessao: {
          nome_cliente: sessao.nome_cliente,
          endereco: sessao.endereco_condominio || '',
          vendedor: sessao.vendedor_nome || '',
          email: sessao.email_cliente || '',
          telefone: sessao.telefone_cliente || '',
        },
      };

      setProposta(propostaData);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao carregar proposta', variant: 'destructive' });
    }
    setGerandoProposta(false);
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
      setPropostaJaGerada(true);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao gerar proposta', variant: 'destructive' });
    }
    setGerandoProposta(false);
  };

  const openProjetoDialog = async () => {
    if (!sessaoId) return;
    const { data: sessaoData } = await supabase
      .from('orcamento_sessoes')
      .select('nome_cliente, endereco_condominio, vendedor_nome')
      .eq('id', sessaoId)
      .single();
    setProjNome(sessaoData?.nome_cliente || '');
    setProjEndereco(sessaoData?.endereco_condominio || '');
    setProjCidade('');
    setProjEstado('');
    setProjetoOpen(true);
  };

  const handleCriarProjeto = async () => {
    if (!user || !sessaoId) return;
    if (!projNome.trim() || !projCidade.trim() || !projEstado) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setProjetoCriando(true);
    try {
      const { data: sessaoData } = await supabase
        .from('orcamento_sessoes')
        .select('id, nome_cliente, vendedor_nome, proposta_gerada, proposta_gerada_at, endereco_condominio')
        .eq('id', sessaoId)
        .single();

      const propostaResumo = sessaoData?.proposta_gerada || '';
      const observacoes = `[PROJETO_IA:${sessaoId}]\n\nProjeto originado da proposta IA.\nProposta gerada em: ${sessaoData?.proposta_gerada_at ? format(new Date(sessaoData.proposta_gerada_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}\nVendedor: ${sessaoData?.vendedor_nome || ''}\n\n${propostaResumo}`;

      const projectId = await addProject(
        {
          created_by_user_id: user.id,
          vendedor_nome: sessaoData?.vendedor_nome || user.nome,
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
        try {
          await supabase.functions.invoke('notify-project-submitted', {
            body: {
              project_id: projectId,
              project_name: projNome,
              vendedor_name: sessaoData?.vendedor_nome || user.nome,
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
      <header className="border-b bg-card px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={emiveLogo} alt="Emive" className="h-7 sm:h-8 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">Orçamento IA</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">IA guiando a coleta de dados para proposta</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {propostaJaGerada ? (
              <>
                <Button onClick={carregarPropostaExistente} disabled={gerandoProposta} variant="outline" size="sm" className="shrink-0">
                  {gerandoProposta ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /><span className="hidden sm:inline">Carregando...</span><span className="sm:hidden">...</span></> : <><FileText className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Ver Proposta</span><span className="sm:hidden">Proposta</span></>}
                </Button>
                {user && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-primary text-primary hover:bg-primary/10"
                    onClick={openProjetoDialog}
                  >
                    <FolderPlus className="mr-1.5 h-4 w-4" />
                    <span className="hidden sm:inline">Abrir Projeto</span>
                    <span className="sm:hidden">Projeto</span>
                  </Button>
                )}
              </>
            ) : messages.length >= 6 ? (
              <Button onClick={gerarProposta} disabled={gerandoProposta} size="sm" className="shrink-0">
                {gerandoProposta ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /><span className="hidden sm:inline">Gerando...</span><span className="sm:hidden">...</span></> : <><FileText className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Gerar Proposta</span><span className="sm:hidden">Proposta</span></>}
              </Button>
            ) : null}
          </div>
        </div>
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

  return (
    <>
      {user ? <Layout><div className="h-[calc(100vh-0px)] flex flex-col">{chatContent}</div></Layout> : chatContent}

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
    </>
  );
}
