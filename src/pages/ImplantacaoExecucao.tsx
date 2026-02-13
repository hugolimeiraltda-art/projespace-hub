import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SaleFormSummary } from '@/components/SaleFormSummary';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
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
  Wrench,
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
} from 'lucide-react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import jsPDF from 'jspdf';
import { EquipmentListDialog } from '@/components/EquipmentListDialog';

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
  etapa_atual: number;
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
}

interface ContratoInfo {
  contrato: string;
  alarme_codigo: string;
  mensalidade: string;
  prazo_contrato: string;
  taxa_instalacao: string;
}

export default function ImplantacaoExecucao() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [etapas, setEtapas] = useState<ImplantacaoEtapas | null>(null);
  const [tapForm, setTapForm] = useState<Record<string, unknown> | null>(null);
  const [saleForm, setSaleForm] = useState<SaleCompletedForm | null>(null);
  const [projectComments, setProjectComments] = useState<Array<{ user_name: string; content: string; created_at: string; is_internal: boolean }>>([]);
  const [projectAttachments, setProjectAttachments] = useState<Array<{ nome_arquivo: string; tipo: string; arquivo_url?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEtapas, setExpandedEtapas] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [novaInteracao, setNovaInteracao] = useState('');
  const [editingDates, setEditingDates] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [selectedNota, setSelectedNota] = useState<number | null>(null);
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo>({ contrato: '', alarme_codigo: '', mensalidade: '', prazo_contrato: '', taxa_instalacao: '' });
  const [editingContrato, setEditingContrato] = useState(false);
  const [showAIFeedbackDialog, setShowAIFeedbackDialog] = useState(false);
  const [showEquipmentList, setShowEquipmentList] = useState(false);

  const canEditDates = user?.role === 'admin' || user?.role === 'administrativo' || user?.role === 'implantacao';

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
        .select('id, numero_projeto, cliente_condominio_nome, cliente_cidade, cliente_estado, vendedor_nome, created_at, prazo_entrega_projeto, implantacao_started_at')
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

      setEtapas({
        ...etapasData,
        operacao_assistida_interacoes: parsedInteracoes
      } as ImplantacaoEtapas);

      // Fetch customer_portfolio data for contract info
      const { data: portfolioData } = await supabase
        .from('customer_portfolio')
        .select('contrato, alarme_codigo, mensalidade, taxa_ativacao, data_termino')
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
        });
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

      const { error } = await supabase
        .from('implantacao_etapas')
        .update({ 
          operacao_assistida_interacoes: JSON.parse(JSON.stringify(updatedInteracoes)),
          operacao_assistida_inicio: etapas.operacao_assistida_inicio || new Date().toISOString(),
          operacao_assistida_fim: addDays(new Date(), 30).toISOString()
        })
        .eq('project_id', id);

      if (error) throw error;

      setEtapas(prev => prev ? { 
        ...prev, 
        operacao_assistida_interacoes: updatedInteracoes,
        operacao_assistida_inicio: prev.operacao_assistida_inicio || new Date().toISOString(),
        operacao_assistida_fim: addDays(new Date(), 30).toISOString()
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
      { title: '5.1 Laudo Instalador', completed: etapas.laudo_instalador, date: etapas.laudo_instalador_at },
      { title: '5.2 Laudo Vidraceiro', completed: etapas.laudo_vidraceiro, date: etapas.laudo_vidraceiro_at },
      { title: '5.3 Laudo Serralheiro', completed: etapas.laudo_serralheiro, date: etapas.laudo_serralheiro_at },
      { title: '5.4 Laudo Conclusão Supervisor', completed: etapas.laudo_conclusao_supervisor, date: etapas.laudo_conclusao_supervisor_at },
      { title: '6.1 Check de Programação', completed: etapas.check_programacao, date: etapas.check_programacao_at },
      { title: '6.2 Confirmação Ativação Financeira', completed: etapas.confirmacao_ativacao_financeira, date: etapas.confirmacao_ativacao_financeira_at },
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
      5: Wrench,
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
    
    switch (etapaNum) {
      case 1: return etapas.contrato_assinado;
      case 2: return etapas.contrato_cadastrado;
      case 3: return etapas.ligacao_boas_vindas && etapas.cadastro_gear && etapas.sindico_app && etapas.conferencia_tags;
      case 4: return etapas.check_projeto && etapas.agendamento_visita_startup && etapas.laudo_visita_startup;
      case 5: return etapas.laudo_instalador && etapas.laudo_vidraceiro && etapas.laudo_serralheiro && etapas.laudo_conclusao_supervisor;
      case 6: return etapas.check_programacao && etapas.confirmacao_ativacao_financeira;
      case 7: return etapas.agendamento_visita_comercial && etapas.laudo_visita_comercial;
      case 8: return (etapas.operacao_assistida_interacoes?.length || 0) > 0;
      case 9: return etapas.concluido;
      case 10: return etapas.pesquisa_satisfacao_realizada;
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

  const SubItem = ({ 
    label, 
    checked, 
    field, 
    dateField,
    date,
    hasChecklist,
    checklistType
  }: { 
    label: string; 
    checked: boolean; 
    field: keyof ImplantacaoEtapas;
    dateField?: string;
    date?: string | null;
    hasChecklist?: boolean;
    checklistType?: string;
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
            onClick={() => navigate(`/startup-projetos/${id}/checklist/${checklistType}`)}
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
                onClick={() => navigate(`/projetos/${id}/form2`)}
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
                                
                                // Calculate data_termino from prazo_contrato
                                const prazoMeses = parseInt(contratoInfo.prazo_contrato) || 12;
                                const dataTermino = new Date();
                                dataTermino.setMonth(dataTermino.getMonth() + prazoMeses);
                                
                                const portfolioPayload = {
                                  contrato: contratoInfo.contrato.trim(),
                                  alarme_codigo: contratoInfo.alarme_codigo.trim(),
                                  mensalidade: parseFloat(contratoInfo.mensalidade.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                                  taxa_ativacao: parseFloat(contratoInfo.taxa_instalacao.replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                                  data_termino: dataTermino.toISOString().split('T')[0],
                                };

                                // Check if customer_portfolio exists for this project
                                const { data: existing } = await supabase
                                  .from('customer_portfolio')
                                  .select('id')
                                  .eq('project_id', id)
                                  .maybeSingle();

                                if (existing) {
                                  const { error: updateError } = await supabase
                                    .from('customer_portfolio')
                                    .update(portfolioPayload)
                                    .eq('id', existing.id);
                                  if (updateError) throw updateError;
                                } else {
                                  // Create new customer_portfolio entry
                                  const { error: insertError } = await supabase
                                    .from('customer_portfolio')
                                    .insert({
                                      ...portfolioPayload,
                                      project_id: id,
                                      razao_social: project?.cliente_condominio_nome || '',
                                      endereco: project?.cliente_cidade && project?.cliente_estado 
                                        ? `${project.cliente_cidade}, ${project.cliente_estado}` 
                                        : null,
                                      status_implantacao: 'EM_IMPLANTACAO',
                                    });
                                  if (insertError) throw insertError;
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
                                  description: 'Não foi possível salvar.',
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
                    </div>
                  </div>
                  
                  <SubItem 
                    label="Contrato cadastrado no sistema" 
                    checked={etapas.contrato_cadastrado} 
                    field="contrato_cadastrado"
                    dateField="contrato_cadastrado_at"
                    date={etapas.contrato_cadastrado_at}
                  />
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
                      <CardTitle className="text-base">4 - Visita de Implantação</CardTitle>
                    </div>
                    {expandedEtapas.includes(4) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-1">
                  <SubItem 
                    label="4.1 - Check de projeto" 
                    checked={etapas.check_projeto} 
                    field="check_projeto"
                    dateField="check_projeto_at"
                    date={etapas.check_projeto_at}
                    hasChecklist
                    checklistType="check_projeto"
                  />
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
                  <SubItem 
                    label="4.3 - Laudo e check-list de visita" 
                    checked={etapas.laudo_visita_startup} 
                    field="laudo_visita_startup"
                    dateField="laudo_visita_startup_at"
                    date={etapas.laudo_visita_startup_at}
                    hasChecklist
                    checklistType="laudo_visita_startup"
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Etapa 5: Execução da Obra */}
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
                        {isEtapaComplete(5) ? <Check className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">5 - Execução da Obra</CardTitle>
                    </div>
                    {expandedEtapas.includes(5) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-1">
                  <SubItem 
                    label="5.1 - Laudo e Check-list do Instalador" 
                    checked={etapas.laudo_instalador} 
                    field="laudo_instalador"
                    dateField="laudo_instalador_at"
                    date={etapas.laudo_instalador_at}
                    hasChecklist
                    checklistType="laudo_instalador"
                  />
                  <SubItem 
                    label="5.2 - Laudo e Check-list do Vidraceiro" 
                    checked={etapas.laudo_vidraceiro} 
                    field="laudo_vidraceiro"
                    dateField="laudo_vidraceiro_at"
                    date={etapas.laudo_vidraceiro_at}
                    hasChecklist
                    checklistType="laudo_vidraceiro"
                  />
                  <SubItem 
                    label="5.3 - Laudo e Check-list do Serralheiro" 
                    checked={etapas.laudo_serralheiro} 
                    field="laudo_serralheiro"
                    dateField="laudo_serralheiro_at"
                    date={etapas.laudo_serralheiro_at}
                    hasChecklist
                    checklistType="laudo_serralheiro"
                  />
                  <SubItem 
                    label="5.4 - Laudo e Check-list de Conclusão do Supervisor" 
                    checked={etapas.laudo_conclusao_supervisor} 
                    field="laudo_conclusao_supervisor"
                    dateField="laudo_conclusao_supervisor_at"
                    date={etapas.laudo_conclusao_supervisor_at}
                    hasChecklist
                    checklistType="laudo_conclusao"
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

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
                <CardContent className="pt-0 space-y-1">
                  <SubItem 
                    label="6.1 - Check e laudo de programação" 
                    checked={etapas.check_programacao} 
                    field="check_programacao"
                    dateField="check_programacao_at"
                    date={etapas.check_programacao_at}
                    hasChecklist
                    checklistType="check_programacao"
                  />
                  <SubItem 
                    label="6.2 - Confirmação de ativação do Financeiro" 
                    checked={etapas.confirmacao_ativacao_financeira} 
                    field="confirmacao_ativacao_financeira"
                    dateField="confirmacao_ativacao_financeira_at"
                    date={etapas.confirmacao_ativacao_financeira_at}
                  />
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

          {/* Etapa 7: Entrega Comercial */}
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
                      <CardTitle className="text-base">7 - Entrega Comercial</CardTitle>
                    </div>
                    {expandedEtapas.includes(7) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-1">
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
                    <Label className="text-sm text-muted-foreground">Observações da visita comercial</Label>
                    <Textarea 
                      value={etapas.laudo_visita_comercial_texto || ''}
                      onChange={(e) => updateEtapa('laudo_visita_comercial_texto', e.target.value)}
                      placeholder="Descreva observações sobre a visita comercial..."
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

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
                  {etapas.operacao_assistida_inicio && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground px-4">
                      <span>Início: {format(parseISO(etapas.operacao_assistida_inicio), "dd/MM/yyyy", { locale: ptBR })}</span>
                      {etapas.operacao_assistida_fim && (
                        <span>Término previsto: {format(parseISO(etapas.operacao_assistida_fim), "dd/MM/yyyy", { locale: ptBR })}</span>
                      )}
                    </div>
                  )}
                  
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
                      value={etapas.observacoes_manutencao || ''}
                      onChange={(e) => updateEtapa('observacoes_manutencao', e.target.value)}
                      placeholder="Registre observações, laudos ou recados importantes para o setor de Manutenção que será o próximo responsável pelo contrato..."
                      className="mt-2 min-h-[100px]"
                    />
                  </div>

                  <div className="px-4">
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
                        onClick={() => setShowAIFeedbackDialog(true)}
                        className="w-full"
                        variant="default"
                      >
                        Concluir Implantação (com avaliação)
                      </Button>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Etapa 10: Pesquisa de Satisfação */}
          <Card>
            <Collapsible open={expandedEtapas.includes(10)} onOpenChange={() => toggleEtapa(10)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isEtapaComplete(10) ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isEtapaComplete(10) ? <Check className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                      </div>
                      <CardTitle className="text-base">10 - Pesquisa de Satisfação com a Implantação</CardTitle>
                    </div>
                    {expandedEtapas.includes(10) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  <div className="px-4">
                    <Label className="text-sm font-medium">10.1 - Nota de Satisfação (1-10)</Label>
                    <p className="text-sm text-muted-foreground mb-2">De 1 a 10, qual a nota para o processo de implantação?</p>
                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <Button
                          key={n}
                          variant={(etapas.pesquisa_satisfacao_nota === n || selectedNota === n) ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "w-10 h-10",
                            n <= 6 && (etapas.pesquisa_satisfacao_nota === n || selectedNota === n) && "bg-red-500 hover:bg-red-600",
                            n >= 7 && n <= 8 && (etapas.pesquisa_satisfacao_nota === n || selectedNota === n) && "bg-amber-500 hover:bg-amber-600",
                            n >= 9 && (etapas.pesquisa_satisfacao_nota === n || selectedNota === n) && "bg-green-500 hover:bg-green-600"
                          )}
                          onClick={() => {
                            setSelectedNota(n);
                            updateEtapa('pesquisa_satisfacao_nota', n);
                          }}
                          disabled={isSaving}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="px-4">
                    <Label className="text-sm font-medium">10.2 - O cliente recomendaria nossos serviços?</Label>
                    <div className="flex gap-4 mt-2">
                      <Button
                        variant={etapas.pesquisa_satisfacao_recomendaria === true ? 'default' : 'outline'}
                        onClick={() => updateEtapa('pesquisa_satisfacao_recomendaria', true)}
                        disabled={isSaving}
                        className={cn(etapas.pesquisa_satisfacao_recomendaria === true && "bg-green-500 hover:bg-green-600")}
                      >
                        Sim
                      </Button>
                      <Button
                        variant={etapas.pesquisa_satisfacao_recomendaria === false ? 'default' : 'outline'}
                        onClick={() => updateEtapa('pesquisa_satisfacao_recomendaria', false)}
                        disabled={isSaving}
                        className={cn(etapas.pesquisa_satisfacao_recomendaria === false && "bg-red-500 hover:bg-red-600")}
                      >
                        Não
                      </Button>
                    </div>
                  </div>

                  <div className="px-4">
                    <Label className="text-sm font-medium">10.3 - Pontos Positivos</Label>
                    <Textarea 
                      value={etapas.pesquisa_satisfacao_pontos_positivos || ''}
                      onChange={(e) => updateEtapa('pesquisa_satisfacao_pontos_positivos', e.target.value)}
                      placeholder="O que o cliente destacou como pontos positivos da implantação?"
                      className="mt-2"
                    />
                  </div>

                  <div className="px-4">
                    <Label className="text-sm font-medium">10.4 - Pontos de Melhoria</Label>
                    <Textarea 
                      value={etapas.pesquisa_satisfacao_pontos_negativos || ''}
                      onChange={(e) => updateEtapa('pesquisa_satisfacao_pontos_negativos', e.target.value)}
                      placeholder="O que o cliente apontou como pontos que podem melhorar?"
                      className="mt-2"
                    />
                  </div>

                  <div className="px-4">
                    <Label className="text-sm font-medium">10.5 - Comentário Geral</Label>
                    <Textarea 
                      value={etapas.pesquisa_satisfacao_comentario || ''}
                      onChange={(e) => updateEtapa('pesquisa_satisfacao_comentario', e.target.value)}
                      placeholder="Comentários adicionais do cliente sobre a implantação..."
                      className="mt-2"
                    />
                  </div>

                  <div className="px-4 pt-2">
                    <SubItem 
                      label="Marcar pesquisa de satisfação como realizada" 
                      checked={etapas.pesquisa_satisfacao_realizada} 
                      field="pesquisa_satisfacao_realizada"
                      dateField="pesquisa_satisfacao_realizada_at"
                      date={etapas.pesquisa_satisfacao_realizada_at}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
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
        />
      )}
    </Layout>
  );
}
