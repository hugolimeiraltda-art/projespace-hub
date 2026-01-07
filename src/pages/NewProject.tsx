import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Building,
  Settings2,
  Map,
  Clock,
  Paperclip,
  FileText,
  AlertTriangle,
  Check,
  Upload,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  TapForm,
  SolicitacaoOrigem,
  PortariaVirtualApp,
  CFTVElevador,
  CroquiItem,
  AttachmentType,
  PORTARIA_VIRTUAL_LABELS,
  CFTV_ELEVADOR_LABELS,
  CROQUI_ITEM_LABELS,
  ATTACHMENT_TYPE_LABELS,
} from '@/types/project';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Identificação', icon: Building },
  { id: 2, title: 'Configuração', icon: Settings2 },
  { id: 3, title: 'Croqui', icon: Map },
  { id: 4, title: 'Cronograma', icon: Clock },
  { id: 5, title: 'Anexos', icon: Paperclip },
  { id: 6, title: 'Informações', icon: FileText },
];

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function NewProject() {
  const { user } = useAuth();
  const { addProject, addAttachment } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - Project
  const [condominioNome, setCondominioNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [endereco, setEndereco] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [dataAssembleia, setDataAssembleia] = useState('');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Form state - TAP
  const [solicitacaoOrigem, setSolicitacaoOrigem] = useState<SolicitacaoOrigem>('EMAIL');
  const [emailOrigemTexto, setEmailOrigemTexto] = useState('');
  const [portariaVirtual, setPortariaVirtual] = useState<PortariaVirtualApp>('NAO');
  const [numeroBlocos, setNumeroBlocos] = useState(1);
  const [interfonia, setInterfonia] = useState(false);
  const [controlePedestre, setControlePedestre] = useState('');
  const [controleVeiculo, setControleVeiculo] = useState('');
  const [alarme, setAlarme] = useState('');
  const [cftvDvr, setCftvDvr] = useState('');
  const [cftvElevador, setCftvElevador] = useState<CFTVElevador>('NAO_INFORMADO');
  const [marcacaoCroquiConfirmada, setMarcacaoCroquiConfirmada] = useState(false);
  const [marcacaoCroquiItens, setMarcacaoCroquiItens] = useState<CroquiItem[]>([]);
  const [infoCusto, setInfoCusto] = useState('');
  const [infoCronograma, setInfoCronograma] = useState('');
  const [infoAdicionais, setInfoAdicionais] = useState('');

  // Mock attachments (in real app, would upload to storage)
  const [attachments, setAttachments] = useState<{ tipo: AttachmentType; nome: string }[]>([]);

  const hasCroquiAttachment = attachments.some(a => a.tipo === 'CROQUI');
  const hasPlantaBaixa = attachments.some(a => a.tipo === 'PLANTA_BAIXA');

  const canSubmit = 
    condominioNome.trim() &&
    cidade.trim() &&
    estado &&
    marcacaoCroquiConfirmada &&
    hasCroquiAttachment;

  const handleCroquiItemToggle = (item: CroquiItem) => {
    setMarcacaoCroquiItens(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const handleMockAttachment = (tipo: AttachmentType) => {
    const nome = `arquivo_${tipo.toLowerCase()}_${Date.now()}.pdf`;
    setAttachments(prev => [...prev, { tipo, nome }]);
    toast({
      title: 'Arquivo adicionado',
      description: `${ATTACHMENT_TYPE_LABELS[tipo]} foi adicionado com sucesso.`,
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const generateEmail = () => {
    const portariaLabel = PORTARIA_VIRTUAL_LABELS[portariaVirtual];
    const cftvElevadorLabel = CFTV_ELEVADOR_LABELS[cftvElevador];

    return `Portaria Virtual - Atendimento pelo Aplicativo - ${portariaLabel}
Número de blocos: ${numeroBlocos}
Interfonia - ${interfonia ? 'Sim' : 'Não'}
Controle de acessos
    Pedestre - ${controlePedestre || 'Não informado'}
    Veículo - ${controleVeiculo || 'Não informado'}
Alarme - ${alarme || 'Não informado'}
CFTV - ${cftvDvr || 'Não informado'}
CFTV Elevador - ${cftvElevadorLabel}

Observação: Não vamos assumir as câmeras do prédio/condomínio.

Informações do cronograma:
${infoCronograma || 'Não informado'}

Informações de custo
${infoCusto || 'Não informado'}

Documentos anexo:
- Planta baixa: ${hasPlantaBaixa ? 'Sim' : 'Não'}
- Croqui: ${hasCroquiAttachment ? 'Sim' : 'Não'}
- Arquivos de imagens: ${attachments.some(a => a.tipo === 'IMAGENS') ? 'Sim' : 'Não'}
- Fotos dos equipamentos aproveitados: ${attachments.some(a => a.tipo === 'FOTOS_EQUIP_APROVEITADOS') ? 'Sim' : 'Não'}

Informações adicionais
${infoAdicionais || 'Não informado'}`;
  };

  const handleSave = (sendToProjects: boolean) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      const projectId = addProject(
        {
          created_by_user_id: user.id,
          vendedor_nome: user.nome,
          vendedor_email: user.email,
          cliente_condominio_nome: condominioNome,
          cliente_cidade: cidade,
          cliente_estado: estado,
          endereco_condominio: endereco,
          status: sendToProjects ? 'ENVIADO' : 'RASCUNHO',
          prazo_entrega_projeto: prazoEntrega || undefined,
          data_assembleia: dataAssembleia || undefined,
          observacoes_gerais: observacoesGerais || undefined,
          email_padrao_gerado: generateEmail(),
        },
        {
          solicitacao_origem: solicitacaoOrigem,
          email_origem_texto: emailOrigemTexto || undefined,
          portaria_virtual_atendimento_app: portariaVirtual,
          numero_blocos: numeroBlocos,
          interfonia,
          controle_acessos_pedestre_descricao: controlePedestre || undefined,
          controle_acessos_veiculo_descricao: controleVeiculo || undefined,
          alarme_descricao: alarme || undefined,
          cftv_dvr_descricao: cftvDvr || undefined,
          cftv_elevador_possui: cftvElevador,
          observacao_nao_assumir_cameras: true,
          marcacao_croqui_confirmada: marcacaoCroquiConfirmada,
          marcacao_croqui_itens: marcacaoCroquiItens,
          info_custo: infoCusto || undefined,
          info_cronograma: infoCronograma || undefined,
          info_adicionais: infoAdicionais || undefined,
        }
      );

      // Add mock attachments
      attachments.forEach(att => {
        addAttachment(projectId, {
          tipo: att.tipo,
          arquivo_url: '/placeholder.svg',
          nome_arquivo: att.nome,
        });
      });

      toast({
        title: sendToProjects ? 'Projeto enviado!' : 'Rascunho salvo!',
        description: sendToProjects 
          ? 'O projeto foi enviado para a equipe de Projetos.'
          : 'Você pode continuar editando depois.',
      });

      // Small delay to ensure localStorage is updated before navigation
      setTimeout(() => {
        navigate(`/projetos/${projectId}`);
      }, 100);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o projeto.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="condominio">Nome do Condomínio *</Label>
                <Input
                  id="condominio"
                  value={condominioNome}
                  onChange={(e) => setCondominioNome(e.target.value)}
                  placeholder="Ex: Residencial Sol Nascente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número - Bairro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="São Paulo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo de Entrega do Projeto</Label>
                <Input
                  id="prazo"
                  type="date"
                  value={prazoEntrega}
                  onChange={(e) => setPrazoEntrega(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assembleia">Data da Assembleia</Label>
                <Input
                  id="assembleia"
                  type="date"
                  value={dataAssembleia}
                  onChange={(e) => setDataAssembleia(e.target.value)}
                />
              </div>
            </div>

            {dataAssembleia && prazoEntrega && new Date(dataAssembleia) < new Date(prazoEntrega) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  A data da assembleia é anterior ao prazo de entrega do projeto.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="origem">Origem da Solicitação</Label>
              <Select value={solicitacaoOrigem} onValueChange={(v) => setSolicitacaoOrigem(v as SolicitacaoOrigem)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="FORMS">Formulário</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {solicitacaoOrigem === 'EMAIL' && (
              <div className="space-y-2">
                <Label htmlFor="emailOrigem">Texto do Email de Origem</Label>
                <Textarea
                  id="emailOrigem"
                  value={emailOrigemTexto}
                  onChange={(e) => setEmailOrigemTexto(e.target.value)}
                  placeholder="Cole aqui o conteúdo do email recebido..."
                  rows={4}
                />
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Portaria Virtual - Atendimento App</Label>
                <Select value={portariaVirtual} onValueChange={(v) => setPortariaVirtual(v as PortariaVirtualApp)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PORTARIA_VIRTUAL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="blocos">Número de Blocos *</Label>
                <Input
                  id="blocos"
                  type="number"
                  min={1}
                  value={numeroBlocos}
                  onChange={(e) => setNumeroBlocos(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <Label htmlFor="interfonia" className="cursor-pointer">Interfonia</Label>
                <Switch
                  id="interfonia"
                  checked={interfonia}
                  onCheckedChange={setInterfonia}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Controle de Acessos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pedestre">Pedestre</Label>
                  <Textarea
                    id="pedestre"
                    value={controlePedestre}
                    onChange={(e) => setControlePedestre(e.target.value)}
                    placeholder="Descreva o controle de acesso de pedestres..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="veiculo">Veículo</Label>
                  <Textarea
                    id="veiculo"
                    value={controleVeiculo}
                    onChange={(e) => setControleVeiculo(e.target.value)}
                    placeholder="Descreva o controle de acesso de veículos..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Segurança</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alarme">Alarme</Label>
                  <Textarea
                    id="alarme"
                    value={alarme}
                    onChange={(e) => setAlarme(e.target.value)}
                    placeholder="Descreva o sistema de alarme..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cftv">CFTV / DVR</Label>
                  <Textarea
                    id="cftv"
                    value={cftvDvr}
                    onChange={(e) => setCftvDvr(e.target.value)}
                    placeholder="Descreva o sistema de CFTV..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>CFTV Elevador</Label>
                <Select value={cftvElevador} onValueChange={(v) => setCftvElevador(v as CFTVElevador)}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CFTV_ELEVADOR_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Alert className="bg-warning/10 border-warning/30">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-foreground">
                <strong>Obrigatório:</strong> É necessário anexar um croqui com as marcações e confirmar que os pontos foram marcados para enviar o projeto.
              </AlertDescription>
            </Alert>

            {/* Upload de Croqui */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Arquivo do Croqui *</Label>
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                  hasCroquiAttachment 
                    ? "border-success bg-success/5" 
                    : "border-border hover:border-primary hover:bg-accent"
                )}
                onClick={() => document.getElementById('croqui-upload')?.click()}
              >
                <input
                  id="croqui-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const nome = file.name;
                      setAttachments(prev => {
                        // Remove croqui anterior se existir
                        const filtered = prev.filter(a => a.tipo !== 'CROQUI');
                        return [...filtered, { tipo: 'CROQUI', nome }];
                      });
                      toast({
                        title: 'Croqui anexado',
                        description: `${nome} foi adicionado com sucesso.`,
                      });
                    }
                    e.target.value = '';
                  }}
                />
                {hasCroquiAttachment ? (
                  <div className="flex flex-col items-center gap-2">
                    <Check className="w-10 h-10 text-success" />
                    <p className="font-medium text-success">Croqui anexado</p>
                    <p className="text-sm text-muted-foreground">
                      {attachments.find(a => a.tipo === 'CROQUI')?.nome}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachments(prev => prev.filter(a => a.tipo !== 'CROQUI'));
                      }}
                    >
                      Remover e enviar outro
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-secondary rounded-full">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground">Clique para enviar o croqui</p>
                    <p className="text-sm text-muted-foreground">
                      Imagem (JPG, PNG) ou PDF • Máx. 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Itens Marcados no Croqui</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(Object.entries(CROQUI_ITEM_LABELS) as [CroquiItem, string][]).map(([value, label]) => (
                  <div
                    key={value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      marcacaoCroquiItens.includes(value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    )}
                    onClick={() => handleCroquiItemToggle(value)}
                  >
                    <Checkbox
                      checked={marcacaoCroquiItens.includes(value)}
                      onCheckedChange={() => handleCroquiItemToggle(value)}
                    />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="confirmaCroqui"
                  checked={marcacaoCroquiConfirmada}
                  onCheckedChange={(checked) => setMarcacaoCroquiConfirmada(checked as boolean)}
                />
                <div>
                  <Label htmlFor="confirmaCroqui" className="cursor-pointer font-medium">
                    Confirmo que marquei todos os pontos necessários no croqui *
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Esta confirmação é obrigatória para enviar o projeto.
                  </p>
                </div>
              </div>
            </div>

            <Alert className="bg-status-pending-bg border-status-pending/30">
              <Info className="h-4 w-4 text-status-pending" />
              <AlertDescription className="text-foreground">
                <strong>Observação:</strong> Não vamos assumir as câmeras do prédio/condomínio.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cronograma">Informações do Cronograma</Label>
              <Textarea
                id="cronograma"
                value={infoCronograma}
                onChange={(e) => setInfoCronograma(e.target.value)}
                placeholder="Descreva informações relevantes sobre o cronograma do projeto..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custo">Informações de Custo</Label>
              <Textarea
                id="custo"
                value={infoCusto}
                onChange={(e) => setInfoCusto(e.target.value)}
                placeholder="Descreva informações sobre custos, orçamentos, etc..."
                rows={5}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(Object.entries(ATTACHMENT_TYPE_LABELS) as [AttachmentType, string][]).map(([tipo, label]) => (
                <Card key={tipo} className="shadow-card">
                  <CardContent className="pt-4">
                    <h4 className="font-medium text-foreground mb-2">{label}</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {tipo === 'CROQUI' && '* Obrigatório'}
                      {tipo === 'PLANTA_BAIXA' && 'Recomendado'}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleMockAttachment(tipo)}
                    >
                      <Paperclip className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-foreground">Arquivos Anexados</h3>
                <div className="space-y-2">
                  {attachments.map((att, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{att.nome}</p>
                          <p className="text-xs text-muted-foreground">{ATTACHMENT_TYPE_LABELS[att.tipo]}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="adicionais">Informações Adicionais</Label>
              <Textarea
                id="adicionais"
                value={infoAdicionais}
                onChange={(e) => setInfoAdicionais(e.target.value)}
                placeholder="Outras informações relevantes para o projeto..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações Gerais</Label>
              <Textarea
                id="observacoes"
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                placeholder="Observações internas sobre o projeto..."
                rows={4}
              />
            </div>

            {/* Checklist */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Checklist - Pronto para Enviar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  {hasCroquiAttachment ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  )}
                  <span className={hasCroquiAttachment ? 'text-foreground' : 'text-muted-foreground'}>
                    Croqui anexado
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {marcacaoCroquiConfirmada ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  )}
                  <span className={marcacaoCroquiConfirmada ? 'text-foreground' : 'text-muted-foreground'}>
                    Confirmei que marquei os pontos no croqui
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {hasPlantaBaixa ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Info className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={hasPlantaBaixa ? 'text-foreground' : 'text-muted-foreground'}>
                    Planta baixa anexada (recomendado)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {controlePedestre || controleVeiculo ? (
                    <Check className="w-5 h-5 text-success" />
                  ) : (
                    <Info className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className={(controlePedestre || controleVeiculo) ? 'text-foreground' : 'text-muted-foreground'}>
                    Informações de controle de acesso preenchidas
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Novo Projeto (TAP)</h1>
          <p className="text-muted-foreground mt-1">Termo de Abertura de Projeto</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-success/10 text-success",
                    !isActive && !isCompleted && "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {step.title}
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Content */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>
              Passo {currentStep} de {STEPS.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={() => setCurrentStep(prev => Math.min(STEPS.length, prev + 1))}>
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSave(true)}
                disabled={!canSubmit || isSubmitting}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar para Projetos
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
