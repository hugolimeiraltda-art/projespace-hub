import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Camera,
  DoorOpen,
  Gauge,
  Lock,
  Phone,
  Save,
  Send,
  Shield,
  Upload,
  Check,
  AlertTriangle,
  Copy,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { 
  SaleCompletedForm as SaleFormType, 
  AlarmeTipo, 
  MetodoAcionamentoPortoes,
  CentralAlarmeTipo,
  METODO_ACIONAMENTO_LABELS,
  ALARME_TIPO_LABELS,
  AttachmentType
} from '@/types/project';

const SECTIONS = [
  { id: 'identificacao', label: 'Identificação', icon: Building },
  { id: 'infra', label: 'Infra / Central', icon: Gauge },
  { id: 'telefonia', label: 'Telefonia / Interfonia', icon: Phone },
  { id: 'portas', label: 'Portas', icon: DoorOpen },
  { id: 'portoes', label: 'Portões', icon: DoorOpen },
  { id: 'cftv-aproveitado', label: 'CFTV Aproveitado', icon: Camera },
  { id: 'cftv-novo', label: 'CFTV Novo', icon: Camera },
  { id: 'alarme', label: 'Alarme', icon: Shield },
  { id: 'controle-acesso', label: 'Controle de Acesso', icon: Lock },
  { id: 'cameras-novas', label: 'Câmeras Novas', icon: Camera },
  { id: 'revisao', label: 'Revisão e Envio', icon: CheckCircle2 },
];

