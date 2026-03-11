import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendedorLayout } from '@/components/VendedorLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Send, FileText, Loader2, Bot, User, Paperclip, ArrowLeft, CheckCircle, Mail, Download, Mic, MicOff, FolderPlus, Table2, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orcamento-chat`;
const PDF_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-visit-pdf`;
const EMAIL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-visit-report`;

export default function VendedorChat() {
  const { sessaoId } = useParams<{ sessaoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { addProject } = useProjects();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proposta, setProposta] = useState<string | null>(null);
  const [gerandoProposta, setGerandoProposta] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const [resumoVisita, setResumoVisita] = useState('');
  const [pdfHtml, setPdfHtml] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('');
  const [isRecording, setIsRecording] = useState(false);
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

  const ESTADOS_BR = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!user || !sessaoId) return;

    (async () => {
      const { data: sessaoData } = await supabase
        .from('orcamento_sessoes')
        .select('id, vendedor_id, status, proposta_gerada')
        .eq('id', sessaoId)
        .eq('vendedor_id', user.id)
        .single();

      if (!sessaoData) {
        setSessionValid(false);
        setInitialLoading(false);
        return;
      }

      setSessionStatus(sessaoData.status);
      if (sessaoData.proposta_gerada) setProposta(sessaoData.proposta_gerada);
      if (sessaoData.status === 'escopo_validado' || sessaoData.status === 'relatorio_enviado') {
        setShowValidation(true);
        if (sessaoData.status === 'relatorio_enviado') setEmailSent(true);
      }

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
        // Send hidden trigger - don't show user message, only AI response
        sendMessage('Iniciar orçamento. Dê boas-vindas ao vendedor e comece o checklist.', true);
      }
    })();
  }, [user, sessaoId]);

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          sessao_id: sessaoId,
          messages: isInitial ? [{ role: 'user', content: text }] : newMessages.map(m => ({ role: m.role, content: m.content })),
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
          if (last?.role === 'assistant') return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
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
      await supabase.from('orcamento_midias').insert({ sessao_id: sessaoId, tipo, arquivo_url: path, nome_arquivo: file.name, tamanho: file.size });
      uploaded.push(`[${tipo}: ${file.name}]`);
    }
    if (uploaded.length > 0) sendMessage(`Enviei ${uploaded.length} arquivo(s): ${uploaded.join(', ')}`);
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
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
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

  const validarEscopo = async () => {
    setLoadingPdf(true);
    try {
      await supabase.from('orcamento_sessoes').update({ status: 'escopo_validado', updated_at: new Date().toISOString() }).eq('id', sessaoId);

      const resp = await fetch(PDF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ sessao_id: sessaoId }),
      });

      if (!resp.ok) throw new Error('Falha ao gerar relatório');
      const data = await resp.json();
      setPdfHtml(data.html);
      setResumoVisita(data.resumo_visita || '');
      setShowValidation(true);
      setSessionStatus('escopo_validado');
      toast({ title: 'Escopo validado!', description: 'Relatório gerado com sucesso.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao validar escopo', variant: 'destructive' });
    }
    setLoadingPdf(false);
  };

  const enviarRelatorio = async () => {
    setSendingEmail(true);
    try {
      let html = pdfHtml;
      if (!html) {
        const resp = await fetch(PDF_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ sessao_id: sessaoId }),
        });
        if (resp.ok) {
          const data = await resp.json();
          html = data.html;
          setPdfHtml(html);
        }
      }

      const resp = await fetch(EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ sessao_id: sessaoId, html_content: html }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Falha ao enviar');
      }

      const data = await resp.json();
      setEmailSent(true);
      setSessionStatus('relatorio_enviado');
      toast({ title: 'Relatório enviado!', description: `Email enviado para ${data.email}` });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar relatório', description: e.message, variant: 'destructive' });
    }
    setSendingEmail(false);
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
      const observacoes = `[PROJETO_IA:${sessaoId}]\n\nProjeto originado da proposta IA.\nProposta gerada em: ${sessaoData?.proposta_gerada_at ? format(new Date(sessaoData.proposta_gerada_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}\nVendedor: ${sessaoData?.vendedor_nome || user.nome}\n\n${propostaResumo}`;

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

        await supabase
          .from('orcamento_sessoes')
          .update({ status: 'projeto_aberto' })
          .eq('id', sessaoId);

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

    return (
      <VendedorLayout vendedorNome={user?.nome}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VendedorLayout>
    );
  }

  if (sessionValid === false) {
    return (
      <VendedorLayout vendedorNome={user?.nome}>
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center space-y-4">
              <h2 className="text-xl font-semibold">Sessão inválida</h2>
              <p className="text-muted-foreground">Esta sessão não foi encontrada ou você não tem acesso.</p>
              <Button onClick={() => navigate('/orcar')}>Voltar</Button>
            </CardContent>
          </Card>
        </div>
      </VendedorLayout>
    );
  }

  // Validation / Report screen
  if (showValidation) {
    return (
      <VendedorLayout vendedorNome={user?.nome}>
        <div className="flex-1 flex flex-col">
          <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setShowValidation(false)}>
              <ArrowLeft className="mr-1 h-4 w-4" />Voltar ao Chat
            </Button>
            <h2 className="font-semibold text-sm">Relatório da Visita</h2>
            <div />
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4">
            <Card className={emailSent ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20' : 'border-primary/50'}>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className={`h-6 w-6 ${emailSent ? 'text-green-600' : 'text-primary'}`} />
                <div>
                  <p className="font-semibold text-foreground">
                    {emailSent ? 'Relatório enviado por email!' : 'Escopo validado com sucesso!'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {emailSent
                      ? 'O relatório completo foi enviado para o email cadastrado.'
                      : 'Revise o resumo abaixo e envie o relatório por email.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {resumoVisita && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-2">📋 Resumo da Visita</h3>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{resumoVisita}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {proposta && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground mb-2">📄 Proposta Comercial</h3>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{proposta}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {!emailSent && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={enviarRelatorio} disabled={sendingEmail} className="flex-1" size="lg">
                  {sendingEmail ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
                  ) : (
                    <><Mail className="mr-2 h-4 w-4" />Enviar Relatório por Email</>
                  )}
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/orcar')}
            >
              Voltar às Minhas Visitas
            </Button>
          </div>
        </div>
      </VendedorLayout>
    );
  }

  // Proposal view
  if (proposta && !showValidation) {
    return (
      <VendedorLayout vendedorNome={user?.nome}>
        <div className="flex-1 flex flex-col">
          <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setProposta(null)}>
              <ArrowLeft className="mr-1 h-4 w-4" />Voltar ao Chat
            </Button>
            <h2 className="font-semibold">Proposta Comercial</h2>
            <div />
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4">
            <Card>
              <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{proposta}</ReactMarkdown>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button onClick={validarEscopo} disabled={loadingPdf} className="flex-1" size="lg">
                {loadingPdf ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Validando...</>
                ) : (
                  <><CheckCircle className="mr-2 h-4 w-4" />Validar Escopo e Gerar Relatório</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </VendedorLayout>
    );
  }

  // Chat view
  return (
    <VendedorLayout vendedorNome={user?.nome}>
        <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b bg-card px-4 py-3 flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/orcar')}>
            <ArrowLeft className="mr-1 h-4 w-4" />Voltar
          </Button>
          {proposta ? (
            <Button size="sm" onClick={gerarProposta} disabled={gerandoProposta} variant="outline">
              {gerandoProposta ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</> : <><FileText className="mr-2 h-4 w-4" />Ver Proposta</>}
            </Button>
          ) : messages.length >= 6 ? (
            <Button size="sm" onClick={gerarProposta} disabled={gerandoProposta}>
              {gerandoProposta ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><FileText className="mr-2 h-4 w-4" />Gerar Proposta</>}
            </Button>
          ) : null}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full min-h-0">
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
          <form className="max-w-3xl mx-auto flex gap-2" onSubmit={e => { e.preventDefault(); sendMessage(input); }}>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileUpload} />
            <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Button type="button" variant={isRecording ? "destructive" : "outline"} size="icon" onClick={toggleRecording} disabled={isLoading}>
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder={isRecording ? "Ouvindo..." : "Digite sua mensagem..."} disabled={isLoading} className="flex-1" />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </VendedorLayout>
  );
}
