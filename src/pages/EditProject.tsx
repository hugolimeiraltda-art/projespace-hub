import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  AlertTriangle,
  Save,
  Send,
  Check,
  Upload,
  Loader2
} from 'lucide-react';
import {
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
import { supabase } from '@/integrations/supabase/client';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function EditProject() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getProject, updateProject, updateStatus, addAttachment, projects, isLoading: contextLoading } = useProjects();
  const { uploadFile, isUploading } = useFileUpload();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isFormLoading, setIsFormLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state - Project
  const [condominioNome, setCondominioNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [endereco, setEndereco] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [dataAssembleia, setDataAssembleia] = useState('');

  // Form state - TAP
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

  // Attachments
  const [existingAttachments, setExistingAttachments] = useState<{ tipo: AttachmentType; nome: string }[]>([]);
  const [newAttachments, setNewAttachments] = useState<{ tipo: AttachmentType; nome: string; file?: File }[]>([]);

  // Load project data
  useEffect(() => {
    if (contextLoading) return;
    
    const project = getProject(id!);
    if (project) {
      setCondominioNome(project.cliente_condominio_nome);
      setCidade(project.cliente_cidade || '');
      setEstado(project.cliente_estado || '');
      setEndereco(project.endereco_condominio || '');
      setPrazoEntrega(project.prazo_entrega_projeto || '');
      setDataAssembleia(project.data_assembleia || '');

      if (project.tap_form) {
        const tap = project.tap_form;
        setPortariaVirtual(tap.portaria_virtual_atendimento_app || 'NAO');
        setNumeroBlocos(tap.numero_blocos || 1);
        setInterfonia(tap.interfonia || false);
        setControlePedestre(tap.controle_acessos_pedestre_descricao || '');
        setControleVeiculo(tap.controle_acessos_veiculo_descricao || '');
        setAlarme(tap.alarme_descricao || '');
        setCftvDvr(tap.cftv_dvr_descricao || '');
        setCftvElevador(tap.cftv_elevador_possui || 'NAO_INFORMADO');
        setMarcacaoCroquiConfirmada(tap.marcacao_croqui_confirmada || false);
        setMarcacaoCroquiItens((tap.marcacao_croqui_itens as CroquiItem[]) || []);
        setInfoCusto(tap.info_custo || '');
        setInfoCronograma(tap.info_cronograma || '');
        setInfoAdicionais(tap.info_adicionais || '');
      }

      setExistingAttachments(project.attachments.map(a => ({ tipo: a.tipo, nome: a.nome_arquivo })));
    }
    setIsFormLoading(false);
  }, [id, projects, getProject, contextLoading]);

  const project = getProject(id!);
  const canSubmit = project?.status === 'PENDENTE_INFO' || project?.status === 'RASCUNHO';

  const hasCroquiAttachment = existingAttachments.some(a => a.tipo === 'CROQUI') || newAttachments.some(a => a.tipo === 'CROQUI');

  const handleCroquiItemToggle = (item: CroquiItem) => {
    setMarcacaoCroquiItens(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  const generateEmail = () => {
    const portariaLabel = PORTARIA_VIRTUAL_LABELS[portariaVirtual];
    const cftvElevadorLabel = CFTV_ELEVADOR_LABELS[cftvElevador];
    const allAttachments = [...existingAttachments, ...newAttachments];

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
- Planta baixa: ${allAttachments.some(a => a.tipo === 'PLANTA_BAIXA') ? 'Sim' : 'Não'}
- Croqui: ${allAttachments.some(a => a.tipo === 'CROQUI') ? 'Sim' : 'Não'}
- Arquivos de imagens: ${allAttachments.some(a => a.tipo === 'IMAGENS') ? 'Sim' : 'Não'}

Informações adicionais
${infoAdicionais || 'Não informado'}`;
  };

  const handleSave = async (sendToProjects: boolean) => {
    if (!user || !project) return;

    setIsSubmitting(true);

    try {
      // Update project and TAP form together
      await updateProject(project.id, {
        cliente_condominio_nome: condominioNome,
        cliente_cidade: cidade,
        cliente_estado: estado,
        endereco_condominio: endereco,
        prazo_entrega_projeto: prazoEntrega || undefined,
        data_assembleia: dataAssembleia || undefined,
        email_padrao_gerado: generateEmail(),
      }, {
        portaria_virtual_atendimento_app: portariaVirtual,
        numero_blocos: numeroBlocos,
        interfonia,
        controle_acessos_pedestre_descricao: controlePedestre || undefined,
        controle_acessos_veiculo_descricao: controleVeiculo || undefined,
        alarme_descricao: alarme || undefined,
        cftv_dvr_descricao: cftvDvr || undefined,
        cftv_elevador_possui: cftvElevador,
        marcacao_croqui_confirmada: marcacaoCroquiConfirmada,
        marcacao_croqui_itens: marcacaoCroquiItens,
        info_custo: infoCusto || undefined,
        info_cronograma: infoCronograma || undefined,
        info_adicionais: infoAdicionais || undefined,
      });

      // Add new attachments with real upload
      for (const att of newAttachments) {
        if (att.file) {
          const uploadResult = await uploadFile(att.file, project.id, att.tipo.toLowerCase());
          if (uploadResult) {
            await addAttachment(project.id, {
              tipo: att.tipo,
              arquivo_url: uploadResult.url,
              nome_arquivo: att.nome,
            });
          }
        }
      }

      // If sending to projects (first time or resubmission)
      if (sendToProjects && (project.status === 'RASCUNHO' || project.status === 'PENDENTE_INFO')) {
        const isResubmission = project.status === 'PENDENTE_INFO';
        await updateStatus(project.id, 'ENVIADO', user.id, user.nome);
        
        // Notify projetos team via email
        try {
          await supabase.functions.invoke('notify-project-submitted', {
            body: {
              project_id: project.id,
              project_name: condominioNome,
              vendedor_name: user.nome,
              vendedorEmail: user.email,
              cidade: cidade,
              estado: estado,
              is_resubmission: isResubmission,
            },
          });
          console.log('Notification sent to projetos team');
        } catch (err) {
          console.error('Error notifying team:', err);
        }
      }

      const isResubmission = project.status === 'PENDENTE_INFO';
      toast({
        title: sendToProjects ? (isResubmission ? 'Projeto reenviado!' : 'Projeto enviado!') : 'Alterações salvas!',
        description: sendToProjects 
          ? (isResubmission ? 'O projeto foi reenviado para a equipe de Projetos.' : 'O projeto foi enviado para a equipe de Projetos. A equipe será notificada por email.')
          : 'As alterações foram salvas com sucesso.',
      });

      navigate(`/projetos/${project.id}`);
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o projeto.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const isLoading = contextLoading || isFormLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando projeto...</p>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Projeto não encontrado</h1>
          <Button className="mt-4" onClick={() => navigate('/projetos')}>
            Voltar para Projetos
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Editar Projeto</h1>
            <p className="text-sm text-muted-foreground">{project.cliente_condominio_nome}</p>
          </div>
        </div>

        {project.status === 'PENDENTE_INFO' && (
          <Alert className="mb-6 bg-status-pending-bg border-status-pending/30">
            <AlertTriangle className="h-4 w-4 text-status-pending" />
            <AlertDescription className="text-foreground">
              Este projeto está pendente de informações. Após editar, você pode reenviá-lo para a equipe de Projetos.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Identificação */}
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label htmlFor="prazo">Prazo de Entrega</Label>
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
            </CardContent>
          </Card>

          {/* Configuração TAP */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração TAP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Portaria Virtual</Label>
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
                  <Label htmlFor="blocos">Número de Blocos</Label>
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
                      placeholder="Descreva o controle de acesso..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="veiculo">Veículo</Label>
                    <Textarea
                      id="veiculo"
                      value={controleVeiculo}
                      onChange={(e) => setControleVeiculo(e.target.value)}
                      placeholder="Descreva o controle de acesso..."
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
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cftv">CFTV / DVR</Label>
                    <Textarea
                      id="cftv"
                      value={cftvDvr}
                      onChange={(e) => setCftvDvr(e.target.value)}
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
            </CardContent>
          </Card>

          {/* Croqui */}
          <Card>
            <CardHeader>
              <CardTitle>Croqui</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg">
                <Checkbox
                  id="croqui-confirmado"
                  checked={marcacaoCroquiConfirmada}
                  onCheckedChange={(checked) => setMarcacaoCroquiConfirmada(checked as boolean)}
                />
                <Label htmlFor="croqui-confirmado" className="cursor-pointer">
                  Confirmo que os pontos foram devidamente marcados no croqui
                </Label>
              </div>

              <div>
                <Label className="mb-2 block">Itens marcados no croqui:</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.entries(CROQUI_ITEM_LABELS) as [CroquiItem, string][]).map(([value, label]) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`croqui-${value}`}
                        checked={marcacaoCroquiItens.includes(value)}
                        onCheckedChange={() => handleCroquiItemToggle(value)}
                      />
                      <Label htmlFor={`croqui-${value}`} className="text-sm cursor-pointer">
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload de novo croqui */}
              <div 
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                  hasCroquiAttachment 
                    ? "border-status-approved bg-status-approved/5" 
                    : "border-border hover:border-primary hover:bg-accent"
                )}
                onClick={() => document.getElementById('croqui-edit-upload')?.click()}
              >
                <input
                  id="croqui-edit-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewAttachments(prev => {
                        const filtered = prev.filter(a => a.tipo !== 'CROQUI');
                        return [...filtered, { tipo: 'CROQUI', nome: file.name, file }];
                      });
                      toast({ title: 'Novo croqui anexado' });
                    }
                    e.target.value = '';
                  }}
                />
                {hasCroquiAttachment ? (
                  <div className="flex flex-col items-center gap-2">
                    <Check className="w-8 h-8 text-status-approved" />
                    <p className="text-sm font-medium">Croqui anexado</p>
                    <p className="text-xs text-muted-foreground">Clique para substituir</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Anexar croqui</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Informações */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cronograma">Cronograma</Label>
                <Textarea
                  id="cronograma"
                  value={infoCronograma}
                  onChange={(e) => setInfoCronograma(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custo">Custos</Label>
                <Textarea
                  id="custo"
                  value={infoCusto}
                  onChange={(e) => setInfoCusto(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adicionais">Outras informações</Label>
                <Textarea
                  id="adicionais"
                  value={infoAdicionais}
                  onChange={(e) => setInfoAdicionais(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
            {canSubmit && (
              <Button onClick={() => handleSave(true)} disabled={isSubmitting}>
                <Send className="w-4 h-4 mr-2" />
                {project.status === 'PENDENTE_INFO' ? 'Reenviar para Projetos' : 'Enviar para Projetos'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
