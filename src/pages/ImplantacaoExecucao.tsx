import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SaleFormSummary } from '@/components/SaleFormSummary';
import { useImplantacaoIntegration } from '@/hooks/useImplantacaoIntegration';
import { AIFeedbackDialog } from '@/components/AIFeedbackDialog';
import { SaleCompletedForm, PORTARIA_VIRTUAL_LABELS, CFTV_ELEVADOR_LABELS, MODALIDADE_PORTARIA_LABELS, PortariaVirtualApp, CFTVElevador, ModalidadePortaria } from '@/types/project';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { SectionFileUpload } from '@/components/SectionFileUpload';
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Phone,
  Users,
  Smartphone,
  Tag,
  ClipboardCheck,
  Calendar,
  
  Settings,
  DollarSign,
  Handshake,
  HeadphonesIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileDown,
  Plus,
  Building,
  Pencil,
  Star,
  Paperclip,
  ExternalLink,
  BookOpen,
  Package,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import jsPDF from 'jspdf';
import { EquipmentListDialog } from '@/components/EquipmentListDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImplantacaoEtapas {
  id: string;
  project_id: string;
  contrato_assinado: boolean;
  contrato_assinado_at: string | null;
  contrato_cadastrado: boolean;
  contrato_cadastrado_at: string | null;
  ligacao_boas_vindas: boolean;
  ligacao_boas_vindas_at: string | null;
  cadastro_gear: boolean;
  cadastro_gear_at: string | null;
  sindico_app: boolean;
  sindico_app_at: string | null;
  conferencia_tags: boolean;
  conferencia_tags_at: string | null;
  check_projeto: boolean;
  check_projeto_at: string | null;
  agendamento_visita_startup: boolean;
  agendamento_visita_startup_at: string | null;
  agendamento_visita_startup_data: string | null;
  laudo_visita_startup: boolean;
  laudo_visita_startup_at: string | null;
  laudo_instalador: boolean;
  laudo_instalador_at: string | null;
  laudo_vidraceiro: boolean;
  laudo_vidraceiro_at: string | null;
  laudo_serralheiro: boolean;
  laudo_serralheiro_at: string | null;
  laudo_conclusao_supervisor: boolean;
  laudo_conclusao_supervisor_at: string | null;
  check_programacao: boolean;
  check_programacao_at: string | null;
  confirmacao_ativacao_financeira: boolean;
  confirmacao_ativacao_financeira_at: string | null;
  agendamento_visita_comercial: boolean;
  agendamento_visita_comercial_at: string | null;
  agendamento_visita_comercial_data: string | null;
  laudo_visita_comercial: boolean;
  laudo_visita_comercial_at: string | null;
  laudo_visita_comercial_texto: string | null;
  operacao_assistida_inicio: string | null;
  operacao_assistida_fim: string | null;
  operacao_assistida_interacoes: InteracaoAssistida[];
  concluido: boolean;
  concluido_at: string | null;
  observacoes_manutencao: string | null;
  data_ativacao_realizada: string | null;
  etapa_atual: number;
  // Step 4.5: Pagamento de Instalação
  ppe_agendamento_base_data: string | null;
  ppe_execucao_base_data: string | null;
  ppe_equipe_prestador_id: string | null;
  ppe_observacao_onboarding: string | null;
  ppe_observacao_instalacao: string | null;
  ppe_boas_vindas: boolean;
  ppe_boas_vindas_at: string | null;
  ppe_validar_material: boolean;
  ppe_validar_material_at: string | null;
  ppe_totem_360_qtd: number;
  ppe_totem_parede_qtd: number;
  ppe_totem_mini_qtd: number;
  pagamento_instalacao_pontuacao: number | null;
  pagamento_instalacao_infra: number | null;
  pagamento_instalacao_deslocamento: number | null;
  pagamento_instalacao_pedagio: number | null;
  pagamento_instalacao_diaria: number | null;
  pagamento_instalacao_sapata: number | null;
  pagamento_instalacao_totem: number | null;
  pagamento_instalacao_pontuacao_auferido: number | null;
  pagamento_instalacao_infra_auferido: number | null;
  pagamento_instalacao_deslocamento_auferido: number | null;
  pagamento_instalacao_pedagio_auferido: number | null;
  pagamento_instalacao_diaria_auferido: number | null;
  pagamento_instalacao_sapata_auferido: number | null;
  pagamento_instalacao_totem_auferido: number | null;
  pagamento_instalacao_divergencia_justificativa: string | null;
  pagamento_instalacao_conferido: boolean;
  pagamento_instalacao_conferido_at: string | null;
  // Step 10: Satisfaction Survey
  pesquisa_satisfacao_realizada: boolean;
  pesquisa_satisfacao_realizada_at: string | null;
  pesquisa_satisfacao_nota: number | null;
  pesquisa_satisfacao_comentario: string | null;
  pesquisa_satisfacao_pontos_positivos: string | null;
  pesquisa_satisfacao_pontos_negativos: string | null;
  pesquisa_satisfacao_recomendaria: boolean | null;
}

interface InteracaoAssistida {
  id: string;
  data: string;
  descricao: string;
  usuario: string;
}

interface Project {
  id: string;
  numero_projeto: number;
  cliente_condominio_nome: string;
  cliente_cidade: string | null;
  cliente_estado: string | null;
  vendedor_nome: string;
  created_at: string;
  prazo_entrega_projeto: string | null;
  implantacao_started_at: string | null;
  engineering_status: string | null;
  endereco_condominio: string | null;
  tipo_implantacao: string | null;
}

interface ContratoInfo {
  contrato: string;
  alarme_codigo: string;
  mensalidade: string;
  prazo_contrato: string;
  taxa_instalacao: string;
  filial: string;
}

