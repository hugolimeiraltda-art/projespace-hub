import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
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
  Plus,
} from 'lucide-react';
import { SectionFileUpload } from '@/components/SectionFileUpload';
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

export default function InformarNovaVenda() {
  const { user } = useAuth();
  const { addProject, initSaleForm, updateSaleForm, submitSaleForm, refreshProjects } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<Partial<SaleFormType>>({});
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string; email: string }[]>([]);

  // Check if user can edit vendedor fields
  const canEditVendedor = user?.role === 'admin' || user?.role === 'administrativo' || user?.role === 'implantacao';

  // Fetch vendedores list for select
  useEffect(() => {
    const fetchVendedores = async () => {
      if (!canEditVendedor) return;
      
      try {
        // Get users with vendedor role
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'vendedor');
        
        if (rolesError) throw rolesError;
        
        if (userRoles && userRoles.length > 0) {
          const userIds = userRoles.map(ur => ur.user_id);
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, nome, email')
            .in('id', userIds)
            .order('nome');
          
          if (profilesError) throw profilesError;
          
          setVendedores(profiles || []);
        }
      } catch (error) {
        console.error('Error fetching vendedores:', error);
      }
    };
    
    fetchVendedores();
  }, [canEditVendedor]);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        vendedor_nome: user.nome,
        vendedor_email: user.email,
        filial: user.filial || '',
        produto: 'Portaria Digital',
      });
    }
  }, [user]);

  const updateField = <K extends keyof SaleFormType>(field: K, value: SaleFormType[K]) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // If project already created, sync with database
    if (projectId) {
      updateSaleForm(projectId, { [field]: value });
    }
  };

  const handleSaveDraft = async () => {
    // Create project if not already created
    if (!projectId) {
      if (!formData.nome_condominio) {
        toast({
          title: 'Campo obrigatório',
          description: 'Preencha o nome do condomínio antes de salvar.',
          variant: 'destructive',
        });
        return;
      }

      setIsCreating(true);
      try {
        // Create a new project directly with sale_status and implantacao_status
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            created_by_user_id: user!.id,
            vendedor_nome: user!.nome,
            vendedor_email: user!.email,
            cliente_condominio_nome: formData.nome_condominio,
            status: 'APROVADO_PROJETO', // Skip the project flow, go directly to approved
            sale_status: 'EM_ANDAMENTO',
          })
          .select()
          .single();

        if (projectError || !newProject) {
          console.error('Error creating project:', projectError);
          toast({
            title: 'Erro ao salvar',
            description: 'Não foi possível criar o projeto.',
            variant: 'destructive',
          });
          return;
        }

        // Create sale form
        const { error: saleFormError } = await supabase
          .from('sale_forms')
          .insert({
            project_id: newProject.id,
            ...formData,
          });

        if (saleFormError) {
          console.error('Error creating sale form:', saleFormError);
        }

        setProjectId(newProject.id);
        await refreshProjects();
        
        toast({
          title: 'Rascunho salvo',
          description: 'Suas alterações foram salvas com sucesso.',
        });
      } finally {
        setIsCreating(false);
      }
    } else {
      toast({
        title: 'Rascunho salvo',
        description: 'Suas alterações foram salvas com sucesso.',
      });
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const errors: string[] = [];
    
    if (!formData.nome_condominio) errors.push('Nome do condomínio');

    if (errors.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: `Preencha os campos: ${errors.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // If project not created yet, create it first
      if (!projectId) {
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            created_by_user_id: user!.id,
            vendedor_nome: user!.nome,
            vendedor_email: user!.email,
            cliente_condominio_nome: formData.nome_condominio,
            status: 'APROVADO_PROJETO',
            sale_status: 'CONCLUIDO',
            implantacao_status: 'A_EXECUTAR',
          })
          .select()
          .single();

        if (projectError || !newProject) {
          console.error('Error creating project:', projectError);
          toast({
            title: 'Erro ao enviar',
            description: 'Não foi possível criar o projeto.',
            variant: 'destructive',
          });
          return;
        }

        // Create sale form
        const { error: saleFormError } = await supabase
          .from('sale_forms')
          .insert({
            project_id: newProject.id,
            ...formData,
          });

        if (saleFormError) {
          console.error('Error creating sale form:', saleFormError);
        }

        // Create notification for implantacao role
        await supabase
          .from('project_notifications')
          .insert({
            project_id: newProject.id,
            type: 'SALE_COMPLETED',
            title: 'Nova Venda Informada',
            message: `O projeto "${formData.nome_condominio}" foi enviado para implantação.`,
            read: false,
            for_role: 'implantacao',
          });

        await refreshProjects();
        setIsLocked(true);
        
        toast({
          title: 'Venda informada com sucesso!',
          description: 'O projeto foi enviado para implantação.',
        });
        
        navigate('/startup-projetos');
      } else {
        // Update existing project to completed
        const success = await submitSaleForm(projectId);
        
        if (success) {
          setIsLocked(true);
          toast({
            title: 'Venda informada com sucesso!',
            description: 'O projeto foi enviado para implantação.',
          });
          navigate('/startup-projetos');
        } else {
          toast({
            title: 'Erro ao enviar',
            description: 'Não foi possível enviar o formulário. Tente novamente.',
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
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
      `- Método acionamento: ${formData.metodo_acionamento_portoes ? METODO_ACIONAMENTO_LABELS[formData.metodo_acionamento_portoes as MetodoAcionamentoPortoes] : '-'}`,
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
      `- Tipo: ${formData.alarme_tipo ? ALARME_TIPO_LABELS[formData.alarme_tipo as AlarmeTipo] : '-'}`,
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
    return {
      identificacao: !!(formData.nome_condominio && formData.filial),
      infra: !!(formData.acesso_local_central_portaria || formData.cabo_metros_qdg_ate_central),
      telefonia: !!(formData.transbordo_para_apartamentos || formData.local_central_interfonia_descricao),
      portas: !!((formData.qtd_portas_pedestre || 0) > 0 || (formData.qtd_portas_bloco || 0) > 0),
      portoes: !!((formData.qtd_portoes_deslizantes || 0) > 0 || (formData.qtd_portoes_pivotantes || 0) > 0 || (formData.qtd_portoes_basculantes || 0) > 0),
      cftvAproveitado: !!((formData.qtd_dvrs_aproveitados || 0) > 0 || (formData.qtd_cameras_aproveitadas || 0) > 0),
      cftvNovo: !!((formData.cftv_novo_qtd_total_cameras || 0) > 0),
      alarme: !!formData.alarme_tipo,
      controleAcesso: !!(formData.possui_cancela || formData.possui_catraca || formData.possui_totem),
    };
  };

  const handleCopyNOC = () => {
    const summary = generateNOCSummary();
    navigator.clipboard.writeText(summary);
    toast({
      title: 'Copiado!',
      description: 'Resumo técnico copiado para a área de transferência.',
    });
  };

  const handleDownloadNOC = () => {
    const summary = generateNOCSummary();
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumo-noc-${formData.nome_condominio || 'projeto'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSection = () => {
    const section = SECTIONS[currentSection];
    
    switch (section.id) {
      case 'identificacao':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nome_condominio">Nome do Condomínio *</Label>
                <Input
                  id="nome_condominio"
                  value={formData.nome_condominio || ''}
                  onChange={(e) => updateField('nome_condominio', e.target.value)}
                  disabled={isLocked}
                  placeholder="Digite o nome do condomínio"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filial">Filial *</Label>
                <Select
                  value={formData.filial || ''}
                  onValueChange={(value) => updateField('filial', value)}
                  disabled={isLocked}
                >
                  <SelectTrigger id="filial">
                    <SelectValue placeholder="Selecione a filial" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BHZ">BHZ</SelectItem>
                    <SelectItem value="RIO">RIO</SelectItem>
                    <SelectItem value="VIX">VIX</SelectItem>
                    <SelectItem value="SP">SP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="qtd_apartamentos">Quantidade de Apartamentos *</Label>
                <Input
                  id="qtd_apartamentos"
                  type="number"
                  value={formData.qtd_apartamentos || ''}
                  onChange={(e) => updateField('qtd_apartamentos', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd_blocos">Quantidade de Blocos *</Label>
                <Input
                  id="qtd_blocos"
                  type="number"
                  value={formData.qtd_blocos || ''}
                  onChange={(e) => updateField('qtd_blocos', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Vendedor</Label>
                {canEditVendedor ? (
                  <Select
                    value={vendedores.find(v => v.nome === formData.vendedor_nome)?.id || ''}
                    onValueChange={(vendedorId) => {
                      const vendedor = vendedores.find(v => v.id === vendedorId);
                      if (vendedor) {
                        updateField('vendedor_nome', vendedor.nome);
                        updateField('vendedor_email', vendedor.email);
                      }
                    }}
                    disabled={isLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor">
                        {formData.vendedor_nome || 'Selecione o vendedor'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={formData.vendedor_nome || ''} disabled className="bg-muted" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Email do Vendedor</Label>
                {canEditVendedor ? (
                  <Input
                    value={formData.vendedor_email || ''}
                    onChange={(e) => updateField('vendedor_email', e.target.value)}
                    disabled={isLocked}
                    placeholder="Email do vendedor"
                  />
                ) : (
                  <Input value={formData.vendedor_email || ''} disabled className="bg-muted" />
                )}
              </div>
            </div>

            <SectionFileUpload projectId={projectId} secao="identificacao" disabled={isLocked} />
          </div>
        );

      case 'infra':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="acesso_local_central_portaria">Acesso ao Local / Central da Portaria</Label>
              <Textarea
                id="acesso_local_central_portaria"
                value={formData.acesso_local_central_portaria || ''}
                onChange={(e) => updateField('acesso_local_central_portaria', e.target.value)}
                disabled={isLocked}
                placeholder="Descreva o acesso ao local e localização da central..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cabo_metros_qdg_ate_central">Metragem Cabo QDG até Central (metros)</Label>
                <Input
                  id="cabo_metros_qdg_ate_central"
                  type="number"
                  value={formData.cabo_metros_qdg_ate_central || ''}
                  onChange={(e) => updateField('cabo_metros_qdg_ate_central', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="internet_exclusiva">Internet Exclusiva</Label>
                <Select
                  value={formData.internet_exclusiva || ''}
                  onValueChange={(value) => updateField('internet_exclusiva', value)}
                  disabled={isLocked}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">Sim</SelectItem>
                    <SelectItem value="NAO">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs_central_portaria_qdg">Observações Central/Portaria/QDG</Label>
              <Textarea
                id="obs_central_portaria_qdg"
                value={formData.obs_central_portaria_qdg || ''}
                onChange={(e) => updateField('obs_central_portaria_qdg', e.target.value)}
                disabled={isLocked}
                placeholder="Observações adicionais..."
              />
            </div>

            <SectionFileUpload projectId={projectId} secao="infra" disabled={isLocked} />
          </div>
        );

      case 'telefonia':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="transbordo_para_apartamentos">Transbordo para Apartamentos</Label>
              <Select
                value={formData.transbordo_para_apartamentos || ''}
                onValueChange={(value) => updateField('transbordo_para_apartamentos', value)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SIM">Sim</SelectItem>
                  <SelectItem value="NAO">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="local_central_interfonia_descricao">Local da Central de Interfonia</Label>
              <Textarea
                id="local_central_interfonia_descricao"
                value={formData.local_central_interfonia_descricao || ''}
                onChange={(e) => updateField('local_central_interfonia_descricao', e.target.value)}
                disabled={isLocked}
                placeholder="Descreva o local da central de interfonia..."
              />
            </div>

            <SectionFileUpload projectId={projectId} secao="telefonia" disabled={isLocked} />
          </div>
        );
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="qtd_portas_pedestre">Qtd. Portas Pedestre</Label>
                <Input
                  id="qtd_portas_pedestre"
                  type="number"
                  value={formData.qtd_portas_pedestre || ''}
                  onChange={(e) => updateField('qtd_portas_pedestre', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd_portas_bloco">Qtd. Portas de Bloco</Label>
                <Input
                  id="qtd_portas_bloco"
                  type="number"
                  value={formData.qtd_portas_bloco || ''}
                  onChange={(e) => updateField('qtd_portas_bloco', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd_saida_autenticada">Qtd. Saída Autenticada</Label>
                <Input
                  id="qtd_saida_autenticada"
                  type="number"
                  value={formData.qtd_saida_autenticada || ''}
                  onChange={(e) => updateField('qtd_saida_autenticada', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs_portas">Observações sobre Portas</Label>
              <Textarea
                id="obs_portas"
                value={formData.obs_portas || ''}
                onChange={(e) => updateField('obs_portas', e.target.value)}
                disabled={isLocked}
                placeholder="Observações adicionais sobre portas..."
              />
            </div>

            <SectionFileUpload projectId={projectId} secao="portas" disabled={isLocked} />
          </div>
        );

      case 'portoes':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="qtd_portoes_deslizantes">Qtd. Portões Deslizantes</Label>
                <Input
                  id="qtd_portoes_deslizantes"
                  type="number"
                  value={formData.qtd_portoes_deslizantes || ''}
                  onChange={(e) => updateField('qtd_portoes_deslizantes', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd_portoes_pivotantes">Qtd. Portões Pivotantes</Label>
                <Input
                  id="qtd_portoes_pivotantes"
                  type="number"
                  value={formData.qtd_portoes_pivotantes || ''}
                  onChange={(e) => updateField('qtd_portoes_pivotantes', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd_portoes_basculantes">Qtd. Portões Basculantes</Label>
                <Input
                  id="qtd_portoes_basculantes"
                  type="number"
                  value={formData.qtd_portoes_basculantes || ''}
                  onChange={(e) => updateField('qtd_portoes_basculantes', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metodo_acionamento_portoes">Método de Acionamento</Label>
              <Select
                value={formData.metodo_acionamento_portoes || ''}
                onValueChange={(value) => updateField('metodo_acionamento_portoes', value as MetodoAcionamentoPortoes)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METODO_ACIONAMENTO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SectionFileUpload projectId={projectId} secao="portoes" disabled={isLocked} />
          </div>
        );

      case 'cftv-aproveitado':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="qtd_dvrs_aproveitados">Qtd. DVRs Aproveitados</Label>
                <Input
                  id="qtd_dvrs_aproveitados"
                  type="number"
                  value={formData.qtd_dvrs_aproveitados || ''}
                  onChange={(e) => updateField('qtd_dvrs_aproveitados', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="marca_modelo_dvr_aproveitado">Marca/Modelo DVR Aproveitado</Label>
                <Input
                  id="marca_modelo_dvr_aproveitado"
                  value={formData.marca_modelo_dvr_aproveitado || ''}
                  onChange={(e) => updateField('marca_modelo_dvr_aproveitado', e.target.value)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="qtd_cameras_aproveitadas">Qtd. Câmeras Aproveitadas</Label>
                <Input
                  id="qtd_cameras_aproveitadas"
                  type="number"
                  value={formData.qtd_cameras_aproveitadas || ''}
                  onChange={(e) => updateField('qtd_cameras_aproveitadas', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd_cameras_elevador">Qtd. Câmeras Elevador</Label>
                <Input
                  id="qtd_cameras_elevador"
                  type="number"
                  value={formData.qtd_cameras_elevador || ''}
                  onChange={(e) => updateField('qtd_cameras_elevador', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="acessos_tem_camera_int_ext"
                checked={formData.acessos_tem_camera_int_ext || false}
                onCheckedChange={(checked) => updateField('acessos_tem_camera_int_ext', checked)}
                disabled={isLocked}
              />
              <Label htmlFor="acessos_tem_camera_int_ext">Acessos têm câmera interna/externa</Label>
            </div>

            <SectionFileUpload projectId={projectId} secao="cftv-aproveitado" disabled={isLocked} />
          </div>
        );

      case 'cftv-novo':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cftv_novo_qtd_dvr_4ch">Qtd. DVR 4 Canais</Label>
                <Input
                  id="cftv_novo_qtd_dvr_4ch"
                  type="number"
                  value={formData.cftv_novo_qtd_dvr_4ch || ''}
                  onChange={(e) => updateField('cftv_novo_qtd_dvr_4ch', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cftv_novo_qtd_dvr_8ch">Qtd. DVR 8 Canais</Label>
                <Input
                  id="cftv_novo_qtd_dvr_8ch"
                  type="number"
                  value={formData.cftv_novo_qtd_dvr_8ch || ''}
                  onChange={(e) => updateField('cftv_novo_qtd_dvr_8ch', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cftv_novo_qtd_dvr_16ch">Qtd. DVR 16 Canais</Label>
                <Input
                  id="cftv_novo_qtd_dvr_16ch"
                  type="number"
                  value={formData.cftv_novo_qtd_dvr_16ch || ''}
                  onChange={(e) => updateField('cftv_novo_qtd_dvr_16ch', parseInt(e.target.value) || undefined)}
                  disabled={isLocked}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cftv_novo_qtd_total_cameras">Total de Câmeras Novas</Label>
              <Input
                id="cftv_novo_qtd_total_cameras"
                type="number"
                value={formData.cftv_novo_qtd_total_cameras || ''}
                onChange={(e) => updateField('cftv_novo_qtd_total_cameras', parseInt(e.target.value) || undefined)}
                disabled={isLocked}
              />
            </div>

            <SectionFileUpload projectId={projectId} secao="cftv-novo" disabled={isLocked} />
          </div>
        );

      case 'alarme':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="alarme_tipo">Tipo de Alarme</Label>
              <Select
                value={formData.alarme_tipo || ''}
                onValueChange={(value) => updateField('alarme_tipo', value as AlarmeTipo)}
                disabled={isLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ALARME_TIPO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.alarme_tipo === 'IVA' && (
              <div className="space-y-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Configuração IVA</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="iva_central_alarme_tipo">Tipo Central Alarme</Label>
                    <Input
                      id="iva_central_alarme_tipo"
                      value={formData.iva_central_alarme_tipo || ''}
                      onChange={(e) => updateField('iva_central_alarme_tipo', e.target.value as CentralAlarmeTipo)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iva_qtd_pares_existentes">Qtd. Pares Existentes</Label>
                    <Input
                      id="iva_qtd_pares_existentes"
                      type="number"
                      value={formData.iva_qtd_pares_existentes || ''}
                      onChange={(e) => updateField('iva_qtd_pares_existentes', parseInt(e.target.value) || undefined)}
                      disabled={isLocked}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="iva_qtd_novos">Qtd. IVAs Novos</Label>
                    <Input
                      id="iva_qtd_novos"
                      type="number"
                      value={formData.iva_qtd_novos || ''}
                      onChange={(e) => updateField('iva_qtd_novos', parseInt(e.target.value) || undefined)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iva_qtd_cabo_blindado">Cabo Blindado</Label>
                    <Input
                      id="iva_qtd_cabo_blindado"
                      value={formData.iva_qtd_cabo_blindado || ''}
                      onChange={(e) => updateField('iva_qtd_cabo_blindado', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.alarme_tipo === 'CERCA_ELETRICA' && (
              <div className="space-y-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium">Configuração Cerca Elétrica</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="cerca_central_alarme_tipo">Tipo Central Alarme</Label>
                    <Input
                      id="cerca_central_alarme_tipo"
                      value={formData.cerca_central_alarme_tipo || ''}
                      onChange={(e) => updateField('cerca_central_alarme_tipo', e.target.value as CentralAlarmeTipo)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cerca_local_central_choque">Local Central de Choque</Label>
                    <Input
                      id="cerca_local_central_choque"
                      value={formData.cerca_local_central_choque || ''}
                      onChange={(e) => updateField('cerca_local_central_choque', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="cerca_metragem_linear_total">Metragem Linear Total (m)</Label>
                    <Input
                      id="cerca_metragem_linear_total"
                      type="number"
                      value={formData.cerca_metragem_linear_total || ''}
                      onChange={(e) => updateField('cerca_metragem_linear_total', parseInt(e.target.value) || undefined)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cerca_qtd_cabo_centenax">Qtd. Cabo Centenax</Label>
                    <Input
                      id="cerca_qtd_cabo_centenax"
                      type="number"
                      value={formData.cerca_qtd_cabo_centenax || ''}
                      onChange={(e) => updateField('cerca_qtd_cabo_centenax', parseInt(e.target.value) || undefined)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cerca_qtd_fios">Qtd. de Fios</Label>
                    <Input
                      id="cerca_qtd_fios"
                      type="number"
                      value={formData.cerca_qtd_fios || ''}
                      onChange={(e) => updateField('cerca_qtd_fios', parseInt(e.target.value) || undefined)}
                      disabled={isLocked}
                    />
                  </div>
                </div>
              </div>
            )}

            <SectionFileUpload projectId={projectId} secao="alarme" disabled={isLocked} />
          </div>
        );

      case 'controle-acesso':
        return (
          <div className="space-y-6">
            {/* Cancela */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Switch
                    id="possui_cancela"
                    checked={formData.possui_cancela || false}
                    onCheckedChange={(checked) => updateField('possui_cancela', checked)}
                    disabled={isLocked}
                  />
                  <CardTitle className="text-lg">Cancela</CardTitle>
                </div>
              </CardHeader>
              {formData.possui_cancela && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Qtd. Sentido Único</Label>
                      <Input
                        type="number"
                        value={formData.cancela_qtd_sentido_unico || ''}
                        onChange={(e) => updateField('cancela_qtd_sentido_unico', parseInt(e.target.value) || undefined)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qtd. Duplo Sentido</Label>
                      <Input
                        type="number"
                        value={formData.cancela_qtd_duplo_sentido || ''}
                        onChange={(e) => updateField('cancela_qtd_duplo_sentido', parseInt(e.target.value) || undefined)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Detalhes Aproveitamento</Label>
                    <Textarea
                      value={formData.cancela_aproveitada_detalhes || ''}
                      onChange={(e) => updateField('cancela_aproveitada_detalhes', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Autenticação</Label>
                    <Input
                      value={formData.cancela_autenticacao || ''}
                      onChange={(e) => updateField('cancela_autenticacao', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Catraca */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Switch
                    id="possui_catraca"
                    checked={formData.possui_catraca || false}
                    onCheckedChange={(checked) => updateField('possui_catraca', checked)}
                    disabled={isLocked}
                  />
                  <CardTitle className="text-lg">Catraca</CardTitle>
                </div>
              </CardHeader>
              {formData.possui_catraca && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Qtd. Sentido Único</Label>
                      <Input
                        type="number"
                        value={formData.catraca_qtd_sentido_unico || ''}
                        onChange={(e) => updateField('catraca_qtd_sentido_unico', parseInt(e.target.value) || undefined)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qtd. Duplo Sentido</Label>
                      <Input
                        type="number"
                        value={formData.catraca_qtd_duplo_sentido || ''}
                        onChange={(e) => updateField('catraca_qtd_duplo_sentido', parseInt(e.target.value) || undefined)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Detalhes Aproveitamento</Label>
                    <Textarea
                      value={formData.catraca_aproveitada_detalhes || ''}
                      onChange={(e) => updateField('catraca_aproveitada_detalhes', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Autenticação</Label>
                    <Input
                      value={formData.catraca_autenticacao || ''}
                      onChange={(e) => updateField('catraca_autenticacao', e.target.value)}
                      disabled={isLocked}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Totem */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Switch
                    id="possui_totem"
                    checked={formData.possui_totem || false}
                    onCheckedChange={(checked) => updateField('possui_totem', checked)}
                    disabled={isLocked}
                  />
                  <CardTitle className="text-lg">Totem</CardTitle>
                </div>
              </CardHeader>
              {formData.possui_totem && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Qtd. Totem Simples</Label>
                      <Input
                        type="number"
                        value={formData.totem_qtd_simples || ''}
                        onChange={(e) => updateField('totem_qtd_simples', parseInt(e.target.value) || undefined)}
                        disabled={isLocked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qtd. Totem Duplo</Label>
                      <Input
                        type="number"
                        value={formData.totem_qtd_duplo || ''}
                        onChange={(e) => updateField('totem_qtd_duplo', parseInt(e.target.value) || undefined)}
                        disabled={isLocked}
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            <SectionFileUpload projectId={projectId} secao="controle-acesso" disabled={isLocked} />
          </div>
        );

      case 'cameras-novas':
        return (
          <div className="space-y-6">
            <Alert>
              <Camera className="h-4 w-4" />
              <AlertDescription>
                Nesta seção você pode adicionar observações sobre câmeras novas a serem instaladas.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="obs_gerais">Observações Gerais</Label>
              <Textarea
                id="obs_gerais"
                value={formData.obs_gerais || ''}
                onChange={(e) => updateField('obs_gerais', e.target.value)}
                disabled={isLocked}
                placeholder="Observações gerais sobre o projeto..."
                className="min-h-[200px]"
              />
            </div>

            <SectionFileUpload projectId={projectId} secao="cameras-novas" disabled={isLocked} />
          </div>
        );

      case 'revisao':
        const checklist = generateChecklist();
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Checklist de Preenchimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'identificacao', label: 'Identificação' },
                    { key: 'infra', label: 'Infraestrutura' },
                    { key: 'telefonia', label: 'Telefonia/Interfonia' },
                    { key: 'portas', label: 'Portas' },
                    { key: 'portoes', label: 'Portões' },
                    { key: 'cftvAproveitado', label: 'CFTV Aproveitado' },
                    { key: 'cftvNovo', label: 'CFTV Novo' },
                    { key: 'alarme', label: 'Alarme' },
                    { key: 'controleAcesso', label: 'Controle de Acesso' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded',
                        checklist[item.key as keyof typeof checklist]
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      )}
                    >
                      {checklist[item.key as keyof typeof checklist] ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Resumo Técnico (NOC)</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyNOC}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadNOC}>
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                  {generateNOCSummary()}
                </pre>
              </CardContent>
            </Card>

            {isLocked && (
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Este formulário foi enviado e está bloqueado para edição.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const progress = ((currentSection + 1) / SECTIONS.length) * 100;

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Plus className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Informar Nova Venda</h1>
          </div>
          <p className="text-muted-foreground">
            Seção {currentSection + 1} de {SECTIONS.length}
          </p>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="mb-6 h-2" />

        {/* Section Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {SECTIONS.map((section, index) => {
            const Icon = section.icon;
            return (
              <Button
                key={section.id}
                variant={index === currentSection ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentSection(index)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap',
                  index < currentSection && 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </Button>
            );
          })}
        </div>

        {/* Section Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const Icon = SECTIONS[currentSection].icon;
                return <Icon className="h-5 w-5" />;
              })()}
              {SECTIONS[currentSection].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderSection()}
          </CardContent>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentSection(prev => Math.max(0, prev - 1))}
            disabled={currentSection === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {!isLocked && (
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isCreating}
              >
                <Save className="h-4 w-4 mr-2" />
                {isCreating ? 'Salvando...' : 'Salvar Rascunho'}
              </Button>
            )}

            {currentSection === SECTIONS.length - 1 ? (
              !isLocked && (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Enviando...' : 'Enviar para Implantação'}
                </Button>
              )
            ) : (
              <Button
                onClick={() => setCurrentSection(prev => Math.min(SECTIONS.length - 1, prev + 1))}
              >
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
