import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, Eye, CheckCircle2, AlertCircle, ArrowLeft, Server, Save, Pencil, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmailTemplate {
  id: string;
  nome: string;
  descricao: string | null;
  assunto: string;
  corpo_html: string | null;
  variaveis: string[];
  updated_at: string;
  updated_by: string | null;
}

const DEFAULT_TEMPLATES: Record<string, { variaveis: string[] }> = {
  recuperacao_senha: { variaveis: ['{{nome}}', '{{link_redefinicao}}', '{{validade}}'] },
  boas_vindas: { variaveis: ['{{nome}}', '{{email}}', '{{senha_temporaria}}', '{{link_login}}'] },
  status_projeto: { variaveis: ['{{nome}}', '{{projeto_nome}}', '{{status_anterior}}', '{{novo_status}}', '{{alterado_por}}', '{{link_projeto}}'] },
  relatorio_visita: { variaveis: ['{{nome}}', '{{cliente}}', '{{conteudo_relatorio}}'] },
  chamado_manutencao: { variaveis: ['{{nome}}', '{{cliente}}', '{{tipo_chamado}}', '{{status}}', '{{link_chamado}}'] },
  preventiva_agendada: { variaveis: ['{{nome}}', '{{cliente}}', '{{data}}', '{{descricao}}'] },
};