export default function ImplantacaoExecucao() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createPreventivaOnActivation } = useImplantacaoIntegration();

  const [project, setProject] = useState<Project | null>(null);
  const [etapas, setEtapas] = useState<ImplantacaoEtapas | null>(null);
  const [tapForm, setTapForm] = useState<Record<string, unknown> | null>(null);
  const [saleForm, setSaleForm] = useState<SaleCompletedForm | null>(null);
  const [projectComments, setProjectComments] = useState<Array<{ user_name: string; content: string; created_at: string; is_internal: boolean }>>([]);
  const [projectAttachments, setProjectAttachments] = useState<Array<{ nome_arquivo: string; tipo: string; arquivo_url?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEtapas, setExpandedEtapas] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const [novaInteracao, setNovaInteracao] = useState('');
  const [editingDates, setEditingDates] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [selectedNota, setSelectedNota] = useState<number | null>(null);
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo>({ contrato: '', alarme_codigo: '', mensalidade: '', prazo_contrato: '', taxa_instalacao: '', filial: '' });
  const [editingContrato, setEditingContrato] = useState(false);
  const [showAIFeedbackDialog, setShowAIFeedbackDialog] = useState(false);
  const [showEquipmentList, setShowEquipmentList] = useState(false);
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const [checklistsExistentes, setChecklistsExistentes] = useState<string[]>([]);
  const [secoesComAnexo, setSecoesComAnexo] = useState<string[]>([]);
  const [editingOpAssistidaDates, setEditingOpAssistidaDates] = useState(false);
  const [tempOpAssistidaStart, setTempOpAssistidaStart] = useState('');
  const [tempOpAssistidaEnd, setTempOpAssistidaEnd] = useState('');
  const [pendenciaDeptTexto, setPendenciaDeptTexto] = useState('');
  const [pendenciaClienteTexto, setPendenciaClienteTexto] = useState('');
  const [pendenciaDeptEntregaTexto, setPendenciaDeptEntregaTexto] = useState('');
  const [pendenciaClienteEntregaTexto, setPendenciaClienteEntregaTexto] = useState('');
  const [prestadoresList, setPrestadoresList] = useState<Array<{ id: string; nome: string; empresa: string[] | null }>>([]);
  const [localObsOnboardingPPE, setLocalObsOnboardingPPE] = useState('');
  const [localObsInstalacaoPPE, setLocalObsInstalacaoPPE] = useState('');
  const [criandoPendencia, setCriandoPendencia] = useState(false);
  const [enderecoInstalacao, setEnderecoInstalacao] = useState('');
  const [editingEndereco, setEditingEndereco] = useState(false);
  const [usarEnderecoOrigem, setUsarEnderecoOrigem] = useState(false);
  const [pendenciaDeptVisitaTexto, setPendenciaDeptVisitaTexto] = useState('');
  const [pendenciaClienteVisitaTexto, setPendenciaClienteVisitaTexto] = useState('');
  
  // NOC Integration state
  const [nocChamado, setNocChamado] = useState<{
    id?: string;
    chamado_id?: string;
    chamado_numero?: string;
    chamado_url?: string;
    integration_status: string;
    integration_message?: string;
    opened_at?: string;
    opened_by_name?: string;
    item_6_1_status: string;
    item_6_2_status: string;
    item_6_3_status: string;
  } | null>(null);
  const [nocLoading, setNocLoading] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [checklistDialogData, setChecklistDialogData] = useState<{ items: { id: string; label: string; checked: boolean; observacao?: string }[]; observacoes?: string } | null>(null);
  const [checklistDialogLoading, setChecklistDialogLoading] = useState(false);
  const [localLaudoTexto, setLocalLaudoTexto] = useState('');
  const [localObsManutencao, setLocalObsManutencao] = useState('');

  const canEditDates = user?.role === 'admin' || user?.role === 'administrativo' || user?.role === 'implantacao';

  const openChecklistDialog = async (checklistType: string) => {
    setChecklistDialogLoading(true);
    setChecklistDialogOpen(true);
    try {
      const { data } = await supabase
        .from('implantacao_checklists')
        .select('dados, observacoes')
        .eq('project_id', id!)
        .eq('tipo', checklistType)
        .maybeSingle();
      if (data) {
        const dados = data.dados as any;
        setChecklistDialogData({ items: dados?.items || [], observacoes: data.observacoes || '' });
      } else {
        setChecklistDialogData(null);
      }
    } catch {
      setChecklistDialogData(null);
    } finally {
      setChecklistDialogLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado, vendedor_nome, created_at, prazo_entrega_projeto, implantacao_started_at, engineering_status, endereco_condominio, tipo_implantacao')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch or create etapas
      let { data: etapasData, error: etapasError } = await supabase
        .from('implantacao_etapas')
        .select('*')
        .eq('project_id', id)
        .single();

      if (etapasError && etapasError.code === 'PGRST116') {
        // Record doesn't exist, create it
        const { data: newEtapas, error: insertError } = await supabase
          .from('implantacao_etapas')
          .insert({ project_id: id })
          .select()
          .single();

        if (insertError) throw insertError;
        etapasData = newEtapas;
      } else if (etapasError) {
        throw etapasError;
      }

      // Parse the interacoes JSON
      const interacoes = etapasData?.operacao_assistida_interacoes;
      const parsedInteracoes: InteracaoAssistida[] = Array.isArray(interacoes) 
        ? interacoes.map((i: unknown) => i as InteracaoAssistida)
        : [];

      const etapasObj = {
        ...etapasData,
        operacao_assistida_interacoes: parsedInteracoes
      } as ImplantacaoEtapas;
      setEtapas(etapasObj);
      setLocalLaudoTexto(etapasObj.laudo_visita_comercial_texto || '');
      setLocalObsManutencao(etapasObj.observacoes_manutencao || '');
      setLocalObsOnboardingPPE(etapasObj.ppe_observacao_onboarding || '');
      setLocalObsInstalacaoPPE(etapasObj.ppe_observacao_instalacao || '');

      // Load prestadores for PPE installation team selection
      const { data: prestData } = await supabase
        .from('prestadores')
        .select('id, nome, empresa')
        .eq('ativo', true)
        .order('nome');
      setPrestadoresList(prestData || []);

      // Fetch customer_portfolio data for contract info
      const { data: portfolioData } = await supabase
        .from('customer_portfolio')
        .select('contrato, alarme_codigo, mensalidade, taxa_ativacao, data_termino, endereco, filial')
        .eq('project_id', id)
        .maybeSingle();

      if (portfolioData) {
        // Calculate prazo from data_ativacao/data_termino or leave empty
        let prazoValue = '';
        if (portfolioData.data_termino) {
          // Try to infer prazo from data_termino
          const termino = new Date(portfolioData.data_termino);
          const now = new Date();
          const monthsDiff = Math.round((termino.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
          if (monthsDiff >= 54) prazoValue = '60';
          else if (monthsDiff >= 42) prazoValue = '48';
          else if (monthsDiff >= 30) prazoValue = '36';
          else if (monthsDiff >= 18) prazoValue = '24';
          else prazoValue = '12';
        }
        setContratoInfo({
          contrato: portfolioData.contrato || '',
          alarme_codigo: portfolioData.alarme_codigo || '',
          mensalidade: portfolioData.mensalidade ? String(portfolioData.mensalidade) : '',
          prazo_contrato: prazoValue,
          taxa_instalacao: portfolioData.taxa_ativacao ? String(portfolioData.taxa_ativacao) : '',
          filial: portfolioData.filial || '',
        });
        if (portfolioData.endereco) {
          setEnderecoInstalacao(portfolioData.endereco);
        }
      }

      // Fetch TAP form
      const { data: tapData } = await supabase
        .from('tap_forms')
        .select('*')
        .eq('project_id', id)
        .maybeSingle();
      
      if (tapData) setTapForm(tapData);

      // Fetch Sale form
      const { data: saleData } = await supabase
        .from('sale_forms')
        .select('*')
        .eq('project_id', id)
        .maybeSingle();
      
      if (saleData) setSaleForm(saleData as unknown as SaleCompletedForm);

      // Fetch comments and attachments for AI summary
      const { data: commentsData } = await supabase
        .from('project_comments')
        .select('user_name, texto, created_at, is_internal')
        .eq('project_id', id)
        .order('created_at', { ascending: true });

      if (commentsData) {
        setProjectComments(commentsData.map(c => ({
          user_name: c.user_name,
          content: c.texto,
          created_at: c.created_at,
          is_internal: c.is_internal,
        })));
      }

      const { data: attachmentsData } = await supabase
        .from('project_attachments')
        .select('nome_arquivo, tipo, arquivo_url')
        .eq('project_id', id);

      if (attachmentsData) {
        setProjectAttachments(attachmentsData);
      }

      // Check for pending items (to block conclusion)
      const { data: customerData } = await supabase
        .from('customer_portfolio')
        .select('id')
        .eq('project_id', id!)
        .maybeSingle();
      
      if (customerData) {
        const { count: pendingCount } = await supabase
          .from('manutencao_pendencias')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerData.id)
          .eq('status', 'ABERTO');
        
        setHasPendingItems((pendingCount || 0) > 0);
      }

      // Fetch existing checklists for this project
      const { data: checklistsData } = await supabase
        .from('implantacao_checklists')
        .select('tipo')
        .eq('project_id', id!);
      
      if (checklistsData) {
        setChecklistsExistentes(checklistsData.map(c => c.tipo));
      }

      // Fetch sections that have attachments (for mandatory upload validation)
      const { data: secAttachments } = await supabase
        .from('sale_form_attachments')
        .select('secao')
        .eq('project_id', id!);
      
      if (secAttachments) {
        setSecoesComAnexo([...new Set(secAttachments.map(a => a.secao))]);
      }

      // Fetch NOC chamado
      const { data: nocData } = await supabase
        .from('implantacao_noc_chamados')
        .select('*')
        .eq('project_id', id!)
        .eq('transicao_noc', 'abertura_secao_6')
        .maybeSingle();
      
      if (nocData) {
        setNocChamado(nocData as any);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do projeto.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProjectDates = async (startDate: string, endDate: string) => {
    if (!id || !canEditDates) return;

    try {
      setIsSaving(true);
      
      const updateData: Record<string, unknown> = {};
      
      if (startDate) {
        updateData.implantacao_started_at = new Date(startDate).toISOString();
      }
      if (endDate) {
        updateData.prazo_entrega_projeto = endDate;
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setProject(prev => prev ? { 
        ...prev, 
        implantacao_started_at: startDate ? new Date(startDate).toISOString() : prev.implantacao_started_at,
        prazo_entrega_projeto: endDate || prev.prazo_entrega_projeto
      } : null);
      
      setEditingDates(false);

      toast({
        title: 'Datas atualizadas',
        description: 'As datas do cronograma foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Error updating dates:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as datas.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEtapa = async (field: keyof ImplantacaoEtapas, value: unknown, dateField?: string) => {
    if (!etapas || !id) return;

    try {
      setIsSaving(true);
      
      const updateData: Record<string, unknown> = { [field]: value };
      
      // If it's a boolean field being set to true, also set the date
      if (dateField && value === true) {
        updateData[dateField] = new Date().toISOString();
      }

      const { error } = await supabase
        .from('implantacao_etapas')
        .update(updateData)
        .eq('project_id', id);

      if (error) throw error;

      setEtapas(prev => prev ? { ...prev, ...updateData } as ImplantacaoEtapas : null);

      // Auto-create preventive agenda when Etapa 6 is fully completed
      if (field === 'confirmacao_ativacao_financeira' && value === true && project) {
        const updatedEtapas = { ...etapas, ...updateData } as ImplantacaoEtapas;
        const etapa6Complete = nocChamado?.item_6_1_status === 'success' 
          && updatedEtapas.check_programacao 
          && updatedEtapas.confirmacao_ativacao_financeira;
        
        if (etapa6Complete) {
          const unidades = (saleForm as any)?.qtd_apartamentos || 0;
          const contrato = contratoInfo?.contrato || `TEMP-${project.numero_projeto}`;
          const praca = contratoInfo?.filial || null;
          
          createPreventivaOnActivation(
            id!,
            project.cliente_condominio_nome,
            contrato,
            unidades,
            praca || undefined,
          );
        }
      }

      toast({
        title: 'Salvo',
        description: 'Etapa atualizada com sucesso.',
      });
    } catch (error) {
      console.error('Error updating etapa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a etapa.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addInteracao = async () => {
    if (!novaInteracao.trim() || !etapas || !id) return;

    try {
      setIsSaving(true);

      const newInteracao: InteracaoAssistida = {
        id: crypto.randomUUID(),
        data: new Date().toISOString(),
        descricao: novaInteracao,
        usuario: user?.nome || 'Usuário',
      };

      const updatedInteracoes = [...(etapas.operacao_assistida_interacoes || []), newInteracao];

      const inicioOpAssistida = etapas.operacao_assistida_inicio || new Date().toISOString();
      const fimOpAssistida = addDays(parseISO(inicioOpAssistida), 30).toISOString();

      const { error } = await supabase
        .from('implantacao_etapas')
        .update({ 
          operacao_assistida_interacoes: JSON.parse(JSON.stringify(updatedInteracoes)),
          operacao_assistida_inicio: inicioOpAssistida,
          operacao_assistida_fim: fimOpAssistida
        })
        .eq('project_id', id);

      if (error) throw error;

      setEtapas(prev => prev ? { 
        ...prev, 
        operacao_assistida_interacoes: updatedInteracoes,
        operacao_assistida_inicio: inicioOpAssistida,
        operacao_assistida_fim: fimOpAssistida
      } : null);
      setNovaInteracao('');

      toast({
        title: 'Interação adicionada',
        description: 'Registro de interação salvo com sucesso.',
      });
    } catch (error) {
      console.error('Error adding interacao:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a interação.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = () => {
    if (!project || !etapas) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Implantação', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // Project info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Projeto #${project.numero_projeto}`, 20, yPos);
    yPos += 7;
    doc.text(`Condomínio: ${project.cliente_condominio_nome}`, 20, yPos);
    yPos += 7;
    doc.text(`Cidade: ${project.cliente_cidade || 'N/A'}, ${project.cliente_estado || 'N/A'}`, 20, yPos);
    yPos += 7;
    doc.text(`Vendedor: ${project.vendedor_nome}`, 20, yPos);
    yPos += 15;

    const formatDate = (date: string | null) => {
      if (!date) return 'Pendente';
      return format(parseISO(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    };

    // Etapas
    const etapasInfo = [
      { title: '1. Contrato Assinado', completed: etapas.contrato_assinado, date: etapas.contrato_assinado_at },
      { title: '2. Contrato Cadastrado', completed: etapas.contrato_cadastrado, date: etapas.contrato_cadastrado_at },
      { title: '3.1 Ligação de Boas Vindas', completed: etapas.ligacao_boas_vindas, date: etapas.ligacao_boas_vindas_at },
      { title: '3.2 Cadastro no Gear', completed: etapas.cadastro_gear, date: etapas.cadastro_gear_at },
      { title: '3.3 Síndico baixar APP', completed: etapas.sindico_app, date: etapas.sindico_app_at },
      { title: '3.4 Conferência de Tags', completed: etapas.conferencia_tags, date: etapas.conferencia_tags_at },
      { title: '4.1 Check de Projeto', completed: etapas.check_projeto, date: etapas.check_projeto_at },
      { title: '4.2 Agendamento Visita Implantação', completed: etapas.agendamento_visita_startup, date: etapas.agendamento_visita_startup_at },
      { title: '4.3 Laudo Visita Implantação', completed: etapas.laudo_visita_startup, date: etapas.laudo_visita_startup_at },
      { title: '5.1 Checklist Execução da Obra', completed: etapas.laudo_instalador, date: etapas.laudo_instalador_at },
      { title: '6.1 Abertura Chamado NOC', completed: nocChamado?.item_6_1_status === 'success', date: nocChamado?.opened_at || null },
      { title: '6.2 Check de Programação', completed: etapas.check_programacao, date: etapas.check_programacao_at },
      { title: '6.3 Confirmação Ativação Financeira', completed: etapas.confirmacao_ativacao_financeira, date: etapas.confirmacao_ativacao_financeira_at },
    ];

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Etapas de Implantação', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    etapasInfo.forEach(etapa => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      const status = etapa.completed ? '✓' : '○';
      doc.text(`${status} ${etapa.title}`, 20, yPos);
      doc.text(formatDate(etapa.date), 140, yPos);
      yPos += 7;
    });

    doc.save(`implantacao_${project.numero_projeto}.pdf`);

    toast({
      title: 'PDF Gerado',
      description: 'O relatório foi baixado com sucesso.',
    });
  };

  const toggleEtapa = (etapaNum: number) => {
    setExpandedEtapas(prev => 
      prev.includes(etapaNum) 
        ? prev.filter(e => e !== etapaNum)
        : [...prev, etapaNum]
    );
  };

  const getEtapaIcon = (etapaNum: number) => {
    const icons: Record<number, typeof FileText> = {
      1: FileText,
      2: FileText,
      3: Phone,
      4: ClipboardCheck,
      5: Settings,
      6: Settings,
      7: Handshake,
      8: HeadphonesIcon,
      9: CheckCircle2,
      10: Star,
    };
    return icons[etapaNum] || FileText;
  };

  const isEtapaComplete = (etapaNum: number): boolean => {
    if (!etapas) return false;
    const isPPE = project?.tipo_implantacao === 'PPE';
    
    switch (etapaNum) {
      case 1: return etapas.contrato_assinado;
      case 2: return etapas.contrato_cadastrado;
      case 3: return isPPE
        ? etapas.ligacao_boas_vindas && etapas.cadastro_gear
        : etapas.ligacao_boas_vindas && etapas.cadastro_gear && etapas.sindico_app && etapas.conferencia_tags;
      case 4: return etapas.check_projeto && etapas.agendamento_visita_startup && etapas.laudo_visita_startup;
      case 5: return isPPE ? true : etapas.laudo_instalador;
      case 6: return nocChamado?.item_6_1_status === 'success' && etapas.check_programacao && etapas.confirmacao_ativacao_financeira;
      case 7: return etapas.agendamento_visita_comercial && etapas.laudo_visita_comercial;
      case 8: return isPPE ? true : (etapas.operacao_assistida_interacoes?.length || 0) > 0;
      case 9: return isPPE ? true : etapas.concluido;
      default: return false;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  const handleAbrirChamadoNoc = async () => {
    if (!id || nocLoading) return;
    setNocLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('noc-integration', {
        body: { project_id: id },
      });
      if (error) throw error;
      if (data.status === 'duplicate' || data.status === 'success') {
        setNocChamado({
          integration_status: 'success',
          chamado_id: data.chamado_id,
          chamado_numero: data.chamado_numero,
          chamado_url: data.chamado_url,
          opened_at: data.opened_at,
          opened_by_name: data.opened_by_name,
          item_6_1_status: 'success',
          item_6_2_status: 'pending',
          item_6_3_status: nocChamado?.item_6_3_status || 'blocked',
        });
        toast({
          title: data.status === 'duplicate' ? 'Chamado já existente' : 'Chamado aberto com sucesso!',
          description: `Chamado ${data.chamado_numero || 'NOC'} ${data.status === 'duplicate' ? 'já foi aberto anteriormente' : 'criado no EIXONOC'}.`,
        });
      } else {
        setNocChamado({
          integration_status: 'error',
          integration_message: data.message,
          item_6_1_status: 'error',
          item_6_2_status: nocChamado?.item_6_2_status || 'blocked',
          item_6_3_status: nocChamado?.item_6_3_status || 'blocked',
        });
        toast({ title: 'Erro ao abrir chamado', description: data.message || 'Erro no EIXONOC.', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('NOC integration error:', err);
      setNocChamado({
        integration_status: 'error',
        integration_message: err.message,
        item_6_1_status: 'error',
        item_6_2_status: nocChamado?.item_6_2_status || 'blocked',
        item_6_3_status: nocChamado?.item_6_3_status || 'blocked',
      });
      toast({ title: 'Erro de conexão', description: 'Não foi possível conectar ao EIXONOC.', variant: 'destructive' });
    } finally {
      setNocLoading(false);
    }
  };

  const criarPendencia = async (tipo: string, descricao: string) => {
    if (!descricao.trim()) {
      toast({ title: 'Erro', description: 'Preencha a descrição da pendência.', variant: 'destructive' });
      return;
    }
    setCriandoPendencia(true);
    try {
      const { data: customer } = await supabase
        .from('customer_portfolio')
        .select('id, contrato')
        .eq('project_id', id!)
        .maybeSingle();

      const contrato = customer?.contrato || contratoInfo.contrato || `TEMP-${project!.numero_projeto}`;
      const isDept = tipo.startsWith('DEPT_');
      const slaDias = isDept ? 5 : 7;
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + slaDias);

      const { error } = await supabase
        .from('manutencao_pendencias')
        .insert({
          customer_id: customer?.id || null,
          tipo: tipo as any,
          contrato,
          razao_social: project!.cliente_condominio_nome,
          numero_os: `IMP-${project!.numero_projeto}`,
          setor: 'Instalação',
          descricao,
          sla_dias: slaDias,
          data_prazo: prazo.toISOString(),
          created_by: user?.id,
          created_by_name: user?.nome,
        });

      if (error) throw error;

      toast({ title: 'Pendência criada', description: `Pendência de ${isDept ? 'departamento' : 'cliente'} aberta com sucesso.` });
      
      if (isDept) setPendenciaDeptTexto('');
      else setPendenciaClienteTexto('');

      if (customer) {
        const { count } = await supabase
          .from('manutencao_pendencias')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customer.id)
          .eq('status', 'ABERTO');
        setHasPendingItems((count || 0) > 0);
      }
    } catch (error) {
      console.error('Error creating pendencia:', error);
      toast({ title: 'Erro', description: 'Não foi possível criar a pendência.', variant: 'destructive' });
    } finally {
      setCriandoPendencia(false);
    }
  };

  if (!project || !etapas) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Projeto não encontrado.</p>
          <Button onClick={() => navigate('/startup-projetos')} className="mt-4">
            Voltar
          </Button>
        </div>
      </Layout>
    );
  }

  const isPPE = project.tipo_implantacao === 'PPE';

  const SubItem = ({ 
    label, 
    checked, 
    field, 
    dateField,
    date,
    hasChecklist,
    checklistType,
    onChecklistClick,
  }: { 
    label: string; 
    checked: boolean; 
    field: keyof ImplantacaoEtapas;
    dateField?: string;
    date?: string | null;
    hasChecklist?: boolean;
    checklistType?: string;
    onChecklistClick?: () => void;
  }) => (
    <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md">
      <div className="flex items-center gap-3">
        <Checkbox 
          checked={checked}
          onCheckedChange={(value) => updateEtapa(field, value, dateField)}
          disabled={isSaving}
        />
        <span className={cn("text-sm", checked && "text-muted-foreground line-through")}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {date && (
          <span className="text-xs text-muted-foreground">
            {format(parseISO(date), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        )}
        {hasChecklist && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onChecklistClick ? onChecklistClick() : navigate(`/startup-projetos/${id}/checklist/${checklistType}`)}
          >
            <ClipboardCheck className="w-4 h-4 mr-1" />
            Checklist
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/startup-projetos')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building className="w-6 h-6 text-primary" />
                <span className="text-sm text-muted-foreground">Projeto #{project.numero_projeto}</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{project.cliente_condominio_nome}</h1>
              <p className="text-muted-foreground">
                {project.cliente_cidade}, {project.cliente_estado} • Vendedor: {project.vendedor_nome}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projetos/${id}/formulario-venda`)}
              >
                <FileText className="w-4 h-4 mr-1" />
                Formulário
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projetos/${id}`)}
              >
                <Paperclip className="w-4 h-4 mr-1" />
                Anexos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEquipmentList(true)}
              >
                <Package className="w-4 h-4 mr-1" />
                Equipamentos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projetos/${id}`)}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Detalhes do Projeto
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline Chart */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Cronograma do Projeto
              </h3>
              {canEditDates && !editingDates && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const startDate = project.implantacao_started_at 
                      ? format(parseISO(project.implantacao_started_at), 'yyyy-MM-dd')
                      : (etapas.contrato_assinado_at ? format(parseISO(etapas.contrato_assinado_at), 'yyyy-MM-dd') : format(new Date(project.created_at), 'yyyy-MM-dd'));
                    const endDate = project.prazo_entrega_projeto 
                      ? project.prazo_entrega_projeto
                      : format(addDays(parseISO(startDate), 90), 'yyyy-MM-dd');
                    setTempStartDate(startDate);
                    setTempEndDate(endDate);
                    setEditingDates(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {(() => {
              const startDate = project.implantacao_started_at 
                ? parseISO(project.implantacao_started_at) 
                : (etapas.contrato_assinado_at ? parseISO(etapas.contrato_assinado_at) : new Date(project.created_at));
              const endDate = project.prazo_entrega_projeto 
                ? parseISO(project.prazo_entrega_projeto) 
                : addDays(startDate, 90); // Default 90 days
              const today = new Date();
              const totalDays = differenceInDays(endDate, startDate);
              const elapsedDays = differenceInDays(today, startDate);
              const progressPercentage = Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
              const remainingDays = differenceInDays(endDate, today);
              const isOverdue = remainingDays < 0;

              return (
                <div className="space-y-4">
                  {editingDates ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <Label htmlFor="start-date" className="font-medium whitespace-nowrap">Início:</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-auto"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <Label htmlFor="end-date" className="font-medium whitespace-nowrap">Prazo:</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={tempEndDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="w-auto"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateProjectDates(tempStartDate, tempEndDate)}
                          disabled={isSaving}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingDates(false)}
                          disabled={isSaving}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="font-medium">Início:</span>
                        <span className="text-muted-foreground">
                          {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", isOverdue ? "bg-destructive" : "bg-green-500")} />
                        <span className="font-medium">Prazo:</span>
                        <span className={cn("text-muted-foreground", isOverdue && "text-destructive font-medium")}>
                          {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <Progress value={progressPercentage} className="h-4" />
                    {/* Today marker */}
                    <div 
                      className="absolute top-0 w-0.5 h-4 bg-foreground"
                      style={{ left: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {elapsedDays > 0 ? `${elapsedDays} dias decorridos` : 'Projeto não iniciado'}
                    </span>
                    <span className={cn(
                      "font-medium",
                      isOverdue ? "text-destructive" : remainingDays <= 7 ? "text-amber-600" : "text-green-600"
                    )}>
                      {isOverdue 
                        ? `${Math.abs(remainingDays)} dias em atraso` 
                        : remainingDays === 0 
                          ? 'Prazo vence hoje!'
                          : `${remainingDays} dias restantes`
                      }
                    </span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* TAP + Project Summary */}
        {(tapForm || saleForm) && (
          <Collapsible className="mb-6">
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Resumo do Projeto (TAP + Venda)
                    <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-0">
                  {/* TAP Summary */}
                  {tapForm && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide mb-3">Resumo do TAP</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {tapForm.portaria_virtual_atendimento_app && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Portaria Virtual</p>
                            <p className="text-sm font-medium">{PORTARIA_VIRTUAL_LABELS[tapForm.portaria_virtual_atendimento_app as PortariaVirtualApp] || String(tapForm.portaria_virtual_atendimento_app)}</p>
                          </div>
                        )}
                        {tapForm.modalidade_portaria && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Modalidade</p>
                            <p className="text-sm font-medium">{MODALIDADE_PORTARIA_LABELS[tapForm.modalidade_portaria as ModalidadePortaria] || String(tapForm.modalidade_portaria)}</p>
                          </div>
                        )}
                        {tapForm.numero_blocos != null && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Nº Blocos</p>
                            <p className="text-sm font-medium">{String(tapForm.numero_blocos)}</p>
                          </div>
                        )}
                        {tapForm.numero_unidades != null && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Nº Unidades</p>
                            <p className="text-sm font-medium">{String(tapForm.numero_unidades)}</p>
                          </div>
                        )}
                        {tapForm.interfonia != null && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">Interfonia</p>
                            <p className="text-sm font-medium">{tapForm.interfonia ? 'Sim' : 'Não'}</p>
                          </div>
                        )}
                        {tapForm.cftv_elevador_possui && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">CFTV Elevador</p>
                            <p className="text-sm font-medium">{CFTV_ELEVADOR_LABELS[tapForm.cftv_elevador_possui as CFTVElevador] || String(tapForm.cftv_elevador_possui)}</p>
                          </div>
                        )}
                      </div>
                      {/* Text descriptions */}
                      {[
                        { key: 'controle_acessos_pedestre_descricao', label: 'Controle Pedestre' },
                        { key: 'controle_acessos_veiculo_descricao', label: 'Controle Veículo' },
                        { key: 'alarme_descricao', label: 'Alarme' },
                        { key: 'cftv_dvr_descricao', label: 'CFTV/DVR' },
                        { key: 'info_adicionais', label: 'Informações Adicionais' },
                      ].map(({ key, label }) => {
                        const val = tapForm[key];
                        if (!val) return null;
                        return (
                          <div key={key} className="mt-3 bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                            <p className="text-sm">{String(val)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Sale Form Summary */}
                  {saleForm && (
                    <SaleFormSummary
                      saleForm={saleForm}
                      projectInfo={project ? {
                        nome: project.cliente_condominio_nome,
                        cidade: project.cliente_cidade || '',
                        estado: project.cliente_estado || '',
                        vendedor: project.vendedor_nome,
                      } : undefined}
                      tapForm={tapForm}
                      comments={projectComments}
                      attachments={projectAttachments}
                      projectId={id}
                      summaryType="projeto"
                    />
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">Progresso Geral</span>
              <span className="text-sm text-muted-foreground">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => isEtapaComplete(n)).length}/9 etapas
              </span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <div 
                  key={n}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    isEtapaComplete(n) ? "bg-green-500" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Etapas */}
        <div className="space-y-4">
          {/* Etapa 1: Contrato Assinado */}
          <Card>
            <Collapsible open={expandedEtapas.includes(1)} onOpenChange={() => toggleEtapa(1)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(1) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(1) ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">1 - Contrato Assinado</CardTitle>
                    </div>
                    {expandedEtapas.includes(1) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <SubItem 
                    label="Contrato assinado pelo cliente" 
                    checked={etapas.contrato_assinado} 
                    field="contrato_assinado"
                    dateField="contrato_assinado_at"
                    date={etapas.contrato_assinado_at}
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Etapa 2: Contrato Cadastrado */}
          <Card>
            <Collapsible open={expandedEtapas.includes(2)} onOpenChange={() => toggleEtapa(2)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(2) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(2) ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">2 - Contrato Cadastrado</CardTitle>
                    </div>
                    {expandedEtapas.includes(2) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* Campos de Contrato e Código Alarme */}
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Informações do Contrato</h4>
                      {!editingContrato ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingContrato(true)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              // Validate required fields
                              const missingFields: string[] = [];
                              if (!contratoInfo.contrato?.trim()) missingFields.push('Contrato');
                              if (!contratoInfo.alarme_codigo?.trim()) missingFields.push('Código de Alarme');
                              if (!contratoInfo.mensalidade?.trim()) missingFields.push('Mensalidade');
                              if (!contratoInfo.prazo_contrato) missingFields.push('Prazo do Contrato');
                              if (!contratoInfo.taxa_instalacao?.trim()) missingFields.push('Taxa de Instalação');
                              if (!contratoInfo.filial) missingFields.push('Praça');

                              if (missingFields.length > 0) {
                                toast({
                                  title: 'Campos obrigatórios',
                                  description: `Preencha: ${missingFields.join(', ')}`,
                                  variant: 'destructive',
                                });
                                return;
                              }

                              try {
                                setIsSaving(true);
                                
                                const contratoTrimmed = contratoInfo.contrato.trim();
                                const prazoMeses = parseInt(contratoInfo.prazo_contrato) || 12;
                                const dataTermino = new Date();
                                dataTermino.setMonth(dataTermino.getMonth() + prazoMeses);

                                const mensalidade = parseFloat(contratoInfo.mensalidade.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                                const taxaAtivacao = parseFloat(contratoInfo.taxa_instalacao.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                                const enderecoProjeto = project?.cliente_cidade && project?.cliente_estado
                                  ? `${project.cliente_cidade}, ${project.cliente_estado}`
                                  : null;

                                const { data, error } = await supabase.functions.invoke('merge-customer-portfolio', {
                                  body: {
                                    projectId: id,
                                    contrato: contratoTrimmed,
                                    alarme_codigo: contratoInfo.alarme_codigo.trim() || null,
                                    mensalidade,
                                    taxa_ativacao: taxaAtivacao,
                                    data_termino: dataTermino.toISOString().split('T')[0],
                                    filial: contratoInfo.filial || null,
                                    razao_social: project?.cliente_condominio_nome || null,
                                    endereco: enderecoProjeto,
                                    status_implantacao: 'EM_IMPLANTACAO',
                                  },
                                });

                                if (error) {
                                  let message = error.message;
                                  if (typeof error === 'object' && error && 'context' in error) {
                                    const context = (error as { context?: Response }).context;
                                    if (context) {
                                      const body = await context.json().catch(() => null);
                                      if (body?.error) message = body.error;
                                    }
                                  }
                                  throw new Error(message);
                                }

                                if (data?.error) {
                                  throw new Error(data.error);
                                }

                                toast({
                                  title: 'Salvo',
                                  description: 'Informações do contrato atualizadas.',
                                });
                                setEditingContrato(false);
                              } catch (error) {
                                console.error('Error saving contrato info:', error);
                                toast({
                                  title: 'Erro',
                                  description: error instanceof Error ? error.message : 'Não foi possível salvar.',
                                  variant: 'destructive',
                                });
                              } finally {
                                setIsSaving(false);
                              }
                            }}
                            disabled={isSaving}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingContrato(false)}
                            disabled={isSaving}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="contrato-numero" className="text-sm">Contrato</Label>
                        {editingContrato ? (
                          <Input
                            id="contrato-numero"
                            value={contratoInfo.contrato}
                            onChange={(e) => setContratoInfo({ ...contratoInfo, contrato: e.target.value })}
                            placeholder="Ex: SP001"
                            className={cn("mt-1", !contratoInfo.contrato?.trim() && "border-destructive")}
                            required
                          />
                        ) : (
                          <p className="text-sm mt-1 font-medium">{contratoInfo.contrato || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="alarme-codigo" className="text-sm">Código de Alarme</Label>
                        {editingContrato ? (
                          <Input
                            id="alarme-codigo"
                            value={contratoInfo.alarme_codigo}
                            onChange={(e) => setContratoInfo({ ...contratoInfo, alarme_codigo: e.target.value })}
                            placeholder="Ex: 12345"
                            className={cn("mt-1", !contratoInfo.alarme_codigo?.trim() && "border-destructive")}
                            required
                          />
                        ) : (
                          <p className="text-sm mt-1 font-medium">{contratoInfo.alarme_codigo || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="mensalidade" className="text-sm">Mensalidade (R$)</Label>
                        {editingContrato ? (
                          <Input
                            id="mensalidade"
                            value={contratoInfo.mensalidade}
                            onChange={(e) => setContratoInfo({ ...contratoInfo, mensalidade: e.target.value })}
                            placeholder="Ex: 5.000,00"
                            className={cn("mt-1", !contratoInfo.mensalidade?.trim() && "border-destructive")}
                            required
                          />
                        ) : (
                          <p className="text-sm mt-1 font-medium">{contratoInfo.mensalidade ? `R$ ${contratoInfo.mensalidade}` : '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="prazo-contrato" className="text-sm">Prazo do Contrato</Label>
                        {editingContrato ? (
                          <Select
                            value={contratoInfo.prazo_contrato}
                            onValueChange={(value) => setContratoInfo({ ...contratoInfo, prazo_contrato: value })}
                          >
                            <SelectTrigger className={cn("mt-1", !contratoInfo.prazo_contrato && "border-destructive")}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12">12 meses</SelectItem>
                              <SelectItem value="24">24 meses</SelectItem>
                              <SelectItem value="36">36 meses</SelectItem>
                              <SelectItem value="48">48 meses</SelectItem>
                              <SelectItem value="60">60 meses</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm mt-1 font-medium">{contratoInfo.prazo_contrato ? `${contratoInfo.prazo_contrato} meses` : '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="taxa-instalacao" className="text-sm">Taxa de Instalação (R$)</Label>
                        {editingContrato ? (
                          <Input
                            id="taxa-instalacao"
                            value={contratoInfo.taxa_instalacao}
                            onChange={(e) => setContratoInfo({ ...contratoInfo, taxa_instalacao: e.target.value })}
                            placeholder="Ex: 1.500,00"
                            className={cn("mt-1", !contratoInfo.taxa_instalacao?.trim() && "border-destructive")}
                            required
                          />
                        ) : (
                          <p className="text-sm mt-1 font-medium">{contratoInfo.taxa_instalacao ? `R$ ${contratoInfo.taxa_instalacao}` : '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="filial" className="text-sm">Praça *</Label>
                        {editingContrato ? (
                          <Select
                            value={contratoInfo.filial}
                            onValueChange={(value) => setContratoInfo({ ...contratoInfo, filial: value })}
                          >
                            <SelectTrigger className={cn("mt-1", !contratoInfo.filial && "border-destructive")}>
                              <SelectValue placeholder="Selecione a praça" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BHZ">BHZ - Belo Horizonte</SelectItem>
                              <SelectItem value="SPO">SPO - São Paulo</SelectItem>
                              <SelectItem value="RJ">RJ - Rio de Janeiro</SelectItem>
                              <SelectItem value="VIX">VIX - Vitória</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm mt-1 font-medium">{contratoInfo.filial || '-'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Endereço de Instalação */}
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">Endereço de Instalação</h4>
                      {!editingEndereco && enderecoInstalacao && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingEndereco(true)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            setEnderecoInstalacao('');
                            const { data: existing } = await supabase
                              .from('customer_portfolio')
                              .select('id')
                              .eq('project_id', id)
                              .maybeSingle();
                            if (existing) {
                              await supabase.from('customer_portfolio').update({ endereco: null }).eq('id', existing.id);
                            }
                            toast({ title: 'Endereço removido' });
                          }}>
                            <span className="text-xs text-destructive">Remover</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {project?.endereco_condominio && !enderecoInstalacao && !editingEndereco && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Endereço do projeto: <span className="font-medium text-foreground">{project.endereco_condominio}</span>
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={async () => {
                            setEnderecoInstalacao(project.endereco_condominio!);
                            const { data: existing } = await supabase
                              .from('customer_portfolio')
                              .select('id')
                              .eq('project_id', id)
                              .maybeSingle();
                            if (existing) {
                              await supabase.from('customer_portfolio').update({ endereco: project.endereco_condominio }).eq('id', existing.id);
                            }
                            toast({ title: 'Endereço confirmado' });
                          }}>
                            <Check className="w-4 h-4 mr-1" />
                            Usar este endereço
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingEndereco(true)}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Informar outro
                          </Button>
                        </div>
                      </div>
                    )}

                    {!project?.endereco_condominio && !enderecoInstalacao && !editingEndereco && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
                        <Button size="sm" variant="outline" onClick={() => setEditingEndereco(true)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar endereço
                        </Button>
                      </div>
                    )}

                    {enderecoInstalacao && !editingEndereco && (
                      <p className="text-sm font-medium">{enderecoInstalacao}</p>
                    )}

                    {editingEndereco && (
                      <div className="space-y-2">
                        <Input
                          value={enderecoInstalacao}
                          onChange={(e) => setEnderecoInstalacao(e.target.value)}
                          placeholder="Endereço completo de instalação"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => {
                            if (!enderecoInstalacao.trim()) {
                              toast({ title: 'Erro', description: 'Preencha o endereço.', variant: 'destructive' });
                              return;
                            }
                            const { data: existing } = await supabase
                              .from('customer_portfolio')
                              .select('id')
                              .eq('project_id', id)
                              .maybeSingle();
                            if (existing) {
                              await supabase.from('customer_portfolio').update({ endereco: enderecoInstalacao.trim() }).eq('id', existing.id);
                            }
                            setEditingEndereco(false);
                            toast({ title: 'Endereço salvo' });
                          }}>
                            <Check className="w-4 h-4 mr-1" />
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingEndereco(false)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={etapas.contrato_cadastrado}
                        onCheckedChange={(value) => {
                          if (value === true) {
                            const missingFields: string[] = [];
                            if (!contratoInfo.contrato?.trim()) missingFields.push('Contrato');
                            if (!contratoInfo.alarme_codigo?.trim()) missingFields.push('Código de Alarme');
                            if (!contratoInfo.mensalidade?.trim()) missingFields.push('Mensalidade');
                            if (!contratoInfo.prazo_contrato) missingFields.push('Prazo do Contrato');
                            if (!contratoInfo.taxa_instalacao?.trim()) missingFields.push('Taxa de Instalação');

                            if (missingFields.length > 0) {
                              toast({
                                title: 'Campos obrigatórios não preenchidos',
                                description: `Preencha e salve os campos: ${missingFields.join(', ')} antes de marcar como concluído.`,
                                variant: 'destructive',
                              });
                              return;
                            }
                          }
                          updateEtapa('contrato_cadastrado', value, 'contrato_cadastrado_at');
                        }}
                        disabled={isSaving}
                      />
                      <span className={cn("text-sm", etapas.contrato_cadastrado && "text-muted-foreground line-through")}>Contrato cadastrado no sistema</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {etapas.contrato_cadastrado_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(etapas.contrato_cadastrado_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Etapa 3: Boas Vindas */}
          <Card>
            <Collapsible open={expandedEtapas.includes(3)} onOpenChange={() => toggleEtapa(3)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(3) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(3) ? <Check className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">3 - Boas Vindas - On Boarding</CardTitle>
                    </div>
                    {expandedEtapas.includes(3) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-1">
                  {isPPE ? (
                    <>
                      {/* 3.1 - Boas Vindas */}
                      <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={etapas.ppe_boas_vindas}
                            onCheckedChange={(value) => updateEtapa('ppe_boas_vindas', value, 'ppe_boas_vindas_at')}
                            disabled={isSaving}
                          />
                          <span className={cn("text-sm", etapas.ppe_boas_vindas && "text-muted-foreground line-through")}>
                            3.1 - Boas Vindas
                          </span>
                          {etapas.ppe_boas_vindas_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(etapas.ppe_boas_vindas_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3.2 - Validar material liberado e conformidade de projeto */}
                      <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={etapas.ppe_validar_material}
                            onCheckedChange={(value) => updateEtapa('ppe_validar_material', value, 'ppe_validar_material_at')}
                            disabled={isSaving}
                          />
                          <span className={cn("text-sm", etapas.ppe_validar_material && "text-muted-foreground line-through")}>
                            3.2 - Validar material liberado e conformidade de projeto
                          </span>
                          {etapas.ppe_validar_material_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(etapas.ppe_validar_material_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantidade por tipo de totem */}
                      <div className="px-4 py-3 space-y-2 border-t border-border">
                        <span className="text-sm font-medium">Quantidade de totens por tipo</span>
                        <p className="text-xs text-muted-foreground">Informe quantos totens de cada modelo serão instalados.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                          {([
                            { label: 'Totem 360', field: 'ppe_totem_360_qtd' as const },
                            { label: 'Totem Parede', field: 'ppe_totem_parede_qtd' as const },
                            { label: 'Totem Mini', field: 'ppe_totem_mini_qtd' as const },
                          ]).map((t) => (
                            <div key={t.field} className="space-y-1">
                              <label className="text-xs text-muted-foreground">{t.label}</label>
                              <Input
                                type="number"
                                min={0}
                                value={(etapas as any)[t.field] ?? 0}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                  setEtapas(prev => prev ? { ...prev, [t.field]: val } as ImplantacaoEtapas : null);
                                }}
                                onBlur={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                                  updateEtapa(t.field as any, val);
                                }}
                                className="h-9"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground pt-1">
                          Total: <span className="font-semibold text-foreground">
                            {(etapas.ppe_totem_360_qtd || 0) + (etapas.ppe_totem_parede_qtd || 0) + (etapas.ppe_totem_mini_qtd || 0)}
                          </span> totens
                        </div>
                      </div>
                      {/* 3.3 - Agendamento da visita para instalação da base */}
                      <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={etapas.ligacao_boas_vindas}
                            onCheckedChange={(value) => updateEtapa('ligacao_boas_vindas', value, 'ligacao_boas_vindas_at')}
                            disabled={isSaving}
                          />
                          <span className={cn("text-sm", etapas.ligacao_boas_vindas && "text-muted-foreground line-through")}>
                            3.3 - Agendamento da visita para instalação da base
                          </span>
                        </div>
                        <Input
                          type="date"
                          value={etapas.ppe_agendamento_base_data || ''}
                          onChange={(e) => updateEtapa('ppe_agendamento_base_data', e.target.value)}
                          className="w-44"
                        />
                      </div>

                      {/* 3.4 - Data de execução da instalação sapata/engastamento */}
                      <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={etapas.cadastro_gear}
                            onCheckedChange={(value) => updateEtapa('cadastro_gear', value, 'cadastro_gear_at')}
                            disabled={isSaving}
                          />
                          <span className={cn("text-sm", etapas.cadastro_gear && "text-muted-foreground line-through")}>
                            3.4 - Data de execução da instalação sapata/engastamento
                          </span>
                        </div>
                        <Input
                          type="date"
                          value={etapas.ppe_execucao_base_data || ''}
                          onChange={(e) => updateEtapa('ppe_execucao_base_data', e.target.value)}
                          className="w-44"
                        />
                      </div>

                      {/* 3.5 - Equipe de instalação (Banco de Prestadores) */}
                      <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md gap-3 flex-wrap">
                        <span className="text-sm font-medium">3.5 - Equipe de instalação</span>
                        <Select
                          value={etapas.ppe_equipe_prestador_id || ''}
                          onValueChange={(value) => updateEtapa('ppe_equipe_prestador_id', value)}
                        >
                          <SelectTrigger className="w-72">
                            <SelectValue placeholder="Selecione a equipe..." />
                          </SelectTrigger>
                          <SelectContent>
                            {prestadoresList.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                Nenhum prestador cadastrado
                              </div>
                            ) : (
                              prestadoresList.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nome}{p.empresa && p.empresa.length > 0 ? ` — ${p.empresa.join(', ')}` : ''}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3.6 - Pagamento de Instalação */}
                      <div className="px-4 py-3 space-y-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={etapas.pagamento_instalacao_conferido}
                              onCheckedChange={(value) => updateEtapa('pagamento_instalacao_conferido', value, 'pagamento_instalacao_conferido_at')}
                              disabled={isSaving}
                            />
                            <span className={cn("text-sm font-medium", etapas.pagamento_instalacao_conferido && "text-muted-foreground line-through")}>
                              3.6 - Pagamento de Instalação
                            </span>
                            {etapas.pagamento_instalacao_conferido_at && (
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(etapas.pagamento_instalacao_conferido_at), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground ml-8">
                          Valores referentes à pontuação liberada, infraestrutura, deslocamento, pedágio e diárias de viagem.
                        </p>
                        {(() => {
                          const pagItems = [
                            { label: 'Pontuação (equipamentos)', field: 'pagamento_instalacao_pontuacao', fieldAuf: 'pagamento_instalacao_pontuacao_auferido' },
                            { label: 'Qtd. Infra', field: 'pagamento_instalacao_infra', fieldAuf: 'pagamento_instalacao_infra_auferido' },
                            { label: 'Qtd. Deslocamento', field: 'pagamento_instalacao_deslocamento', fieldAuf: 'pagamento_instalacao_deslocamento_auferido' },
                            { label: 'Qtd. Pedágio', field: 'pagamento_instalacao_pedagio', fieldAuf: 'pagamento_instalacao_pedagio_auferido' },
                            { label: 'Diária de Viagem', field: 'pagamento_instalacao_diaria', fieldAuf: 'pagamento_instalacao_diaria_auferido' },
                            { label: 'Qtd. Instalação Sapata', field: 'pagamento_instalacao_sapata', fieldAuf: 'pagamento_instalacao_sapata_auferido' },
                            { label: 'Qtd. Instalação Totem', field: 'pagamento_instalacao_totem', fieldAuf: 'pagamento_instalacao_totem_auferido' },
                          ];
                          const hasDivergencia = pagItems.some(item => {
                            const lib = (etapas as any)[item.field];
                            const auf = (etapas as any)[item.fieldAuf];
                            return lib != null && auf != null && lib !== auf;
                          });
                          return (
                            <div className="ml-8 space-y-3">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border border-border rounded-md">
                                  <thead>
                                    <tr className="bg-muted/50">
                                      <th className="text-left text-xs font-medium p-2 border-b border-border">Item</th>
                                      <th className="text-center text-xs font-medium p-2 border-b border-border">Liberado</th>
                                      <th className="text-center text-xs font-medium p-2 border-b border-border">Auferido (Vistoria)</th>
                                      <th className="text-center text-xs font-medium p-2 border-b border-border w-20">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pagItems.map((item) => {
                                      const lib = (etapas as any)[item.field];
                                      const auf = (etapas as any)[item.fieldAuf];
                                      const isDivergent = lib != null && auf != null && lib !== auf;
                                      return (
                                        <tr key={item.field} className={cn("border-b border-border last:border-b-0", isDivergent && "bg-destructive/10")}>
                                          <td className="p-2 text-xs font-medium text-muted-foreground">{item.label}</td>
                                          <td className="p-2">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              placeholder="0,00"
                                              className="h-8 text-xs text-center"
                                              value={lib ?? ''}
                                              onChange={(e) => {
                                                const val = e.target.value === '' ? null : Number(e.target.value);
                                                setEtapas(prev => prev ? { ...prev, [item.field]: val } as ImplantacaoEtapas : null);
                                              }}
                                              onBlur={(e) => {
                                                const val = e.target.value === '' ? null : Number(e.target.value);
                                                updateEtapa(item.field as any, val);
                                              }}
                                            />
                                          </td>
                                          <td className="p-2">
                                            <Input
                                              type="number"
                                              step="0.01"
                                              placeholder="0,00"
                                              className={cn("h-8 text-xs text-center", isDivergent && "border-destructive")}
                                              value={auf ?? ''}
                                              onChange={(e) => {
                                                const val = e.target.value === '' ? null : Number(e.target.value);
                                                setEtapas(prev => prev ? { ...prev, [item.fieldAuf]: val } as ImplantacaoEtapas : null);
                                              }}
                                              onBlur={(e) => {
                                                const val = e.target.value === '' ? null : Number(e.target.value);
                                                updateEtapa(item.fieldAuf as any, val);
                                              }}
                                            />
                                          </td>
                                          <td className="p-2 text-center">
                                            {lib != null && auf != null ? (
                                              isDivergent ? (
                                                <span className="text-xs font-semibold text-destructive flex items-center justify-center gap-1">
                                                  <AlertTriangle className="w-3 h-3" /> Divergente
                                                </span>
                                              ) : (
                                                <span className="text-xs font-semibold text-green-600 flex items-center justify-center gap-1">
                                                  <Check className="w-3 h-3" /> OK
                                                </span>
                                              )
                                            ) : (
                                              <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              {hasDivergencia && (
                                <div className="p-3 border border-destructive/30 bg-destructive/5 rounded-md space-y-2">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-destructive" />
                                    <span className="text-xs font-semibold text-destructive">Divergência detectada — justificativa obrigatória</span>
                                  </div>
                                  <Textarea
                                    placeholder="Descreva o motivo da divergência entre o valor liberado e o auferido na vistoria..."
                                    className="text-xs min-h-[60px]"
                                    value={etapas.pagamento_instalacao_divergencia_justificativa ?? ''}
                                    onChange={(e) => {
                                      setEtapas(prev => prev ? { ...prev, pagamento_instalacao_divergencia_justificativa: e.target.value } as ImplantacaoEtapas : null);
                                    }}
                                    onBlur={(e) => {
                                      updateEtapa('pagamento_instalacao_divergencia_justificativa' as any, e.target.value || null);
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* 3.7 - Observação */}
                      <div className="px-4 py-3 space-y-2 border-t border-border">
                        <span className="text-sm font-medium">3.7 - Observações</span>
                        <Textarea
                          placeholder="Insira observações sobre o onboarding..."
                          value={localObsOnboardingPPE}
                          onChange={(e) => setLocalObsOnboardingPPE(e.target.value)}
                          onBlur={() => {
                            if (localObsOnboardingPPE !== (etapas.ppe_observacao_onboarding || '')) {
                              updateEtapa('ppe_observacao_onboarding', localObsOnboardingPPE);
                            }
                          }}
                          className="min-h-[80px]"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <SubItem
                        label="3.1 - Ligação de Boas Vindas"
                        checked={etapas.ligacao_boas_vindas}
                        field="ligacao_boas_vindas"
                        dateField="ligacao_boas_vindas_at"
                        date={etapas.ligacao_boas_vindas_at}
                      />
                      <SubItem
                        label="3.2 - Cadastro do Condomínio e Morador no Gear"
                        checked={etapas.cadastro_gear}
                        field="cadastro_gear"
                        dateField="cadastro_gear_at"
                        date={etapas.cadastro_gear_at}
                      />
                      <SubItem
                        label="3.3 - Síndico baixar APP"
                        checked={etapas.sindico_app}
                        field="sindico_app"
                        dateField="sindico_app_at"
                        date={etapas.sindico_app_at}
                      />
                      <SubItem
                        label="3.4 - Conferência de controle/Tags"
                        checked={etapas.conferencia_tags}
                        field="conferencia_tags"
                        dateField="conferencia_tags_at"
                        date={etapas.conferencia_tags_at}
                      />

                      {/* 3.5 - Pendência de Departamento (Instalação) */}
                      <div className="px-4 py-3 space-y-2 border-t border-border">
                        <span className="text-sm font-medium">3.5 - Abrir Pendência de Departamento (Instalação)</span>
                        <Textarea
                          placeholder="Descreva a pendência de departamento..."
                          value={pendenciaDeptTexto}
                          onChange={(e) => setPendenciaDeptTexto(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <Button
                          size="sm"
                          onClick={() => criarPendencia('DEPT_INSTALACAO', pendenciaDeptTexto)}
                          disabled={criandoPendencia || !pendenciaDeptTexto.trim()}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Abrir Pendência Departamento
                        </Button>
                      </div>

                      {/* 3.6 - Pendência de Cliente (Instalação) */}
                      <div className="px-4 py-3 space-y-2 border-t border-border">
                        <span className="text-sm font-medium">3.6 - Abrir Pendência Externa de Instalação (Cliente)</span>
                        <Textarea
                          placeholder="Descreva a pendência do cliente..."
                          value={pendenciaClienteTexto}
                          onChange={(e) => setPendenciaClienteTexto(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => criarPendencia('CLIENTE_INSTALACAO', pendenciaClienteTexto)}
                          disabled={criandoPendencia || !pendenciaClienteTexto.trim()}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Abrir Pendência Cliente
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Etapa 4: Visita de Start-up */}
          <Card>
            <Collapsible open={expandedEtapas.includes(4)} onOpenChange={() => toggleEtapa(4)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(4) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(4) ? <Check className="w-4 h-4" /> : <ClipboardCheck className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">{isPPE ? '4 - Instalação do Totem' : '4 - Visita de Implantação'}</CardTitle>
                    </div>
                    {expandedEtapas.includes(4) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-1">
                  {isPPE ? (
                    <>
                      {/* 4.1 - Agendar visita de instalação do totem */}
                      <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={etapas.agendamento_visita_startup}
                            onCheckedChange={(value) => updateEtapa('agendamento_visita_startup', value, 'agendamento_visita_startup_at')}
                            disabled={isSaving}
                          />
                          <span className={cn("text-sm", etapas.agendamento_visita_startup && "text-muted-foreground line-through")}>
                            4.1 - Agendar visita de instalação do totem
                          </span>
                        </div>
                        <Input
                          type="date"
                          value={etapas.agendamento_visita_startup_data || ''}
                          onChange={(e) => updateEtapa('agendamento_visita_startup_data', e.target.value)}
                          className="w-44"
                        />
                      </div>

                      {/* 4.2 - Check-list de instalação do totem */}
                      <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={etapas.laudo_visita_startup}
                            onCheckedChange={(value) => {
                              if (value === true && !checklistsExistentes.includes('instalacao_totem')) {
                                toast({
                                  title: 'Checklist obrigatório',
                                  description: 'Preencha o check-list de instalação do totem antes de marcar como concluído.',
                                  variant: 'destructive',
                                });
                                return;
                              }
                              updateEtapa('laudo_visita_startup', value, 'laudo_visita_startup_at');
                            }}
                            disabled={isSaving}
                          />
                          <span className={cn("text-sm", etapas.laudo_visita_startup && "text-muted-foreground line-through")}>
                            4.2 - Check-list de instalação do totem
                            {!checklistsExistentes.includes('instalacao_totem') && !etapas.laudo_visita_startup && (
                              <span className="text-destructive ml-2 text-xs font-medium">(Checklist pendente)</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {etapas.laudo_visita_startup_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(parseISO(etapas.laudo_visita_startup_at), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/startup-projetos/${id}/checklist/instalacao_totem`)}
                          >
                            <ClipboardCheck className="w-4 h-4 mr-1" />
                            Checklist
                          </Button>
                        </div>
                      </div>

                      {/* 4.3 - Observação */}
                      <div className="px-4 py-3 space-y-2 border-t border-border">
                        <span className="text-sm font-medium">4.3 - Observações</span>
                        <Textarea
                          placeholder="Insira observações sobre a instalação do totem..."
                          value={localObsInstalacaoPPE}
                          onChange={(e) => setLocalObsInstalacaoPPE(e.target.value)}
                          onBlur={() => {
                            if (localObsInstalacaoPPE !== (etapas.ppe_observacao_instalacao || '')) {
                              updateEtapa('ppe_observacao_instalacao', localObsInstalacaoPPE);
                            }
                          }}
                          className="min-h-[80px]"
                        />
                      </div>
                    </>
                  ) : (
                    <></>
                  )}
                  {!isPPE && (<></>)}
                  {!isPPE && (<>

                  <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={etapas.check_projeto}
                        onCheckedChange={(value) => {
                          if (value === true && !checklistsExistentes.includes('check_projeto')) {
                            toast({
                              title: 'Checklist obrigatório',
                              description: 'Preencha o checklist de projeto antes de marcar como concluído. Clique no botão "Checklist" ao lado.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          updateEtapa('check_projeto', value, 'check_projeto_at');
                        }}
                        disabled={isSaving}
                      />
                      <span className={cn("text-sm", etapas.check_projeto && "text-muted-foreground line-through")}>
                        4.1 - Check de projeto
                        {!checklistsExistentes.includes('check_projeto') && !etapas.check_projeto && (
                          <span className="text-destructive ml-2 text-xs font-medium">(Checklist pendente)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {etapas.check_projeto_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(etapas.check_projeto_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/startup-projetos/${id}/checklist/check_projeto`)}
                      >
                        <ClipboardCheck className="w-4 h-4 mr-1" />
                        Checklist
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={etapas.agendamento_visita_startup}
                        onCheckedChange={(value) => updateEtapa('agendamento_visita_startup', value, 'agendamento_visita_startup_at')}
                        disabled={isSaving}
                      />
                      <span className={cn("text-sm", etapas.agendamento_visita_startup && "text-muted-foreground line-through")}>
                        4.2 - Agendamento de visita
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="date"
                        value={etapas.agendamento_visita_startup_data || ''}
                        onChange={(e) => updateEtapa('agendamento_visita_startup_data', e.target.value)}
                        className="w-40"
                      />
                    </div>
                  </div>
                  {/* 4.3 - Upload obrigatório de PDF/fotos com validação de terceirizados */}
                  <div className="py-2 px-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox 
                        checked={etapas.laudo_visita_startup}
                        onCheckedChange={(value) => updateEtapa('laudo_visita_startup', value, 'laudo_visita_startup_at')}
                        disabled={isSaving}
                      />
                      <span className={cn("text-sm font-medium", etapas.laudo_visita_startup && "text-muted-foreground line-through")}>
                        4.3 - Laudo e check-list de visita (Upload obrigatório)
                      </span>
                      {etapas.laudo_visita_startup_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(etapas.laudo_visita_startup_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 ml-8">
                      Envie o checklist preenchido com os dados dos terceirizados (vidraceiro, serralheiro, instalador de motor, câmera de elevador, instalador Smart Portaria). Se os dados não estiverem completos, ficará com status de pendência.
                    </p>
                    <div className="ml-8">
                      <SectionFileUpload projectId={id || null} secao="implantacao_laudo_visita" />
                    </div>
                  </div>

                  {/* 4.4 - Pendências detectadas */}
                  <div className="px-4 py-3 space-y-3 border-t border-border">
                    <span className="text-sm font-medium">4.4 - Pendências detectadas na visita</span>
                    <p className="text-xs text-muted-foreground">
                      Se alguma pendência por parte do cliente ou da Emive foi detectada durante a visita, registre abaixo.
                    </p>

                    {/* Pendência de Departamento */}
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                      <span className="text-xs font-medium text-muted-foreground">Pendência Interna (Departamento Instalação)</span>
                      <Textarea
                        placeholder="Descreva a pendência interna detectada..."
                        value={pendenciaDeptVisitaTexto}
                        onChange={(e) => setPendenciaDeptVisitaTexto(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          await criarPendencia('DEPT_INSTALACAO', pendenciaDeptVisitaTexto);
                          setPendenciaDeptVisitaTexto('');
                        }}
                        disabled={criandoPendencia || !pendenciaDeptVisitaTexto.trim()}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Abrir Pendência Departamento
                      </Button>
                    </div>

                    {/* Pendência de Cliente */}
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                      <span className="text-xs font-medium text-muted-foreground">Pendência Externa (Cliente)</span>
                      <Textarea
                        placeholder="Descreva a pendência do cliente detectada..."
                        value={pendenciaClienteVisitaTexto}
                        onChange={(e) => setPendenciaClienteVisitaTexto(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await criarPendencia('CLIENTE_INSTALACAO', pendenciaClienteVisitaTexto);
                          setPendenciaClienteVisitaTexto('');
                        }}
                        disabled={criandoPendencia || !pendenciaClienteVisitaTexto.trim()}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Abrir Pendência Cliente
                      </Button>
                    </div>
                  </div>

                  {/* 4.5 - Pagamento de Instalação */}
                  <div className="px-4 py-3 space-y-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={etapas.pagamento_instalacao_conferido}
                          onCheckedChange={(value) => updateEtapa('pagamento_instalacao_conferido', value, 'pagamento_instalacao_conferido_at')}
                          disabled={isSaving}
                        />
                        <span className={cn("text-sm font-medium", etapas.pagamento_instalacao_conferido && "text-muted-foreground line-through")}>
                          4.5 - Pagamento de Instalação
                        </span>
                        {etapas.pagamento_instalacao_conferido_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(etapas.pagamento_instalacao_conferido_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground ml-8">
                      Valores referentes à pontuação liberada, infraestrutura, deslocamento, pedágio e diárias de viagem.
                    </p>
                    {(() => {
                      const pagItems = [
                        { label: 'Pontuação (equipamentos)', field: 'pagamento_instalacao_pontuacao', fieldAuf: 'pagamento_instalacao_pontuacao_auferido' },
                        { label: 'Qtd. Infra', field: 'pagamento_instalacao_infra', fieldAuf: 'pagamento_instalacao_infra_auferido' },
                        { label: 'Qtd. Deslocamento', field: 'pagamento_instalacao_deslocamento', fieldAuf: 'pagamento_instalacao_deslocamento_auferido' },
                        { label: 'Qtd. Pedágio', field: 'pagamento_instalacao_pedagio', fieldAuf: 'pagamento_instalacao_pedagio_auferido' },
                        { label: 'Diária de Viagem', field: 'pagamento_instalacao_diaria', fieldAuf: 'pagamento_instalacao_diaria_auferido' },
                            { label: 'Qtd. Instalação Sapata', field: 'pagamento_instalacao_sapata', fieldAuf: 'pagamento_instalacao_sapata_auferido' },
                            { label: 'Qtd. Instalação Totem', field: 'pagamento_instalacao_totem', fieldAuf: 'pagamento_instalacao_totem_auferido' },
                      ];
                      const hasDivergencia = pagItems.some(item => {
                        const lib = (etapas as any)[item.field];
                        const auf = (etapas as any)[item.fieldAuf];
                        return lib != null && auf != null && lib !== auf;
                      });
                      return (
                        <div className="ml-8 space-y-3">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm border border-border rounded-md">
                              <thead>
                                <tr className="bg-muted/50">
                                  <th className="text-left text-xs font-medium p-2 border-b border-border">Item</th>
                                  <th className="text-center text-xs font-medium p-2 border-b border-border">Liberado</th>
                                  <th className="text-center text-xs font-medium p-2 border-b border-border">Auferido (Vistoria)</th>
                                  <th className="text-center text-xs font-medium p-2 border-b border-border w-20">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pagItems.map((item) => {
                                  const lib = (etapas as any)[item.field];
                                  const auf = (etapas as any)[item.fieldAuf];
                                  const isDivergent = lib != null && auf != null && lib !== auf;
                                  return (
                                    <tr key={item.field} className={cn("border-b border-border last:border-b-0", isDivergent && "bg-destructive/10")}>
                                      <td className="p-2 text-xs font-medium text-muted-foreground">{item.label}</td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          placeholder="0,00"
                                          className="h-8 text-xs text-center"
                                          value={lib ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? null : Number(e.target.value);
                                            setEtapas(prev => prev ? { ...prev, [item.field]: val } as ImplantacaoEtapas : null);
                                          }}
                                          onBlur={(e) => {
                                            const val = e.target.value === '' ? null : Number(e.target.value);
                                            updateEtapa(item.field as any, val);
                                          }}
                                        />
                                      </td>
                                      <td className="p-2">
                                        <Input
                                          type="number"
                                          step="0.01"
                                          placeholder="0,00"
                                          className={cn("h-8 text-xs text-center", isDivergent && "border-destructive")}
                                          value={auf ?? ''}
                                          onChange={(e) => {
                                            const val = e.target.value === '' ? null : Number(e.target.value);
                                            setEtapas(prev => prev ? { ...prev, [item.fieldAuf]: val } as ImplantacaoEtapas : null);
                                          }}
                                          onBlur={(e) => {
                                            const val = e.target.value === '' ? null : Number(e.target.value);
                                            updateEtapa(item.fieldAuf as any, val);
                                          }}
                                        />
                                      </td>
                                      <td className="p-2 text-center">
                                        {lib != null && auf != null ? (
                                          isDivergent ? (
                                            <span className="text-xs font-semibold text-destructive flex items-center justify-center gap-1">
                                              <AlertTriangle className="w-3 h-3" /> Divergente
                                            </span>
                                          ) : (
                                            <span className="text-xs font-semibold text-green-600 flex items-center justify-center gap-1">
                                              <Check className="w-3 h-3" /> OK
                                            </span>
                                          )
                                        ) : (
                                          <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {hasDivergencia && (
                            <div className="p-3 border border-destructive/30 bg-destructive/5 rounded-md space-y-2">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-destructive" />
                                <span className="text-xs font-semibold text-destructive">Divergência detectada — justificativa obrigatória</span>
                              </div>
                              <Textarea
                                placeholder="Descreva o motivo da divergência entre o valor liberado e o auferido na vistoria..."
                                className="text-xs min-h-[60px]"
                                value={etapas.pagamento_instalacao_divergencia_justificativa ?? ''}
                                onChange={(e) => {
                                  setEtapas(prev => prev ? { ...prev, pagamento_instalacao_divergencia_justificativa: e.target.value } as ImplantacaoEtapas : null);
                                }}
                                onBlur={(e) => {
                                  updateEtapa('pagamento_instalacao_divergencia_justificativa' as any, e.target.value || null);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  </>)}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Etapa 5: Execução da Obra (oculta para PPE) */}
          {!isPPE && (
          <Card>
            <Collapsible open={expandedEtapas.includes(5)} onOpenChange={() => toggleEtapa(5)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(5) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(5) ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">5 - Execução da Obra</CardTitle>
                    </div>
                    {expandedEtapas.includes(5) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <p className="text-xs text-muted-foreground px-4">
                    Faça upload do checklist de execução da obra preenchido (PDF ou fotos). Se o documento não estiver devidamente preenchido, ficará com mensagem de pendência de informação.
                  </p>
                  {/* 5.1 - Checklist de Execução da Obra */}
                  <div className="py-2 px-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox 
                        checked={etapas.laudo_instalador} 
                        onCheckedChange={(value) => {
                          if (value === true && !secoesComAnexo.includes('implantacao_laudo_instalador')) {
                            toast({
                              title: 'Upload obrigatório',
                              description: 'Anexe o checklist de execução da obra antes de marcar como concluído.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          updateEtapa('laudo_instalador', value, 'laudo_instalador_at');
                        }} 
                        disabled={isSaving} 
                      />
                      <span className={cn("text-sm font-medium", etapas.laudo_instalador && "text-muted-foreground line-through")}>
                        5.1 - Checklist de Execução da Obra
                        {!secoesComAnexo.includes('implantacao_laudo_instalador') && !etapas.laudo_instalador && (
                          <span className="text-destructive ml-2 text-xs font-medium">(Upload obrigatório)</span>
                        )}
                      </span>
                      {etapas.laudo_instalador_at && <span className="text-xs text-muted-foreground">{format(parseISO(etapas.laudo_instalador_at), "dd/MM/yyyy", { locale: ptBR })}</span>}
                    </div>
                    <div className="ml-8"><SectionFileUpload projectId={id || null} secao="implantacao_laudo_instalador" /></div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          )}
          {/* Etapa 6: Programação e Ativação */}
          <Card>
            <Collapsible open={expandedEtapas.includes(6)} onOpenChange={() => toggleEtapa(6)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(6) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(6) ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">6 - Programação e Ativação</CardTitle>
                    </div>
                    {expandedEtapas.includes(6) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* 6.1 - Abertura de chamado no NOC */}
                  <div className="py-3 px-4 rounded-md border">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        nocChamado?.item_6_1_status === 'success'
                          ? "bg-primary text-primary-foreground"
                          : nocChamado?.item_6_1_status === 'error'
                            ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {nocChamado?.item_6_1_status === 'success' ? <Check className="w-3 h-3" /> : '1'}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        nocChamado?.item_6_1_status === 'success' && "text-muted-foreground"
                      )}>
                        6.1 - Abertura de chamado no NOC
                      </span>
                    </div>

                    {/* Before opening */}
                    {(!nocChamado || nocChamado.item_6_1_status === 'pending' || nocChamado.item_6_1_status === 'error') && (
                      <div className="ml-9 space-y-3">
                        {!(isEtapaComplete(1) && isEtapaComplete(2) && isEtapaComplete(3) && isEtapaComplete(4) && isEtapaComplete(5)) && (
                          <p className="text-sm text-muted-foreground italic">
                            Todas as etapas anteriores (1 a 5) precisam estar concluídas para abrir o chamado.
                          </p>
                        )}
                        <Button
                          onClick={handleAbrirChamadoNoc}
                          disabled={nocLoading || !(isEtapaComplete(1) && isEtapaComplete(2) && isEtapaComplete(3) && isEtapaComplete(4) && isEtapaComplete(5))}
                          className="w-full"
                        >
                          {nocLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                              Processando abertura...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Abrir chamado no EIXONOC
                            </>
                          )}
                        </Button>

                        {nocChamado?.item_6_1_status === 'error' && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {nocChamado.integration_message || 'Erro ao abrir chamado. Tente novamente.'}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    {/* After success */}
                    {nocChamado?.item_6_1_status === 'success' && (
                      <div className="ml-9 p-3 bg-muted/50 rounded-md border space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="font-medium">Chamado aberto com sucesso</span>
                        </div>
                        {nocChamado.chamado_numero && (
                          <p className="text-sm"><span className="text-muted-foreground">Chamado:</span> <span className="font-medium">{nocChamado.chamado_numero}</span></p>
                        )}
                        {nocChamado.opened_by_name && (
                          <p className="text-sm"><span className="text-muted-foreground">Aberto por:</span> {nocChamado.opened_by_name}</p>
                        )}
                        {nocChamado.opened_at && (
                          <p className="text-sm"><span className="text-muted-foreground">Em:</span> {format(parseISO(nocChamado.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        )}
                        {nocChamado.chamado_url && (
                          <a
                            href={nocChamado.chamado_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver chamado
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 6.2 - Check e laudo de programação */}
                  <div className={cn(
                    "transition-opacity",
                    (!nocChamado || nocChamado.item_6_1_status !== 'success') && "opacity-50 pointer-events-none"
                  )}>
                    <SubItem 
                      label="6.2 - Check e laudo de programação" 
                      checked={etapas.check_programacao} 
                      field="check_programacao"
                      dateField="check_programacao_at"
                      date={etapas.check_programacao_at}
                      hasChecklist
                      checklistType="check_programacao"
                      onChecklistClick={() => openChecklistDialog('check_programacao')}
                    />
                  </div>

                  {/* 6.3 - Confirmação de ativação do Financeiro */}
                  <div className={cn(
                    "transition-opacity",
                    (!etapas.check_programacao) && "opacity-50 pointer-events-none"
                  )}>
                    <SubItem 
                      label="6.3 - Confirmação de ativação do Financeiro" 
                      checked={etapas.confirmacao_ativacao_financeira} 
                      field="confirmacao_ativacao_financeira"
                      dateField="confirmacao_ativacao_financeira_at"
                      date={etapas.confirmacao_ativacao_financeira_at}
                    />
                   </div>

                   {/* Data de Ativação Realizada */}
                   <div className="px-4 pt-2">
                     <Label className="text-sm font-medium">Data de Ativação Realizada</Label>
                     <Input 
                       type="date"
                       value={etapas.data_ativacao_realizada || ''}
                       onChange={(e) => updateEtapa('data_ativacao_realizada', e.target.value || null)}
                       className="w-48 mt-1"
                     />
                   </div>

                   {/* Data de Vencimento do Primeiro Boleto */}
                   <div className="px-4 pt-2">
                     <Label className="text-sm font-medium">Data de Vencimento do Primeiro Boleto</Label>
                     <Input 
                       type="date"
                       value={(etapas as any).data_vencimento_primeiro_boleto || ''}
                       onChange={(e) => updateEtapa('data_vencimento_primeiro_boleto' as any, e.target.value || null)}
                       className="w-48 mt-1"
                     />
                   </div>

                  <div className="px-4 pt-4">
                    <Button onClick={generatePDF} variant="outline" className="w-full">
                      <FileDown className="w-4 h-4 mr-2" />
                      Gerar PDF de Implantação
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Etapa 7: Entrega Técnica e Comercial */}
          <Card>
            <Collapsible open={expandedEtapas.includes(7)} onOpenChange={() => toggleEtapa(7)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(7) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(7) ? <Check className="w-4 h-4" /> : <Handshake className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">7 - Entrega Técnica e Comercial</CardTitle>
                    </div>
                    {expandedEtapas.includes(7) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center justify-between py-2 px-4 hover:bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={etapas.agendamento_visita_comercial}
                        onCheckedChange={(value) => updateEtapa('agendamento_visita_comercial', value, 'agendamento_visita_comercial_at')}
                        disabled={isSaving}
                      />
                      <span className={cn("text-sm", etapas.agendamento_visita_comercial && "text-muted-foreground line-through")}>
                        7.1 - Agendamento de visita
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="date"
                        value={etapas.agendamento_visita_comercial_data || ''}
                        onChange={(e) => updateEtapa('agendamento_visita_comercial_data', e.target.value)}
                        className="w-40"
                      />
                    </div>
                  </div>
                  <SubItem 
                    label="7.2 - Laudo da visita" 
                    checked={etapas.laudo_visita_comercial} 
                    field="laudo_visita_comercial"
                    dateField="laudo_visita_comercial_at"
                    date={etapas.laudo_visita_comercial_at}
                  />
                  <div className="px-4 pt-2">
                    <Label className="text-sm text-muted-foreground">Observações da entrega técnica e comercial</Label>
                    <Textarea 
                      value={localLaudoTexto}
                      onChange={(e) => setLocalLaudoTexto(e.target.value)}
                      onBlur={() => {
                        if (localLaudoTexto !== (etapas.laudo_visita_comercial_texto || '')) {
                          updateEtapa('laudo_visita_comercial_texto', localLaudoTexto);
                        }
                      }}
                      placeholder="Descreva observações sobre a entrega técnica e comercial..."
                      className="mt-1"
                    />
                  </div>
                  <div className="px-4 pt-2">
                    <Label className="text-sm font-medium">
                      7.3 - Check-list de Entrega Técnica (Upload)
                      {!secoesComAnexo.includes('implantacao_entrega_tecnica') && (
                        <span className="text-destructive ml-2 text-xs">(Upload obrigatório)</span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Envie o checklist de entrega técnica assinado pelo cliente. O sistema verificará se há pendências registradas.
                    </p>
                    <SectionFileUpload projectId={id || null} secao="implantacao_entrega_tecnica" />
                   </div>

                   {/* 7.4 - Pendência de Departamento */}
                   <div className="px-4 py-3 space-y-2 border-t border-border">
                     <span className="text-sm font-medium">7.4 - Abrir Pendência de Departamento</span>
                     <Textarea
                       placeholder="Descreva a pendência de departamento..."
                       value={pendenciaDeptEntregaTexto}
                       onChange={(e) => setPendenciaDeptEntregaTexto(e.target.value)}
                       className="min-h-[60px]"
                     />
                     <Button
                       size="sm"
                       onClick={() => {
                         criarPendencia('DEPT_INSTALACAO', pendenciaDeptEntregaTexto);
                         setPendenciaDeptEntregaTexto('');
                       }}
                       disabled={criandoPendencia || !pendenciaDeptEntregaTexto.trim()}
                     >
                       <Plus className="w-4 h-4 mr-1" />
                       Abrir Pendência Departamento
                     </Button>
                   </div>

                   {/* 7.5 - Pendência de Cliente */}
                   <div className="px-4 py-3 space-y-2 border-t border-border">
                     <span className="text-sm font-medium">7.5 - Abrir Pendência Externa (Cliente)</span>
                     <Textarea
                       placeholder="Descreva a pendência do cliente..."
                       value={pendenciaClienteEntregaTexto}
                       onChange={(e) => setPendenciaClienteEntregaTexto(e.target.value)}
                       className="min-h-[60px]"
                     />
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => {
                         criarPendencia('CLIENTE_INSTALACAO', pendenciaClienteEntregaTexto);
                         setPendenciaClienteEntregaTexto('');
                       }}
                       disabled={criandoPendencia || !pendenciaClienteEntregaTexto.trim()}
                     >
                       <Plus className="w-4 h-4 mr-1" />
                       Abrir Pendência Cliente
                     </Button>
                   </div>
                 </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {!isPPE && (
            <>
          {/* Etapa 8: Operação Assistida */}
          <Card>
            <Collapsible open={expandedEtapas.includes(8)} onOpenChange={() => toggleEtapa(8)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(8) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(8) ? <Check className="w-4 h-4" /> : <HeadphonesIcon className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">8 - Operação Assistida (30 dias)</CardTitle>
                    </div>
                    {expandedEtapas.includes(8) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* Data de início e término editáveis */}
                  <div className="px-4 space-y-3">
                    <Label className="text-sm font-medium">Período da Operação Assistida</Label>
                    {!editingOpAssistidaDates ? (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Início: {etapas.operacao_assistida_inicio ? format(parseISO(etapas.operacao_assistida_inicio), "dd/MM/yyyy", { locale: ptBR }) : 'Não definido'}</span>
                        <span>Término: {etapas.operacao_assistida_fim ? format(parseISO(etapas.operacao_assistida_fim), "dd/MM/yyyy", { locale: ptBR }) : 'Não definido'}</span>
                        {canEditDates && (
                          <Button variant="ghost" size="sm" onClick={() => {
                            setTempOpAssistidaStart(etapas.operacao_assistida_inicio ? etapas.operacao_assistida_inicio.split('T')[0] : '');
                            setTempOpAssistidaEnd(etapas.operacao_assistida_fim ? etapas.operacao_assistida_fim.split('T')[0] : '');
                            setEditingOpAssistidaDates(true);
                          }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input type="date" value={tempOpAssistidaStart} onChange={(e) => setTempOpAssistidaStart(e.target.value)} className="w-40" />
                        <span className="text-sm text-muted-foreground">até</span>
                        <Input type="date" value={tempOpAssistidaEnd} onChange={(e) => setTempOpAssistidaEnd(e.target.value)} className="w-40" />
                        <Button size="sm" onClick={async () => {
                          await supabase.from('implantacao_etapas').update({
                            operacao_assistida_inicio: tempOpAssistidaStart ? new Date(tempOpAssistidaStart).toISOString() : null,
                            operacao_assistida_fim: tempOpAssistidaEnd ? new Date(tempOpAssistidaEnd).toISOString() : null,
                          }).eq('project_id', id!);
                          setEtapas(prev => prev ? {
                            ...prev,
                            operacao_assistida_inicio: tempOpAssistidaStart ? new Date(tempOpAssistidaStart).toISOString() : null,
                            operacao_assistida_fim: tempOpAssistidaEnd ? new Date(tempOpAssistidaEnd).toISOString() : null,
                          } : null);
                          setEditingOpAssistidaDates(false);
                          toast({ title: 'Datas atualizadas' });
                        }}>
                          <Check className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-4">
                    <Label className="text-sm font-medium">8.1 - Registrar interação com o cliente</Label>
                    <div className="flex gap-2 mt-2">
                      <Textarea 
                        value={novaInteracao}
                        onChange={(e) => setNovaInteracao(e.target.value)}
                        placeholder="Descreva a interação com o cliente durante o período de operação assistida..."
                        className="flex-1"
                      />
                      <Button onClick={addInteracao} disabled={isSaving || !novaInteracao.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {etapas.operacao_assistida_interacoes && etapas.operacao_assistida_interacoes.length > 0 && (
                    <div className="px-4 space-y-2">
                      <Label className="text-sm font-medium">Histórico de interações</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {etapas.operacao_assistida_interacoes.map((interacao) => (
                          <div key={interacao.id} className="bg-muted p-3 rounded-md text-sm">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>{interacao.usuario}</span>
                              <span>{format(parseISO(interacao.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            </div>
                            <p>{interacao.descricao}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Etapa 9: Concluído */}
          <Card>
            <Collapsible open={expandedEtapas.includes(9)} onOpenChange={() => toggleEtapa(9)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(9) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(9) ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">9 - Concluído</CardTitle>
                    </div>
                    {expandedEtapas.includes(9) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="px-4">
                    <Label className="text-sm font-medium">9.1 - Observações para o setor de Manutenção</Label>
                    <Textarea 
                      value={localObsManutencao}
                      onChange={(e) => setLocalObsManutencao(e.target.value)}
                      onBlur={() => {
                        if (localObsManutencao !== (etapas.observacoes_manutencao || '')) {
                          updateEtapa('observacoes_manutencao', localObsManutencao);
                        }
                      }}
                      placeholder="Registre observações, laudos ou recados importantes para o setor de Manutenção que será o próximo responsável pelo contrato..."
                      className="mt-2 min-h-[100px]"
                    />
                  </div>

                  <div className="px-4">
                    {!checklistsExistentes.includes('check_projeto') && !etapas.concluido && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          O checklist de projeto (etapa 4.1) é obrigatório e ainda não foi preenchido. Preencha antes de concluir.
                        </AlertDescription>
                      </Alert>
                    )}
                    {!secoesComAnexo.includes('implantacao_laudo_instalador') && !etapas.concluido && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          O laudo/checklist do instalador (etapa 5.1) é obrigatório. Anexe o documento antes de concluir.
                        </AlertDescription>
                      </Alert>
                    )}
                    {!secoesComAnexo.includes('implantacao_entrega_tecnica') && !etapas.concluido && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          O checklist de entrega técnica (etapa 7.3) é obrigatório. Anexe o documento antes de concluir.
                        </AlertDescription>
                      </Alert>
                    )}
                    {hasPendingItems && !etapas.concluido && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Existem pendências em aberto para este cliente. Resolva todas as pendências antes de concluir a implantação.
                        </AlertDescription>
                      </Alert>
                    )}
                    {etapas.concluido ? (
                      <SubItem 
                        label="Marcar implantação como concluída" 
                        checked={etapas.concluido} 
                        field="concluido"
                        dateField="concluido_at"
                        date={etapas.concluido_at}
                      />
                    ) : (
                      <Button
                        onClick={async () => {
                          // Validate checklists
                          if (!checklistsExistentes.includes('check_projeto')) {
                            toast({ title: 'Checklist obrigatório pendente', description: 'O checklist de projeto (etapa 4.1) é obrigatório para concluir a implantação.', variant: 'destructive' });
                            return;
                          }
                          if (!secoesComAnexo.includes('implantacao_laudo_instalador')) {
                            toast({ title: 'Upload obrigatório pendente', description: 'O laudo/checklist do instalador (etapa 5.1) é obrigatório para concluir a implantação.', variant: 'destructive' });
                            return;
                          }
                          if (!secoesComAnexo.includes('implantacao_entrega_tecnica')) {
                            toast({ title: 'Upload obrigatório pendente', description: 'O checklist de entrega técnica (etapa 7.3) é obrigatório para concluir a implantação.', variant: 'destructive' });
                            return;
                          }
                          if (hasPendingItems) {
                            toast({ title: 'Pendências em aberto', description: 'Resolva todas as pendências antes de concluir.', variant: 'destructive' });
                            return;
                          }
                          // Create chamado for Sucesso do Cliente (satisfaction survey)
                          try {
                            const { data: customerData } = await supabase
                              .from('customer_portfolio')
                              .select('id')
                              .eq('project_id', id!)
                              .maybeSingle();
                            
                            if (customerData) {
                              await supabase.from('customer_chamados').insert({
                                customer_id: customerData.id,
                                assunto: 'Pesquisa de Satisfação - Implantação',
                                descricao: `Realizar pesquisa de satisfação com o cliente ${project.cliente_condominio_nome} referente à implantação do projeto #${project.numero_projeto}. O projeto foi concluído e necessita avaliação de satisfação do cliente.`,
                                prioridade: 'media',
                                status: 'aberto',
                                created_by: user?.id,
                                created_by_name: user?.nome,
                              });
                            }
                          } catch (err) {
                            console.error('Error creating satisfaction chamado:', err);
                          }
                          setShowAIFeedbackDialog(true);
                        }}
                        className="w-full"
                        variant="default"
                        disabled={hasPendingItems || !checklistsExistentes.includes('check_projeto') || !secoesComAnexo.includes('implantacao_laudo_instalador') || !secoesComAnexo.includes('implantacao_entrega_tecnica')}
                      >
                        Concluir Implantação (com avaliação)
                      </Button>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
            </>
          )}
        </div>
      </div>

      {/* AI Feedback Dialog for Implantação completion */}
      {user && id && (
        <AIFeedbackDialog
          open={showAIFeedbackDialog}
          onOpenChange={setShowAIFeedbackDialog}
          projectId={id}
          userId={user.id}
          userName={user.nome}
          type="implantacao"
          onSubmitted={() => {
            updateEtapa('concluido', true, 'concluido_at');
          }}
        />
      )}

      {project && (
        <EquipmentListDialog
          open={showEquipmentList}
          onOpenChange={setShowEquipmentList}
          projectId={project.id}
          projectName={project.cliente_condominio_nome}
          engineeringStatus={project.engineering_status}
        />
      )}
      {/* Checklist Dialog for 6.2 */}
      <Dialog open={checklistDialogOpen} onOpenChange={setChecklistDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Check e Laudo de Programação (NOC)
            </DialogTitle>
          </DialogHeader>
          {checklistDialogLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : checklistDialogData ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {checklistDialogData.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-2 px-3 rounded-md bg-muted/30">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      item.checked ? "bg-primary text-primary-foreground" : "bg-muted border border-border"
                    )}>
                      {item.checked && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-sm", item.checked ? "text-foreground" : "text-muted-foreground")}>
                        {item.label}
                      </span>
                      {item.observacao && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{item.observacao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {checklistDialogData.observacoes && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Observações Gerais</p>
                  <p className="text-sm">{checklistDialogData.observacoes}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                <span>{checklistDialogData.items.filter(i => i.checked).length}/{checklistDialogData.items.length} itens concluídos</span>
                <span className={cn(
                  "font-medium",
                  checklistDialogData.items.every(i => i.checked) ? "text-primary" : "text-amber-600"
                )}>
                  {checklistDialogData.items.every(i => i.checked) ? '✓ Completo' : 'Pendente'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum checklist registrado ainda.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