export default function SaleCompletedForm() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getProject, initSaleForm, updateSaleForm, submitSaleForm, addAttachment } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();

  const project = getProject(id!);
  
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<Partial<SaleFormType>>({});
  const [attachments, setAttachments] = useState<Record<AttachmentType, string[]>>({} as Record<AttachmentType, string[]>);

  useEffect(() => {
    if (project && !project.sale_form) {
      initSaleForm(project.id);
    }
    if (project?.sale_form) {
      setFormData(project.sale_form);
    }
  }, [project, initSaleForm]);

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

  const isLocked = !!project.sale_locked_at;
  
  const updateField = <K extends keyof SaleFormType>(field: K, value: SaleFormType[K]) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, [field]: value }));
    updateSaleForm(project.id, { [field]: value });
  };

  const handleSaveDraft = () => {
    toast({
      title: 'Rascunho salvo',
      description: 'Suas alterações foram salvas com sucesso.',
    });
  };

  const handleSubmit = () => {
    // Validate required fields
    const errors: string[] = [];
    
    if (!formData.nome_condominio) errors.push('Nome do condomínio');
    if (!formData.qtd_blocos || formData.qtd_blocos < 1) errors.push('Quantidade de blocos');
    if (!formData.qtd_apartamentos || formData.qtd_apartamentos < 1) errors.push('Quantidade de apartamentos');
    if (!formData.filial) errors.push('Filial');
    if (!formData.cabo_metros_qdg_ate_central) errors.push('Metragem do cabo QDG até central');
    if (!formData.internet_exclusiva) errors.push('Internet exclusiva');
    if (!formData.qtd_portas_pedestre && formData.qtd_portas_pedestre !== 0) errors.push('Quantidade de portas pedestre');
    if (!formData.qtd_portas_bloco && formData.qtd_portas_bloco !== 0) errors.push('Quantidade de portas bloco');

    if (errors.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Preencha os campos: ${errors.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    submitSaleForm(project.id);
    toast({
      title: 'Venda Concluída enviada!',
      description: 'O formulário foi enviado e bloqueado para edição.',
    });
    navigate(`/projetos/${project.id}`);
  };

  const handleFileUpload = (type: AttachmentType, file: File) => {
    addAttachment(project.id, {
      tipo: type,
      arquivo_url: URL.createObjectURL(file),
      nome_arquivo: file.name,
    });
    toast({
      title: 'Arquivo anexado',
      description: file.name,
    });
  };

  const generateNOCSummary = () => {
    const lines = [
      `RESUMO TÉCNICO PARA O NOC`,
      `========================`,
      ``,
      `Condomínio: ${formData.nome_condominio || '-'}`,
      `Filial: ${formData.filial || '-'}`,
      `Apartamentos: ${formData.qtd_apartamentos || '-'} | Blocos: ${formData.qtd_blocos || '-'}`,
      ``,
      `INFRAESTRUTURA`,
      `- Acesso ao local: ${formData.acesso_local_central_portaria || '-'}`,
      `- Metragem cabo QDG->Central: ${formData.cabo_metros_qdg_ate_central || '-'} metros`,
      `- Internet exclusiva: ${formData.internet_exclusiva || '-'}`,
      ``,
      `PORTAS`,
      `- Pedestre: ${formData.qtd_portas_pedestre || 0}`,
      `- Bloco: ${formData.qtd_portas_bloco || 0}`,
      `- Saída autenticada: ${formData.qtd_saida_autenticada || 0}`,
      ``,
      `PORTÕES`,
      `- Deslizantes: ${formData.qtd_portoes_deslizantes || 0}`,
      `- Pivotantes: ${formData.qtd_portoes_pivotantes || 0}`,
      `- Basculantes: ${formData.qtd_portoes_basculantes || 0}`,
      `- Método acionamento: ${formData.metodo_acionamento_portoes ? METODO_ACIONAMENTO_LABELS[formData.metodo_acionamento_portoes] : '-'}`,
      ``,
      `CFTV`,
      `- DVRs aproveitados: ${formData.qtd_dvrs_aproveitados || 0} (${formData.marca_modelo_dvr_aproveitado || '-'})`,
      `- Câmeras aproveitadas: ${formData.qtd_cameras_aproveitadas || 0}`,
      `- DVRs novos: 4ch=${formData.cftv_novo_qtd_dvr_4ch || 0}, 8ch=${formData.cftv_novo_qtd_dvr_8ch || 0}, 16ch=${formData.cftv_novo_qtd_dvr_16ch || 0}`,
      `- Total câmeras novas: ${formData.cftv_novo_qtd_total_cameras || 0}`,
      `- Câmeras elevador: ${formData.qtd_cameras_elevador || 0}`,
      `- Acessos com câmera int/ext: ${formData.acessos_tem_camera_int_ext ? 'Sim' : 'Não'}`,
      ``,
      `ALARME`,
      `- Tipo: ${formData.alarme_tipo ? ALARME_TIPO_LABELS[formData.alarme_tipo] : '-'}`,
    ];

    if (formData.alarme_tipo === 'IVA') {
      lines.push(
        `- Central: ${formData.iva_central_alarme_tipo || '-'}`,
        `- Pares existentes: ${formData.iva_qtd_pares_existentes || 0}`,
        `- IVAs novos: ${formData.iva_qtd_novos || 0}`,
        `- Cabo blindado: ${formData.iva_qtd_cabo_blindado || '-'}`
      );
    } else if (formData.alarme_tipo === 'CERCA_ELETRICA') {
      lines.push(
        `- Central: ${formData.cerca_central_alarme_tipo || '-'}`,
        `- Metragem linear: ${formData.cerca_metragem_linear_total || 0}m`,
        `- Quantidade de fios: ${formData.cerca_qtd_fios || 0}`
      );
    }

    lines.push(
      ``,
      `CONTROLE DE ACESSO`,
      `- Cancela: ${formData.possui_cancela ? `Sim (${(formData.cancela_qtd_sentido_unico || 0) + (formData.cancela_qtd_duplo_sentido || 0)} unidades)` : 'Não'}`,
      `- Catraca: ${formData.possui_catraca ? `Sim (${(formData.catraca_qtd_sentido_unico || 0) + (formData.catraca_qtd_duplo_sentido || 0)} unidades)` : 'Não'}`,
      `- Totem: ${formData.possui_totem ? `Sim (${(formData.totem_qtd_simples || 0) + (formData.totem_qtd_duplo || 0)} unidades)` : 'Não'}`,
      ``,
      `OBSERVAÇÕES`,
      formData.obs_gerais || '-'
    );

    return lines.join('\n');
  };

  const generateChecklist = () => {
    const checklist = {
      'Dados do condomínio preenchidos': !!(formData.nome_condominio && formData.qtd_blocos && formData.qtd_apartamentos && formData.filial),
      'Informações de infraestrutura completas': !!(formData.cabo_metros_qdg_ate_central && formData.internet_exclusiva),
      'Portas definidas': !!(formData.qtd_portas_pedestre !== undefined || formData.qtd_portas_bloco !== undefined),
      'CFTV configurado': !!(formData.cftv_novo_qtd_total_cameras !== undefined),
      'Alarme definido': !!formData.alarme_tipo,
    };

    if (formData.alarme_tipo === 'IVA') {
      checklist['Configuração IVA completa'] = !!(formData.iva_central_alarme_tipo);
    } else if (formData.alarme_tipo === 'CERCA_ELETRICA') {
      checklist['Configuração Cerca completa'] = !!(formData.cerca_central_alarme_tipo && formData.cerca_metragem_linear_total);
    }

    if (formData.possui_cancela) {
      checklist['Cancelas configuradas'] = !!(formData.cancela_qtd_sentido_unico !== undefined || formData.cancela_qtd_duplo_sentido !== undefined);
    }

    if (formData.possui_catraca) {
      checklist['Catracas configuradas'] = !!(formData.catraca_qtd_sentido_unico !== undefined || formData.catraca_qtd_duplo_sentido !== undefined);
    }

    if (formData.possui_totem) {
      checklist['Totens configurados'] = !!(formData.totem_qtd_simples !== undefined || formData.totem_qtd_duplo !== undefined);
    }

    return checklist;
  };

  const handleCopyNOC = () => {
    navigator.clipboard.writeText(generateNOCSummary());
    toast({ title: 'Copiado!', description: 'Resumo NOC copiado para a área de transferência.' });
  };

  const handleDownloadNOC = () => {
    const blob = new Blob([generateNOCSummary()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo_noc_${formData.nome_condominio?.replace(/\s+/g, '_') || 'projeto'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progress = ((currentSection + 1) / SECTIONS.length) * 100;

  const renderFileUpload = (type: AttachmentType, label: string, required?: boolean) => (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isLocked ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-accent"
        )}
        onClick={() => !isLocked && document.getElementById(`upload-${type}`)?.click()}
      >
        <input
          id={`upload-${type}`}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dwg"
          multiple
          className="hidden"
          disabled={isLocked}
          onChange={(e) => {
            const files = e.target.files;
            if (files) {
              Array.from(files).forEach(file => handleFileUpload(type, file));
            }
            e.target.value = '';
          }}
        />
        <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Clique para enviar arquivos</p>
        <p className="text-xs text-muted-foreground">Imagens, PDF, Word, Excel, DWG</p>
      </div>
      {project.attachments.filter(a => a.tipo === type).length > 0 && (
        <div className="mt-2 space-y-1">
          {project.attachments.filter(a => a.tipo === type).map(att => (
            <div key={att.id} className="text-sm text-muted-foreground flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              {att.nome_arquivo}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSection = () => {
    const section = SECTIONS[currentSection];

    switch (section.id) {
      case 'identificacao':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Condomínio *</Label>
                <Input
                  value={formData.nome_condominio || ''}
                  onChange={(e) => updateField('nome_condominio', e.target.value)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Filial *</Label>
                <Input
                  value={formData.filial || ''}
                  onChange={(e) => updateField('filial', e.target.value)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade de Apartamentos *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.qtd_apartamentos || ''}
                  onChange={(e) => updateField('qtd_apartamentos', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade de Blocos *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.qtd_blocos || ''}
                  onChange={(e) => updateField('qtd_blocos', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Input value={formData.vendedor_nome || ''} disabled className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label>Email do Vendedor</Label>
                <Input value={formData.vendedor_email || ''} disabled className="bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label>Produto</Label>
                <Input value={formData.produto || 'Portaria Digital'} disabled className="bg-secondary" />
              </div>
            </div>
          </div>
        );

      case 'infra':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Acesso ao local da central de portaria</Label>
                <Input
                  value={formData.acesso_local_central_portaria || ''}
                  onChange={(e) => updateField('acesso_local_central_portaria', e.target.value)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Metros de cabo do QDG até a central *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cabo_metros_qdg_ate_central || ''}
                  onChange={(e) => updateField('cabo_metros_qdg_ate_central', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Internet exclusiva *</Label>
                <Select
                  value={formData.internet_exclusiva || ''}
                  onValueChange={(v) => updateField('internet_exclusiva', v)}
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">Sim, possui internet exclusiva</SelectItem>
                    <SelectItem value="NAO">Não possui internet exclusiva</SelectItem>
                    <SelectItem value="A_CONTRATAR">A contratar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observações sobre central de portaria e QDG</Label>
                <Textarea
                  value={formData.obs_central_portaria_qdg || ''}
                  onChange={(e) => updateField('obs_central_portaria_qdg', e.target.value)}
                  disabled={isLocked}
                  rows={3}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFileUpload('CENTRAL_PORTARIA_FOTOS', 'Fotos do local da Central de Portaria', true)}
              {renderFileUpload('QDG_FOTO', 'Foto do QDG')}
            </div>
          </div>
        );

      case 'telefonia':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Haverá transbordo para apartamentos?</Label>
                <Select
                  value={formData.transbordo_para_apartamentos || ''}
                  onValueChange={(v) => updateField('transbordo_para_apartamentos', v)}
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">Sim</SelectItem>
                    <SelectItem value="NAO">Não</SelectItem>
                    <SelectItem value="A_DEFINIR">A definir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição do local da central de interfonia</Label>
                <Textarea
                  value={formData.local_central_interfonia_descricao || ''}
                  onChange={(e) => updateField('local_central_interfonia_descricao', e.target.value)}
                  disabled={isLocked}
                  rows={3}
                />
              </div>
            </div>
            {renderFileUpload('INTERFONIA_FOTO', 'Foto da Central de Interfonia')}
          </div>
        );

      case 'portas':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade de portas de pedestre *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_portas_pedestre ?? ''}
                  onChange={(e) => updateField('qtd_portas_pedestre', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade de portas de bloco *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_portas_bloco ?? ''}
                  onChange={(e) => updateField('qtd_portas_bloco', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Portas com saída autenticada</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_saida_autenticada ?? ''}
                  onChange={(e) => updateField('qtd_saida_autenticada', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações das portas</Label>
              <Textarea
                value={formData.obs_portas || ''}
                onChange={(e) => updateField('obs_portas', e.target.value)}
                disabled={isLocked}
                rows={3}
              />
            </div>
            {renderFileUpload('PORTAS_FOTOS', 'Fotos das Portas', true)}
          </div>
        );

      case 'portoes':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Portões deslizantes</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_portoes_deslizantes ?? ''}
                  onChange={(e) => updateField('qtd_portoes_deslizantes', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Portões pivotantes</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_portoes_pivotantes ?? ''}
                  onChange={(e) => updateField('qtd_portoes_pivotantes', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Portões basculantes</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_portoes_basculantes ?? ''}
                  onChange={(e) => updateField('qtd_portoes_basculantes', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Método de acionamento dos portões</Label>
              <Select
                value={formData.metodo_acionamento_portoes || ''}
                onValueChange={(v) => updateField('metodo_acionamento_portoes', v as MetodoAcionamentoPortoes)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METODO_ACIONAMENTO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderFileUpload('PORTOES_FOTOS', 'Fotos dos Portões')}
          </div>
        );

      case 'cftv-aproveitado':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade de DVRs aproveitados</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_dvrs_aproveitados ?? ''}
                  onChange={(e) => updateField('qtd_dvrs_aproveitados', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Marca/Modelo do DVR aproveitado</Label>
                <Input
                  value={formData.marca_modelo_dvr_aproveitado || ''}
                  onChange={(e) => updateField('marca_modelo_dvr_aproveitado', e.target.value)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade de câmeras aproveitadas</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_cameras_aproveitadas ?? ''}
                  onChange={(e) => updateField('qtd_cameras_aproveitadas', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFileUpload('CFTV_CENTRAL_FOTO', 'Foto da Central CFTV')}
              {renderFileUpload('DVRS_FOTOS', 'Fotos dos DVRs')}
              {renderFileUpload('CAMERAS_INSTALADAS_FOTOS', 'Fotos das Câmeras Instaladas')}
            </div>
          </div>
        );

      case 'cftv-novo':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>DVRs novos (4 canais)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cftv_novo_qtd_dvr_4ch ?? ''}
                  onChange={(e) => updateField('cftv_novo_qtd_dvr_4ch', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>DVRs novos (8 canais)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cftv_novo_qtd_dvr_8ch ?? ''}
                  onChange={(e) => updateField('cftv_novo_qtd_dvr_8ch', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>DVRs novos (16 canais)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cftv_novo_qtd_dvr_16ch ?? ''}
                  onChange={(e) => updateField('cftv_novo_qtd_dvr_16ch', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Total de câmeras novas *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.cftv_novo_qtd_total_cameras ?? ''}
                  onChange={(e) => updateField('cftv_novo_qtd_total_cameras', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Câmeras de elevador</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.qtd_cameras_elevador ?? ''}
                  onChange={(e) => updateField('qtd_cameras_elevador', parseInt(e.target.value) || 0)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label>Acessos têm câmera int/ext?</Label>
                <div className="flex items-center gap-3 pt-2">
                  <Switch
                    checked={formData.acessos_tem_camera_int_ext || false}
                    onCheckedChange={(v) => updateField('acessos_tem_camera_int_ext', v)}
                    disabled={isLocked}
                  />
                  <span className="text-sm">{formData.acessos_tem_camera_int_ext ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'alarme':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Tipo de Alarme</Label>
              <Select
                value={formData.alarme_tipo || ''}
                onValueChange={(v) => updateField('alarme_tipo', v as AlarmeTipo)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ALARME_TIPO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.alarme_tipo === 'IVA' && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Configuração IVA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Central de alarme</Label>
                      <Select
                        value={formData.iva_central_alarme_tipo || ''}
                        onValueChange={(v) => updateField('iva_central_alarme_tipo', v as CentralAlarmeTipo)}
                        disabled={isLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOVA">Nova</SelectItem>
                          <SelectItem value="APROVEITADA">Aproveitada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pares de IVAs existentes</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.iva_qtd_pares_existentes ?? ''}
                        onChange={(e) => updateField('iva_qtd_pares_existentes', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade de IVAs novos</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.iva_qtd_novos ?? ''}
                        onChange={(e) => updateField('iva_qtd_novos', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cabo blindado para IVAs</Label>
                      <Input
                        value={formData.iva_qtd_cabo_blindado || ''}
                        onChange={(e) => updateField('iva_qtd_cabo_blindado', e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  {renderFileUpload('ALARME_CENTRAL_FOTO_IVA', 'Foto da Central de Alarme (IVA)', true)}
                </CardContent>
              </Card>
            )}

            {formData.alarme_tipo === 'CERCA_ELETRICA' && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Configuração Cerca Elétrica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Central de alarme</Label>
                      <Select
                        value={formData.cerca_central_alarme_tipo || ''}
                        onValueChange={(v) => updateField('cerca_central_alarme_tipo', v as CentralAlarmeTipo)}
                        disabled={isLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NOVA">Nova</SelectItem>
                          <SelectItem value="APROVEITADA">Aproveitada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cabo centenax (metros)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.cerca_qtd_cabo_centenax ?? ''}
                        onChange={(e) => updateField('cerca_qtd_cabo_centenax', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Local de instalação da central de choque</Label>
                      <Textarea
                        value={formData.cerca_local_central_choque || ''}
                        onChange={(e) => updateField('cerca_local_central_choque', e.target.value)}
                        disabled={isLocked}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Metragem linear total *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.cerca_metragem_linear_total ?? ''}
                        onChange={(e) => updateField('cerca_metragem_linear_total', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade de fios *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.cerca_qtd_fios ?? ''}
                        onChange={(e) => updateField('cerca_qtd_fios', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderFileUpload('ALARME_CENTRAL_FOTO_CERCA', 'Foto da Central de Alarme')}
                    {renderFileUpload('CHOQUE_FOTO', 'Foto da Central de Choque')}
                    {renderFileUpload('CERCA_FOTOS', 'Fotos da Cerca Elétrica (mín. 4)', true)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'controle-acesso':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Possui Cancela</Label>
                  <Switch
                    checked={formData.possui_cancela || false}
                    onCheckedChange={(v) => updateField('possui_cancela', v)}
                    disabled={isLocked}
                  />
                </div>
              </div>
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Possui Catraca</Label>
                  <Switch
                    checked={formData.possui_catraca || false}
                    onCheckedChange={(v) => updateField('possui_catraca', v)}
                    disabled={isLocked}
                  />
                </div>
              </div>
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Possui Totem</Label>
                  <Switch
                    checked={formData.possui_totem || false}
                    onCheckedChange={(v) => updateField('possui_totem', v)}
                    disabled={isLocked}
                  />
                </div>
              </div>
            </div>

            {formData.possui_cancela && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Cancelas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cancelas sentido único</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.cancela_qtd_sentido_unico ?? ''}
                        onChange={(e) => updateField('cancela_qtd_sentido_unico', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cancelas duplo sentido</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.cancela_qtd_duplo_sentido ?? ''}
                        onChange={(e) => updateField('cancela_qtd_duplo_sentido', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cancela aproveitada?</Label>
                      <Input
                        value={formData.cancela_aproveitada_detalhes || ''}
                        onChange={(e) => updateField('cancela_aproveitada_detalhes', e.target.value)}
                        disabled={isLocked}
                        placeholder="Detalhes de cancela aproveitada, se houver"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Autenticação das cancelas</Label>
                      <Input
                        value={formData.cancela_autenticacao || ''}
                        onChange={(e) => updateField('cancela_autenticacao', e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  {renderFileUpload('CANCELA_FOTOS', 'Fotos das Cancelas', true)}
                </CardContent>
              </Card>
            )}

            {formData.possui_catraca && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Catracas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Catracas sentido único</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.catraca_qtd_sentido_unico ?? ''}
                        onChange={(e) => updateField('catraca_qtd_sentido_unico', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Catracas duplo sentido</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.catraca_qtd_duplo_sentido ?? ''}
                        onChange={(e) => updateField('catraca_qtd_duplo_sentido', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Catraca aproveitada?</Label>
                      <Input
                        value={formData.catraca_aproveitada_detalhes || ''}
                        onChange={(e) => updateField('catraca_aproveitada_detalhes', e.target.value)}
                        disabled={isLocked}
                        placeholder="Detalhes de catraca aproveitada, se houver"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Autenticação das catracas</Label>
                      <Input
                        value={formData.catraca_autenticacao || ''}
                        onChange={(e) => updateField('catraca_autenticacao', e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  {renderFileUpload('CATRACA_FOTOS', 'Fotos das Catracas', true)}
                </CardContent>
              </Card>
            )}

            {formData.possui_totem && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Totens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Totens simples</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.totem_qtd_simples ?? ''}
                        onChange={(e) => updateField('totem_qtd_simples', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Totens duplo</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.totem_qtd_duplo ?? ''}
                        onChange={(e) => updateField('totem_qtd_duplo', parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  {renderFileUpload('TOTEM_FOTOS', 'Fotos dos Totens', true)}
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'cameras-novas':
        return (
          <div className="space-y-6">
            <Alert>
              <Camera className="w-4 h-4" />
              <AlertDescription>
                Envie as fotos dos locais de instalação das câmeras novas. Você pode enviar até 8 fotos por vez e adicionar mais conforme necessário.
              </AlertDescription>
            </Alert>
            {renderFileUpload('CAMERAS_NOVAS_FOTOS', 'Fotos das Câmeras Novas (máx. 8 por vez)')}
            <div className="space-y-2">
              <Label>Observações gerais</Label>
              <Textarea
                value={formData.obs_gerais || ''}
                onChange={(e) => updateField('obs_gerais', e.target.value)}
                disabled={isLocked}
                rows={4}
                placeholder="Adicione observações gerais sobre o projeto..."
              />
            </div>
          </div>
        );

      case 'revisao':
        const checklist = generateChecklist();
        const allChecked = Object.values(checklist).every(v => v);

        return (
          <div className="space-y-6">
            {isLocked && (
              <Alert className="bg-status-approved-bg border-status-approved/30">
                <Lock className="w-4 h-4 text-status-approved" />
                <AlertDescription className="text-foreground">
                  Este formulário foi enviado e está bloqueado para edição.
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Checklist de Implantação
                </CardTitle>
                <CardDescription>Verifique os itens antes de enviar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(checklist).map(([item, checked]) => (
                    <div key={item} className="flex items-center gap-3">
                      {checked ? (
                        <Check className="w-5 h-5 text-status-approved" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-status-pending" />
                      )}
                      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo Técnico para o NOC</CardTitle>
                <CardDescription>Conteúdo gerado automaticamente baseado no formulário</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm bg-secondary p-4 rounded-lg font-mono text-foreground max-h-96 overflow-y-auto">
                  {generateNOCSummary()}
                </pre>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={handleCopyNOC}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Resumo NOC
                  </Button>
                  <Button variant="outline" onClick={handleDownloadNOC}>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar .txt
                  </Button>
                </div>
              </CardContent>
            </Card>

            {!isLocked && (
              <Alert className={allChecked ? "bg-status-approved-bg border-status-approved/30" : "bg-status-pending-bg border-status-pending/30"}>
                {allChecked ? (
                  <Check className="w-4 h-4 text-status-approved" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-status-pending" />
                )}
                <AlertDescription className="text-foreground">
                  {allChecked 
                    ? 'Todos os itens do checklist foram preenchidos. Você pode enviar o formulário.'
                    : 'Existem itens pendentes no checklist. Revise antes de enviar.'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/projetos/${project.id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Venda Concluída (Form 2)</h1>
            <p className="text-muted-foreground">{project.cliente_condominio_nome}</p>
          </div>
          {isLocked && (
            <div className="flex items-center gap-2 text-status-approved">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">Formulário Bloqueado</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Seção {currentSection + 1} de {SECTIONS.length}
            </span>
            <span className="text-sm font-medium">{SECTIONS[currentSection].label}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Section Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {SECTIONS.map((section, index) => {
            const Icon = section.icon;
            return (
              <Button
                key={section.id}
                variant={currentSection === index ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentSection(index)}
                className={cn(
                  "flex-shrink-0",
                  currentSection === index && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {section.label}
              </Button>
            );
          })}
        </div>

        {/* Form Content */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = SECTIONS[currentSection].icon;
                return <Icon className="w-5 h-5" />;
              })()}
              {SECTIONS[currentSection].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderSection()}
          </CardContent>
        </Card>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
            disabled={currentSection === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {!isLocked && (
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="w-4 h-4 mr-2" />
                Salvar Rascunho
              </Button>
            )}
            
            {currentSection === SECTIONS.length - 1 ? (
              !isLocked && (
                <Button onClick={handleSubmit} className="bg-status-approved hover:bg-status-approved/90">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Venda Concluída
                </Button>
              )
            ) : (
              <Button onClick={() => setCurrentSection(prev => Math.min(SECTIONS.length - 1, prev + 1))}>
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