export default function ConfiguracoesEmail() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState('recuperacao_senha');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editAssunto, setEditAssunto] = useState('');
  const [editCorpoHtml, setEditCorpoHtml] = useState('');

  useEffect(() => {
    checkConfig();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('id');
      if (error) throw error;
      setTemplates((data as any[]) || []);
    } catch (err: any) {
      toast.error('Erro ao carregar templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkConfig = async () => {
    setCheckingConfig(true);
    try {
      const { data } = await supabase.functions.invoke('send-email-resend', {
        body: { action: 'check_config' },
      });
      setSmtpConfigured(data?.smtp_configured === true);
      setResendConfigured(data?.resend_configured === true);
    } catch {
      setSmtpConfigured(false);
      setResendConfigured(false);
    } finally {
      setCheckingConfig(false);
    }
  };

  const isConfigured = smtpConfigured || resendConfigured;

  const selectedTemplate = templates.find(t => t.id === activeTemplate);

  const startEditing = () => {
    if (!selectedTemplate) return;
    setEditNome(selectedTemplate.nome);
    setEditDescricao(selectedTemplate.descricao || '');
    setEditAssunto(selectedTemplate.assunto);
    setEditCorpoHtml(selectedTemplate.corpo_html || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          nome: editNome,
          descricao: editDescricao || null,
          assunto: editAssunto,
          corpo_html: editCorpoHtml || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', selectedTemplate.id);
      if (error) throw error;
      toast.success('Template salvo com sucesso!');
      setEditing(false);
      await fetchTemplates();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Informe um e-mail de destino');
      return;
    }
    setSendingTest(true);
    try {
      const template = templates.find(t => t.id === activeTemplate);
      const { data, error } = await supabase.functions.invoke('send-email-resend', {
        body: {
          action: 'send_test',
          template_id: activeTemplate,
          to: testEmail,
          subject: template?.assunto || 'Teste',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`E-mail de teste enviado para ${testEmail} via ${data?.provider || 'SMTP'}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar e-mail de teste');
    } finally {
      setSendingTest(false);
    }
  };

  const renderPreview = (template: EmailTemplate) => (
    <div className="mt-2 border rounded-lg p-6 bg-muted/30">
      <div className="max-w-md mx-auto bg-background rounded-lg shadow-sm border overflow-hidden">
        <div className="bg-primary p-4 text-center">
          <h2 className="text-primary-foreground font-bold text-lg">Eixo PCI</h2>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-foreground">Olá <strong>{'{{nome}}'}</strong>,</p>
          {template.id === 'recuperacao_senha' && (
            <>
              <p className="text-sm text-muted-foreground">Recebemos uma solicitação de redefinição de senha para sua conta.</p>
              <div className="text-center py-3">
                <span className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium">Redefinir Senha</span>
              </div>
              <p className="text-xs text-muted-foreground">Este link expira em {'{{validade}}'}.</p>
            </>
          )}
          {template.id === 'boas_vindas' && (
            <>
              <p className="text-sm text-muted-foreground">Sua conta foi criada no sistema Eixo PCI. Abaixo estão seus dados de acesso:</p>
              <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                <p><strong>E-mail:</strong> {'{{email}}'}</p>
                <p><strong>Senha temporária:</strong> {'{{senha_temporaria}}'}</p>
              </div>
              <div className="text-center py-3">
                <span className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium">Acessar o Sistema</span>
              </div>
            </>
          )}
          {template.id === 'status_projeto' && (
            <>
              <p className="text-sm text-muted-foreground">O projeto <strong>{'{{projeto_nome}}'}</strong> teve seu status alterado:</p>
              <div className="text-center py-3">
                <Badge className="text-base px-4 py-2">{'{{novo_status}}'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Alterado por: {'{{alterado_por}}'}</p>
            </>
          )}
          {template.id === 'relatorio_visita' && (
            <p className="text-sm text-muted-foreground">O relatório de visita técnica do cliente <strong>{'{{cliente}}'}</strong> foi gerado e está disponível.</p>
          )}
          {template.id === 'chamado_manutencao' && (
            <>
              <p className="text-sm text-muted-foreground">Um chamado de manutenção para <strong>{'{{cliente}}'}</strong> foi atualizado.</p>
              <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                <p><strong>Tipo:</strong> {'{{tipo_chamado}}'}</p>
                <p><strong>Status:</strong> {'{{status}}'}</p>
              </div>
            </>
          )}
          {template.id === 'preventiva_agendada' && (
            <>
              <p className="text-sm text-muted-foreground">A manutenção preventiva do cliente <strong>{'{{cliente}}'}</strong> está agendada para <strong>{'{{data}}'}</strong>.</p>
              <p className="text-sm text-muted-foreground">{'{{descricao}}'}</p>
            </>
          )}
        </div>
        <div className="bg-muted/50 p-3 text-center border-t">
          <p className="text-xs text-muted-foreground">E-mail automático do Sistema Eixo PCI</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to="/configuracoes" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar para Configurações
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Configurações de E-mail</h1>
          <p className="text-muted-foreground mt-1">Configure o provedor de envio e personalize os templates</p>
        </div>

        {/* Status dos provedores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <Server className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">SMTP Corporativo</CardTitle>
                    <CardDescription className="text-xs">smtp.mailcorp.com.br:465 (SSL)</CardDescription>
                  </div>
                </div>
                {checkingConfig ? (
                  <Badge variant="outline" className="text-xs">Verificando...</Badge>
                ) : smtpConfigured ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" /> Inativo
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {smtpConfigured
                  ? 'Provedor primário configurado. E-mails são enviados via eixopci@graberalarmes.com.br.'
                  : 'Credenciais SMTP não encontradas. Configure SMTP_HOST, SMTP_USER e SMTP_PASSWORD.'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary rounded-lg">
                    <Mail className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Resend (Fallback)</CardTitle>
                    <CardDescription className="text-xs">API de envio alternativo</CardDescription>
                  </div>
                </div>
                {checkingConfig ? (
                  <Badge variant="outline" className="text-xs">Verificando...</Badge>
                ) : resendConfigured ? (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Disponível
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Não configurado</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {resendConfigured
                  ? 'Disponível como fallback caso o SMTP corporativo falhe.'
                  : 'Configure RESEND_API_KEY para ter um provedor alternativo.'}
              </p>
            </CardContent>
          </Card>
        </div>

        {!isConfigured && !checkingConfig && (
          <Card className="shadow-card mb-6 border-amber-200">
            <CardContent className="pt-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">⚠️ Nenhum provedor de e-mail configurado</p>
                <p>Configure pelo menos um provedor (SMTP corporativo ou Resend) para habilitar o envio de e-mails.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Templates e Teste */}
        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates" className="gap-2">
              <Mail className="w-4 h-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="teste" className="gap-2">
              <Send className="w-4 h-4" /> Enviar Teste
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => { setActiveTemplate(template.id); setEditing(false); }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      activeTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <p className="font-medium text-sm text-foreground">{template.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{template.descricao}</p>
                  </button>
                ))}
                {loading && <p className="text-sm text-muted-foreground p-3">Carregando...</p>}
              </div>

              <div className="lg:col-span-2">
                {selectedTemplate && (
                  <Card className="shadow-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            {editing ? 'Editando Template' : selectedTemplate.nome}
                          </CardTitle>
                          <CardDescription>{selectedTemplate.descricao}</CardDescription>
                        </div>
                        {!editing ? (
                          <Button variant="outline" size="sm" onClick={startEditing}>
                            <Pencil className="w-4 h-4 mr-1" /> Editar
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={cancelEditing}>
                              <X className="w-4 h-4 mr-1" /> Cancelar
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                              <Save className="w-4 h-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {editing ? (
                        <>
                          <div>
                            <Label>Nome do Template</Label>
                            <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label>Descrição</Label>
                            <Input value={editDescricao} onChange={e => setEditDescricao(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label>Assunto do E-mail</Label>
                            <Input value={editAssunto} onChange={e => setEditAssunto(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label>Corpo HTML Personalizado (opcional)</Label>
                            <Textarea
                              value={editCorpoHtml}
                              onChange={e => setEditCorpoHtml(e.target.value)}
                              className="mt-1 font-mono text-xs"
                              rows={8}
                              placeholder="Deixe vazio para usar o template padrão. Use as variáveis disponíveis abaixo."
                            />
                          </div>
                          <div>
                            <Label>Variáveis Disponíveis</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(selectedTemplate.variaveis || DEFAULT_TEMPLATES[selectedTemplate.id]?.variaveis || []).map(v => (
                                <Badge key={v} variant="secondary" className="font-mono text-xs cursor-pointer" onClick={() => {
                                  setEditCorpoHtml(prev => prev + v);
                                }}>
                                  {v}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Clique em uma variável para inseri-la no corpo HTML</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label>Assunto do E-mail</Label>
                            <Input value={selectedTemplate.assunto} readOnly className="mt-1" />
                          </div>
                          <div>
                            <Label>Variáveis Disponíveis</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {(selectedTemplate.variaveis || DEFAULT_TEMPLATES[selectedTemplate.id]?.variaveis || []).map(v => (
                                <Badge key={v} variant="secondary" className="font-mono text-xs">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {selectedTemplate.corpo_html && (
                            <div>
                              <Label>Corpo HTML Personalizado</Label>
                              <div className="mt-1 border rounded-lg p-3 bg-muted/30 font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                                {selectedTemplate.corpo_html}
                              </div>
                            </div>
                          )}
                          <div>
                            <Label>Preview do Template</Label>
                            {renderPreview(selectedTemplate)}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="teste">
            <Card className="shadow-card max-w-lg">
              <CardHeader>
                <CardTitle className="text-lg">Enviar E-mail de Teste</CardTitle>
                <CardDescription>Envie um e-mail de teste para verificar se a configuração está funcionando</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Template</Label>
                  <Select value={activeTemplate} onValueChange={setActiveTemplate}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>E-mail de destino</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleSendTest} disabled={sendingTest || !isConfigured}>
                  <Send className="w-4 h-4 mr-2" />
                  {sendingTest ? 'Enviando...' : 'Enviar Teste'}
                </Button>
                {!isConfigured && (
                  <p className="text-sm text-destructive">Configure ao menos um provedor de e-mail antes de enviar testes.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
