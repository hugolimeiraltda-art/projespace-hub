import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, Settings, Eye, CheckCircle2, AlertCircle, ArrowLeft, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

const EMAIL_TEMPLATES = [
  {
    id: 'recuperacao_senha',
    nome: 'Recuperação de Senha',
    descricao: 'Enviado quando o usuário solicita redefinição de senha',
    assunto_padrao: 'Redefinição de Senha - Eixo PCI',
    variaveis: ['{{nome}}', '{{link_redefinicao}}', '{{validade}}'],
  },
  {
    id: 'boas_vindas',
    nome: 'Boas-vindas (Conta Nova)',
    descricao: 'Enviado quando um novo usuário é criado no sistema',
    assunto_padrao: 'Bem-vindo ao Eixo PCI - Seus dados de acesso',
    variaveis: ['{{nome}}', '{{email}}', '{{senha_temporaria}}', '{{link_login}}'],
  },
  {
    id: 'status_projeto',
    nome: 'Atualização de Status do Projeto',
    descricao: 'Enviado quando o status de um projeto é alterado',
    assunto_padrao: 'Atualização: Projeto "{{projeto_nome}}" - {{novo_status}}',
    variaveis: ['{{nome}}', '{{projeto_nome}}', '{{status_anterior}}', '{{novo_status}}', '{{alterado_por}}', '{{link_projeto}}'],
  },
  {
    id: 'relatorio_visita',
    nome: 'Relatório de Visita Técnica',
    descricao: 'Enviado ao vendedor após gerar relatório de visita',
    assunto_padrao: 'Relatório de Visita Técnica - {{cliente}}',
    variaveis: ['{{nome}}', '{{cliente}}', '{{conteudo_relatorio}}'],
  },
  {
    id: 'chamado_manutencao',
    nome: 'Notificação de Chamado',
    descricao: 'Enviado quando um chamado de manutenção é criado ou atualizado',
    assunto_padrao: 'Chamado de Manutenção - {{cliente}} - {{status}}',
    variaveis: ['{{nome}}', '{{cliente}}', '{{tipo_chamado}}', '{{status}}', '{{link_chamado}}'],
  },
  {
    id: 'preventiva_agendada',
    nome: 'Preventiva Agendada',
    descricao: 'Lembrete de manutenção preventiva próxima',
    assunto_padrao: 'Lembrete: Preventiva agendada para {{data}} - {{cliente}}',
    variaveis: ['{{nome}}', '{{cliente}}', '{{data}}', '{{descricao}}'],
  },
];

export default function ConfiguracoesEmail() {
  const [activeTemplate, setActiveTemplate] = useState(EMAIL_TEMPLATES[0].id);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);

  useEffect(() => {
    checkConfig();
  }, []);

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

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Informe um e-mail de destino');
      return;
    }
    setSendingTest(true);
    try {
      const template = EMAIL_TEMPLATES.find(t => t.id === activeTemplate);
      const { data, error } = await supabase.functions.invoke('send-email-resend', {
        body: {
          action: 'send_test',
          template_id: activeTemplate,
          to: testEmail,
          subject: template?.assunto_padrao || 'Teste',
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

  const selectedTemplate = EMAIL_TEMPLATES.find(t => t.id === activeTemplate);

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
          {/* SMTP Corporativo */}
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

          {/* Resend (Fallback) */}
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
                {EMAIL_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setActiveTemplate(template.id)}
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
              </div>

              <div className="lg:col-span-2">
                {selectedTemplate && (
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        {selectedTemplate.nome}
                      </CardTitle>
                      <CardDescription>{selectedTemplate.descricao}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Assunto do E-mail</Label>
                        <Input value={selectedTemplate.assunto_padrao} readOnly className="mt-1" />
                      </div>
                      <div>
                        <Label>Variáveis Disponíveis</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedTemplate.variaveis.map(v => (
                            <Badge key={v} variant="secondary" className="font-mono text-xs">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Preview do Template</Label>
                        <div className="mt-2 border rounded-lg p-6 bg-muted/30">
                          <div className="max-w-md mx-auto bg-background rounded-lg shadow-sm border overflow-hidden">
                            <div className="bg-primary p-4 text-center">
                              <h2 className="text-primary-foreground font-bold text-lg">Eixo PCI</h2>
                            </div>
                            <div className="p-6 space-y-3">
                              <p className="text-sm text-foreground">Olá <strong>{'{{nome}}'}</strong>,</p>
                              {selectedTemplate.id === 'recuperacao_senha' && (
                                <>
                                  <p className="text-sm text-muted-foreground">Recebemos uma solicitação de redefinição de senha para sua conta.</p>
                                  <div className="text-center py-3">
                                    <span className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium">Redefinir Senha</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">Este link expira em {'{{validade}}'}.</p>
                                </>
                              )}
                              {selectedTemplate.id === 'boas_vindas' && (
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
                              {selectedTemplate.id === 'status_projeto' && (
                                <>
                                  <p className="text-sm text-muted-foreground">O projeto <strong>{'{{projeto_nome}}'}</strong> teve seu status alterado:</p>
                                  <div className="text-center py-3">
                                    <Badge className="text-base px-4 py-2">{'{{novo_status}}'}</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">Alterado por: {'{{alterado_por}}'}</p>
                                </>
                              )}
                              {selectedTemplate.id === 'relatorio_visita' && (
                                <p className="text-sm text-muted-foreground">O relatório de visita técnica do cliente <strong>{'{{cliente}}'}</strong> foi gerado e está disponível.</p>
                              )}
                              {selectedTemplate.id === 'chamado_manutencao' && (
                                <>
                                  <p className="text-sm text-muted-foreground">Um chamado de manutenção para <strong>{'{{cliente}}'}</strong> foi atualizado.</p>
                                  <div className="bg-muted rounded-md p-3 text-sm space-y-1">
                                    <p><strong>Tipo:</strong> {'{{tipo_chamado}}'}</p>
                                    <p><strong>Status:</strong> {'{{status}}'}</p>
                                  </div>
                                </>
                              )}
                              {selectedTemplate.id === 'preventiva_agendada' && (
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
                      </div>
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
                      {EMAIL_TEMPLATES.map(t => (
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
